import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { z } from "zod";
import { db } from "../../db";
import { adminDevDocuments, loginCodes } from "@shared/schema";
import { eq, and, gte, desc, isNull, sql as dsql } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";

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
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

const SUPERADMIN_EMAIL = "andrew@podlogix.co";

// Auth is passwordless (email codes + OAuth) — this only guarantees the
// superadmin account exists and holds the superadmin role.
async function ensureSuperadminAccount() {
  try {
    let superadmin = await authStorage.getUserByEmail(SUPERADMIN_EMAIL);

    // Legacy: migrate from old .io address if needed
    if (!superadmin) {
      const legacy = await authStorage.getUserByEmail("andrew@podlogix.io");
      if (legacy) {
        superadmin = legacy;
        console.log("[Auth] Found legacy superadmin at .io address");
      }
    }

    if (superadmin) {
      if (superadmin.role !== "superadmin") {
        await authStorage.updateUserRole(superadmin.id, "superadmin");
        console.log("[Auth] Restored superadmin role");
      }
    } else {
      const created = await authStorage.createUserWithEmail({
        email: SUPERADMIN_EMAIL,
        firstName: "Andrew",
        lastName: "Appleton",
      });
      await authStorage.updateUserRole(created.id, "superadmin");
      console.log("[Auth] Created superadmin account for", SUPERADMIN_EMAIL);
    }
  } catch (err) {
    console.error("[Auth] Failed to ensure superadmin account:", err);
  }
}

