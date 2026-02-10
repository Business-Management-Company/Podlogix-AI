import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  await ensureSuperadminPassword();

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
