import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  zipCode: varchar("zip_code"),
  bio: text("bio"),
  // The Podchaser creator id the user has confirmed is themself — powers
  // "what shows have I been on" using the same appearance-history lookup
  // already used to research OTHER people as guest prospects.
  podchaserPersonId: varchar("podchaser_person_id"),
  role: varchar("role").default("user"), // user, admin, superadmin
  isActive: varchar("is_active").default("true"), // true, false - for account suspension
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
