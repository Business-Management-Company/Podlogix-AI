import { pgTable, text, serial, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
export { serial };
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Re-export auth models
export * from "./models/auth";

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
  type: text("type").notNull().default("voice_identity"), // voice_identity or likeness_identity
  voiceHash: text("voice_hash"), // Hash of the voice recording
  likenessImages: text("likeness_images").array(), // Array of object storage paths for likeness images
  likenessHash: text("likeness_hash"), // Hash of combined likeness images
  certStatus: text("cert_status").notNull().default("pending"), // pending, minting, minted, failed
  certTxHash: text("cert_tx_hash"), // Polygon transaction hash
  certTokenId: text("cert_token_id"), // NFT token ID
  certExplorerUrl: text("cert_explorer_url"), // Polygonscan URL
  youtubeChannel: text("youtube_channel"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  tiktokHandle: text("tiktok_handle"),
  linkedinUrl: text("linkedin_url"),
  spotifyUrl: text("spotify_url"),
  monitorChannels: boolean("monitor_channels").default(true),
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
}).extend({
  socialChannels: z.object({
    youtube: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    linkedin: z.string().optional(),
    spotify: z.string().optional(),
  }).optional(),
  monitorChannels: z.boolean().optional(),
  likenessImages: z.array(z.string()).optional(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type IdentityAsset = typeof identityAssets.$inferSelect;
export type InsertIdentityAsset = z.infer<typeof insertIdentityAssetSchema>;

// Podcaster Profiles (public Linktree-style pages)
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  slug: varchar("slug").notNull().unique(), // URL-friendly identifier
  displayName: varchar("display_name").notNull(),
  headline: text("headline"),
  bio: text("bio"),
  heroImageUrl: text("hero_image_url"),
  avatarUrl: text("avatar_url"),
  theme: varchar("theme").default("default"), // default, dark, vibrant, etc.
  accentColor: varchar("accent_color").default("#6366f1"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profile Links (items on the profile page)
export const profileLinks = pgTable("profile_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  title: varchar("title").notNull(),
  url: text("url").notNull(),
  icon: varchar("icon"), // lucide icon name or custom
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Podcasts
export const podcasts = pgTable("podcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  artworkUrl: text("artwork_url"),
  language: varchar("language").default("en"),
  category: varchar("category"),
  isExplicit: boolean("is_explicit").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RSS Feeds
export const rssFeeds = pgTable("rss_feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  podcastId: varchar("podcast_id").notNull(),
  feedUrl: text("feed_url").notNull(),
  sourceType: varchar("source_type").notNull().default("existing"), // existing | podlogix
  status: varchar("status").notNull().default("pending"), // pending, validated, invalid, active
  lastValidatedAt: timestamp("last_validated_at"),
  episodeCount: integer("episode_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Distribution Channels (catalog of available platforms)
export const distributionChannels = pgTable("distribution_channels", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  icon: varchar("icon"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

// Channel Submissions (per podcast distribution status)
export const channelSubmissions = pgTable("channel_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  podcastId: varchar("podcast_id").notNull(),
  channelId: varchar("channel_id").notNull(),
  status: varchar("status").notNull().default("not_submitted"), // not_submitted, pending, submitted, approved, rejected
  externalUrl: text("external_url"), // URL on the platform once approved
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  errorMessage: text("error_message"),
});

// Insert schemas
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfileLinkSchema = createInsertSchema(profileLinks).omit({
  id: true,
  createdAt: true,
  clickCount: true,
});

export const insertPodcastSchema = createInsertSchema(podcasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRssFeedSchema = createInsertSchema(rssFeeds).omit({
  id: true,
  createdAt: true,
  lastValidatedAt: true,
});

export const insertChannelSubmissionSchema = createInsertSchema(channelSubmissions).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
});

// AI Conversations (for Podlogix AI Assistant)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileLink = typeof profileLinks.$inferSelect;
export type InsertProfileLink = z.infer<typeof insertProfileLinkSchema>;
export type Podcast = typeof podcasts.$inferSelect;
export type InsertPodcast = z.infer<typeof insertPodcastSchema>;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type InsertRssFeed = z.infer<typeof insertRssFeedSchema>;
export type DistributionChannel = typeof distributionChannels.$inferSelect;
export type ChannelSubmission = typeof channelSubmissions.$inferSelect;
export type InsertChannelSubmission = z.infer<typeof insertChannelSubmissionSchema>;
