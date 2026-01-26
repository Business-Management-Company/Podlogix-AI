import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const identityAssets = pgTable("identity_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("voice_identity"), // voice_identity or face_identity
  voiceHash: text("voice_hash"), // Hash of the voice recording
  certStatus: text("cert_status").notNull().default("pending"), // pending, minting, minted, failed
  certTxHash: text("cert_tx_hash"), // Polygon transaction hash
  certTokenId: text("cert_token_id"), // NFT token ID
  certExplorerUrl: text("cert_explorer_url"), // Polygonscan URL
  createdAt: timestamp("created_at").defaultNow(),
  mintedAt: timestamp("minted_at"),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).pick({
  email: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  name: true,
  email: true,
  message: true,
});

export const insertIdentityAssetSchema = createInsertSchema(identityAssets).pick({
  email: true,
  name: true,
  type: true,
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type IdentityAsset = typeof identityAssets.$inferSelect;
export type InsertIdentityAsset = z.infer<typeof insertIdentityAssetSchema>;