async function seedBuildPlanDocument() {
  try {
    const existing = await db.select().from(adminDevDocuments);
    const hasBuildPlan = existing.some((d: { title: string | null }) => d.title?.includes("BUILD PLAN"));
    if (hasBuildPlan) return;

    const superadmin = await authStorage.getUserByEmail(SUPERADMIN_EMAIL)
      ?? await authStorage.getUserByEmail("andrew@podlogix.io");
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

  await ensureSuperadminAccount();
  await seedBuildPlanDocument();

  // ── Passwordless email sign-in ─────────────────────────────────────────────
  // One flow for login AND account creation: enter email → receive a 6-digit
  // code → verify. OAuth (Google) bypasses the code entirely. Passwords are
  // gone — the old /signup, /login, /forgot-password, /reset-password
  // endpoints were removed with them.

  const CODE_TTL_MS = 10 * 60 * 1000; // codes live 10 minutes
  const CODE_RATE_WINDOW_MS = 15 * 60 * 1000;
  const CODE_RATE_MAX = 5; // max codes per email per window
  const CODE_MAX_ATTEMPTS = 5; // wrong guesses before the code is dead

  const hashLoginCode = (code: string) =>
    crypto.createHash("sha256").update(code).digest("hex");

  const publicUser = (user: any) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    phone: user.phone,
    zipCode: user.zipCode,
    bio: user.bio,
    podchaserPersonId: user.podchaserPersonId,
    role: user.role,
  });

  async function sendLoginCodeEmail(to: string, code: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== "production") {
        // Dev fallback: print the code to server logs
        console.log(`[Auth] Login code for ${to}: ${code}`);
        return true;
      }
      console.error("[Auth] RESEND_API_KEY not set — cannot send login codes");
      return false;
    }
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Podlogix <no-reply@podlogix.io>",
        to,
        subject: `${code} is your Podlogix sign-in code`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
            <img src="https://podlogix.io/favicon.ico" width="40" style="margin-bottom:16px;border-radius:8px;" />
            <h2 style="margin:0 0 8px;color:#111;font-size:22px;">Your sign-in code</h2>
            <p style="color:#555;margin:0 0 24px;">Enter this code to sign in to Podlogix. It expires in 10 minutes.</p>
            <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#111;background:#f4f4f5;border-radius:8px;padding:16px 24px;text-align:center;">${code}</div>
            <p style="color:#999;font-size:12px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email — no one can sign in without the code.</p>
          </div>
        `,
        text: `Your Podlogix sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
      });
      return true;
    } catch (err) {
      console.error("[Auth] Failed to send login code email:", err);
      return false;
    }
  }

  app.post("/api/auth/request-code", async (req, res) => {
    try {
      const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      const email = parsed.data.email.toLowerCase().trim();

      const windowStart = new Date(Date.now() - CODE_RATE_WINDOW_MS);
      const [{ count }] = (
        await db
          .select({ count: dsql<number>`count(*)::int` })
          .from(loginCodes)
          .where(and(eq(loginCodes.email, email), gte(loginCodes.createdAt, windowStart)))
      ) as any[];
      if (count >= CODE_RATE_MAX) {
        return res.status(429).json({ message: "Too many codes requested. Please wait a few minutes and try again." });
      }

      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      await db.insert(loginCodes).values({
        email,
        codeHash: hashLoginCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      });

      const sent = await sendLoginCodeEmail(email, code);
      if (!sent) {
        return res.status(500).json({ message: "Couldn't send the code. Please try again." });
      }

      const user = await authStorage.getUserByEmail(email);
      res.json({ message: "Code sent", isNewUser: !user });
    } catch (error) {
      console.error("Request code error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const parsed = z
        .object({
          email: z.string().email(),
          code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
          firstName: z.string().trim().min(1).max(80).optional(),
          lastName: z.string().trim().min(1).max(80).optional(),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }
      const email = parsed.data.email.toLowerCase().trim();
      const { code, firstName, lastName } = parsed.data;

      const [row] = await db
        .select()
        .from(loginCodes)
        .where(
          and(
            eq(loginCodes.email, email),
            isNull(loginCodes.consumedAt),
            gte(loginCodes.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(loginCodes.createdAt))
        .limit(1);

      if (!row) {
        return res.status(400).json({ message: "That code has expired. Request a new one." });
      }
      if (row.attempts >= CODE_MAX_ATTEMPTS) {
        return res.status(429).json({ message: "Too many incorrect attempts. Request a new code." });
      }
      if (row.codeHash !== hashLoginCode(code)) {
        await db
          .update(loginCodes)
          .set({ attempts: row.attempts + 1 })
          .where(eq(loginCodes.id, row.id));
        return res.status(401).json({ message: "Incorrect code. Please check and try again." });
      }

      await db.update(loginCodes).set({ consumedAt: new Date() }).where(eq(loginCodes.id, row.id));

      let user = await authStorage.getUserByEmail(email);
      if (user) {
        if (user.isActive === "false") {
          return res.status(403).json({ message: "Your account has been suspended" });
        }
      } else {
        user = await authStorage.createUserWithEmail({ email, firstName, lastName });
      }

      req.session.userId = user.id;
      res.json(publicUser(user));
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
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
        phone: user.phone,
        zipCode: user.zipCode,
        bio: user.bio,
        podchaserPersonId: user.podchaserPersonId,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ── Google OAuth ─────────────────────────────────────────────────────────
  app.get("/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).send("Google Sign-In is not configured");
    }
    const appUrl = process.env.APP_URL || "https://podlogix.io";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${appUrl}/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/auth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query as Record<string, string>;
      if (error || !code) {
        return res.redirect("/login?error=google_denied");
      }
      const appUrl = process.env.APP_URL || "https://podlogix.io";
      const callbackUrl = `${appUrl}/auth/google/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        console.error("[Auth] Google token exchange failed:", await tokenRes.text());
        return res.redirect("/login?error=google_failed");
      }

      const tokens = await tokenRes.json() as { access_token: string };

      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoRes.ok) {
        return res.redirect("/login?error=google_failed");
      }

      const googleUser = await userInfoRes.json() as {
        email: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };

      let user = await authStorage.getUserByEmail(googleUser.email);
      if (!user) {
        user = await authStorage.upsertUser({
          email: googleUser.email,
          firstName: googleUser.given_name ?? "",
          lastName: googleUser.family_name ?? "",
          profileImageUrl: googleUser.picture,
        });
      } else if (!user.profileImageUrl && googleUser.picture) {
        await authStorage.updateUserProfile(user.id, { profileImageUrl: googleUser.picture });
      }

      req.session.userId = user.id;
      res.redirect("/dashboard");
    } catch (err) {
      console.error("[Auth] Google OAuth error:", err);
      res.redirect("/login?error=google_failed");
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

// Allowlist for early-access features being tested by a single account before wider rollout.
const BETA_TESTER_EMAILS = new Set(["andrew@podlogix.co"]);

export const isBetaTester: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = (req as any).dbUser || await authStorage.getUser(userId);
    if (!dbUser?.email || !BETA_TESTER_EMAILS.has(dbUser.email)) {
      return res.status(403).json({ message: "Forbidden: Beta access required" });
    }
    (req as any).dbUser = dbUser;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking beta access" });
  }
};
