import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db";
import { adminDevDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

async function ensureSuperadminPassword() {
  try {
    const superadmin = await authStorage.getUserByEmail("andrew@podlogix.co");
    if (superadmin) {
      if (!superadmin.passwordHash) {
        const hash = await bcrypt.hash("podlogix2024", 10);
        await authStorage.setPassword(superadmin.id, hash);
        console.log("[Auth] Set temporary password for superadmin account");
      }
      if (superadmin.role !== "superadmin") {
        await authStorage.updateUserRole(superadmin.id, "superadmin");
        console.log("[Auth] Restored superadmin role for andrew@podlogix.co");
      }
    }
  } catch (err) {
    console.error("[Auth] Failed to ensure superadmin password:", err);
  }
}

async function seedBuildPlanDocument() {
  try {
    const existing = await db.select().from(adminDevDocuments);
    const hasBuildPlan = existing.some(d => d.title?.includes("BUILD PLAN"));
    if (hasBuildPlan) return;

    const superadmin = await authStorage.getUserByEmail("andrew@podlogix.co");
    if (!superadmin) return;

    await db.insert(adminDevDocuments).values({
      title: "PODLOGIX — BUILD PLAN (Detailed Action Items)",
      category: "architecture",
      createdByUserId: superadmin.id,
      content: `# PODLOGIX — BUILD PLAN (DETAILED ACTION ITEMS)

**Target: Beta by early March**

---

## PHASE 1 — Hosting & Syndication (Week 1–2)

### Objective
PodLogix can host podcasts and distribute them via RSS.

### Deliverables
- Podcast hosting system
- RSS import + export
- Spotify + Apple distribution working

### Developer Checklist

**Database**
- podcasts table
- episodes table
- rss_feeds table
- distribution_accounts table

**RSS Hosting**
- Generate RSS feed per podcast
- Validate RSS against Apple spec
- Episode upload flow
- Audio file storage (R2 / S3)

**RSS Import (Migration)**
- Import RSS feed URL
- Parse existing episodes
- Copy media files
- Preserve metadata
- Verify feed ownership flow

**Distribution**
- Spotify RSS submission workflow
- Apple Podcasts RSS submission workflow
- YouTube podcast support (optional beta)

### Definition of Done
A podcast can:
- import RSS
- upload episode
- generate RSS
- submit to Spotify

---

## PHASE 2 — AI Studio MVP (Week 3–5)

### Objective
Record, Edit, Export inside PodLogix.

### Deliverables
- Recording workflow
- AI editing pass
- Clip generator

### Developer Checklist

**Recording**

Option A (fastest):
- Zoom integration
- Pull recordings via API

Option B (later):
- WebRTC recording studio

**Media Pipeline**
- Upload video/audio
- Transcription service
- Speaker detection
- Timeline generation

**AI Editing**
- Remove filler words
- Silence trimming
- Speaker labeling
- Lower-third metadata support

**Clips**
- Clip suggestion detection
- Export vertical clips
- Caption overlay

### Definition of Done
User can:
- upload recording
- auto-generate transcript
- export edited episode
- export clip

---

## PHASE 3 — Distribution & Ads (Week 6–7)

### Objective
Monetization infrastructure.

### Deliverables
- Ad insertion workflow
- Advertiser dashboard (basic)
- Social distribution

### Developer Checklist

**Social Distribution**
- Post clip to social API
- Scheduler
- Upload queue

**Ad System (MVP)**
- ad_campaigns table
- ad_reads table
- ad_audio_assets table
- episode_ad_mapping table

**Ad Insertion**
- Insert audio into timeline
- Render episode with ad
- CPM tracking model

**Advertiser Dashboard**
- impressions
- podcasts running ads
- campaign status

### Definition of Done
- Ad can be inserted into episode
- Episode exported with ad
- Advertiser sees metrics

---

## PHASE 4 — First-Person Data + Bio Page (Week 8–9)

### Objective
Creator identity + analytics layer. This becomes a major differentiator.

### Deliverables
- Creator bio page
- Smart pixel
- Email capture

### Developer Checklist

**Bio Page Builder**
- creator_profiles table
- public profile route
- social links module
- podcast embed module

**Creator Pixel**
- pixel script generator
- event tracking endpoint
- visitor session tracking

**First-Party Data**
- email capture widget
- subscriber table
- consent tracking

### Definition of Done
- Creator has public profile
- Pixel records visits
- Emails captured

---

## PHASE 5 — AI Agent + Dashboard (Week 10+)

### Objective
AI co-pilot for podcasters. This is PodLogix's long-term moat.

### Deliverables
- AI assistant
- podcast insights dashboard
- guest booking automation

### Developer Checklist

**AI Agent**
- agent orchestration layer
- prompt templates
- conversation history storage

**Guest Booking Automation**
- email generator
- guest intake form
- research agent workflow
- contact enrichment API

**Podcast Dashboard**
- downloads aggregation
- listener analytics
- episode performance metrics
- ad revenue metrics

### Definition of Done
User can:
- ask AI to invite guest
- AI sends email draft
- AI generates episode outline
- dashboard shows performance

---

## RECOMMENDED BUILD ORDER

**Priority stack:**
1. Hosting + RSS
2. Upload + transcription pipeline
3. AI editing
4. Clip generation
5. Bio page + pixel
6. Ads
7. AI agent

> Infrastructure first. AI agent last.

---

## TEAM ROLES (SUGGESTED)

- **You:** Product owner / roadmap
- **Lead dev:** Architecture + APIs
- **Dev #2:** UI + dashboard + flows
- **Claude/Cursor:** Code acceleration

---

## BETA DEFINITION

Your beta should allow:
- host podcast
- upload episode
- auto-transcribe
- basic AI edit
- export episode
- simple creator profile

**That's enough for 10-25 beta users.**`,
    });
    console.log("[Seed] Created build plan document");
  } catch (err) {
    console.error("[Seed] Failed to seed build plan document:", err);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  await ensureSuperadminPassword();
  await seedBuildPlanDocument();

  const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", details: parsed.error.format() });
      }

      const { email, password, firstName, lastName } = parsed.data;

      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        if (existingUser.passwordHash) {
          return res.status(409).json({ message: "An account with this email already exists. Please log in." });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const updatedUser = await authStorage.setPassword(existingUser.id, passwordHash);
        req.session.userId = existingUser.id;
        return res.json({
          id: updatedUser!.id,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          profileImageUrl: updatedUser!.profileImageUrl,
          role: updatedUser!.role,
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await authStorage.createUserWithPassword({
        email,
        passwordHash,
        firstName,
        lastName,
      });

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const { email, password } = parsed.data;

      const user = await authStorage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.isActive === "false") {
        return res.status(403).json({ message: "Your account has been suspended" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await authStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).dbUser = user;
  return next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = (req as any).dbUser || await authStorage.getUser(userId);
    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "superadmin")) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    (req as any).dbUser = dbUser;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking admin status" });
  }
};

export const isSuperAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = (req as any).dbUser || await authStorage.getUser(userId);
    if (!dbUser || dbUser.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Super Admin access required" });
    }
    (req as any).dbUser = dbUser;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking admin status" });
  }
};
