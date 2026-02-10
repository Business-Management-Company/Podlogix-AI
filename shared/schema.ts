import { pgTable, text, serial, timestamp, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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

// Connected social accounts via Phyllo for monitoring
export const connectedSocialAccounts = pgTable("connected_social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  phylloUserId: varchar("phyllo_user_id"),
  phylloAccountId: varchar("phyllo_account_id"),
  platform: varchar("platform").notNull(), // instagram, tiktok, youtube, twitter, linkedin, facebook
  username: varchar("username").notNull(),
  profileUrl: text("profile_url"),
  profilePictureUrl: text("profile_picture_url"),
  followerCount: integer("follower_count"),
  isVerified: boolean("is_verified").default(false),
  status: varchar("status").default("connected"), // connected, syncing, disconnected, error
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social monitoring alerts (impersonation, brand safety, etc.)
export const socialMonitoringAlerts = pgTable("social_monitoring_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: varchar("platform").notNull(),
  alertType: varchar("alert_type").notNull(), // impersonation, brand_safety, mention, content_flag
  severity: varchar("severity").default("medium"), // low, medium, high
  title: varchar("title").notNull(),
  description: text("description"),
  contentUrl: text("content_url"),
  suspiciousAccountUsername: varchar("suspicious_account_username"),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConnectedSocialAccountSchema = createInsertSchema(connectedSocialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSocialMonitoringAlertSchema = createInsertSchema(socialMonitoringAlerts).omit({
  id: true,
  createdAt: true,
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
  // Social icons displayed at top of profile
  socialIcons: jsonb("social_icons").$type<{ platform: string; url: string }[]>().default([]),
  // YouTube video embed
  youtubeVideoUrl: text("youtube_video_url"),
  youtubeVideoMode: varchar("youtube_video_mode").default("specific"), // specific, latest, channel, latestLink
  youtubeChannelId: varchar("youtube_channel_id"),
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

// Podcast Subscriptions (listener-side - podcasts user follows)
export const podcastSubscriptions = pgTable("podcast_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  author: varchar("author"),
  description: text("description"),
  artworkUrl: text("artwork_url"),
  feedUrl: text("feed_url").notNull(),
  spotifyShowId: varchar("spotify_show_id"), // If imported from Spotify
  lastCheckedAt: timestamp("last_checked_at"),
  latestEpisodeAt: timestamp("latest_episode_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Episodes from subscribed podcasts
export const subscriptionEpisodes = pgTable("subscription_episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  audioUrl: text("audio_url"),
  duration: integer("duration"), // In seconds
  publishedAt: timestamp("published_at"),
  guid: varchar("guid"), // RSS GUID for deduplication
  transcriptStatus: varchar("transcript_status").default("pending"), // pending, processing, completed, failed
  transcript: text("transcript"),
  briefingStatus: varchar("briefing_status").default("pending"), // pending, processing, completed, failed
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User interests (topics to track in podcasts)
export const userInterests = pgTable("user_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topic: varchar("topic").notNull(), // e.g., "AI trends", "startup funding"
  keywords: text("keywords").array(), // Related keywords to search for
  priority: varchar("priority").default("medium"), // high, medium, low
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Episode briefings (AI-generated summaries personalized to user interests)
export const episodeBriefings = pgTable("episode_briefings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  episodeId: varchar("episode_id").notNull(),
  userId: varchar("user_id").notNull(),
  summary: text("summary").notNull(), // Overall episode summary
  keyTakeaways: text("key_takeaways").array(), // Bullet points
  relevantQuotes: text("relevant_quotes").array(), // Notable quotes
  personalInsights: text("personal_insights").array(), // Insights matching user interests
  matchedInterests: text("matched_interests").array(), // Which user interests were matched
  relevanceScore: integer("relevance_score").default(0), // 0-100 how relevant to user
  isBookmarked: boolean("is_bookmarked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Spotify Connections (per-user OAuth tokens)
export const spotifyConnections = pgTable("spotify_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  spotifyUserId: varchar("spotify_user_id"),
  displayName: varchar("display_name"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications (for dashboard and email alerts)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // new_episode, briefing_ready, impersonator_alert
  title: varchar("title").notNull(),
  message: text("message"),
  resourceType: varchar("resource_type"), // episode, briefing, etc.
  resourceId: varchar("resource_id"),
  isRead: boolean("is_read").default(false),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables
export const insertPodcastSubscriptionSchema = createInsertSchema(podcastSubscriptions).omit({
  id: true,
  createdAt: true,
  lastCheckedAt: true,
  latestEpisodeAt: true,
});

export const insertSubscriptionEpisodeSchema = createInsertSchema(subscriptionEpisodes).omit({
  id: true,
  createdAt: true,
});

export const insertUserInterestSchema = createInsertSchema(userInterests).omit({
  id: true,
  createdAt: true,
});

export const insertEpisodeBriefingSchema = createInsertSchema(episodeBriefings).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Brand Influencer Discovery Tables

// Saved influencers from Modash discovery
export const savedInfluencers = pgTable("saved_influencers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: varchar("platform").notNull(), // instagram, tiktok, youtube
  platformUserId: varchar("platform_user_id").notNull(),
  username: varchar("username").notNull(),
  fullName: varchar("full_name"),
  profilePicUrl: text("profile_pic_url"),
  bio: text("bio"),
  followerCount: integer("follower_count"),
  followingCount: integer("following_count"),
  engagementRate: integer("engagement_rate"), // Stored as percentage * 100 (e.g., 1.5% = 150)
  avgLikes: integer("avg_likes"),
  avgComments: integer("avg_comments"),
  location: varchar("location"),
  categories: text("categories").array(),
  notes: text("notes"),
  status: varchar("status").default("saved"), // saved, contacted, negotiating, partnered, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hashtag/keyword monitors for brands
export const hashtagMonitors = pgTable("hashtag_monitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  hashtag: varchar("hashtag").notNull(),
  platform: varchar("platform").default("instagram"), // instagram, tiktok, youtube
  isActive: boolean("is_active").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved influencer searches
export const influencerSearches = pgTable("influencer_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name"),
  filters: text("filters"), // JSON stringified search filters
  resultCount: integer("result_count"),
  isSaved: boolean("is_saved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedInfluencerSchema = createInsertSchema(savedInfluencers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHashtagMonitorSchema = createInsertSchema(hashtagMonitors).omit({
  id: true,
  lastCheckedAt: true,
  createdAt: true,
});

export const insertInfluencerSearchSchema = createInsertSchema(influencerSearches).omit({
  id: true,
  createdAt: true,
});

// Modash search request schema
export const modashSearchSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']).default('instagram'),
  minFollowers: z.number().optional(),
  maxFollowers: z.number().optional(),
  minEngagement: z.number().optional(),
  maxEngagement: z.number().optional(),
  location: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  page: z.number().default(1),
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
export type PodcastSubscription = typeof podcastSubscriptions.$inferSelect;
export type InsertPodcastSubscription = z.infer<typeof insertPodcastSubscriptionSchema>;
export type SubscriptionEpisode = typeof subscriptionEpisodes.$inferSelect;
export type InsertSubscriptionEpisode = z.infer<typeof insertSubscriptionEpisodeSchema>;
export type UserInterest = typeof userInterests.$inferSelect;
export type InsertUserInterest = z.infer<typeof insertUserInterestSchema>;
export type EpisodeBriefing = typeof episodeBriefings.$inferSelect;
export type InsertEpisodeBriefing = z.infer<typeof insertEpisodeBriefingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SpotifyConnection = typeof spotifyConnections.$inferSelect;
export type SavedInfluencer = typeof savedInfluencers.$inferSelect;
export type InsertSavedInfluencer = z.infer<typeof insertSavedInfluencerSchema>;
export type HashtagMonitor = typeof hashtagMonitors.$inferSelect;
export type InsertHashtagMonitor = z.infer<typeof insertHashtagMonitorSchema>;
export type InfluencerSearch = typeof influencerSearches.$inferSelect;
export type InsertInfluencerSearch = z.infer<typeof insertInfluencerSearchSchema>;
export type ConnectedSocialAccount = typeof connectedSocialAccounts.$inferSelect;
export type InsertConnectedSocialAccount = z.infer<typeof insertConnectedSocialAccountSchema>;
export type SocialMonitoringAlert = typeof socialMonitoringAlerts.$inferSelect;
export type InsertSocialMonitoringAlert = z.infer<typeof insertSocialMonitoringAlertSchema>;

// Creator Social Profiles (native API integration for influencers)
export const creatorSocialProfiles = pgTable("creator_social_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: varchar("platform").notNull(), // youtube, instagram, tiktok, twitter, linkedin
  profileUrl: text("profile_url").notNull(),
  username: varchar("username"),
  displayName: varchar("display_name"),
  profilePictureUrl: text("profile_picture_url"),
  // YouTube-specific analytics (populated via YouTube Data API)
  youtubeChannelId: varchar("youtube_channel_id"),
  subscriberCount: integer("subscriber_count"),
  videoCount: integer("video_count"),
  viewCount: integer("view_count"),
  // Instagram-specific fields (populated via Instagram Graph API OAuth)
  instagramAccountId: varchar("instagram_account_id"),
  instagramAccessToken: text("instagram_access_token"),
  instagramTokenExpiresAt: timestamp("instagram_token_expires_at"),
  followersCount: integer("followers_count"),
  followingCount: integer("following_count"),
  mediaCount: integer("media_count"),
  // LinkedIn-specific fields (populated via LinkedIn OAuth)
  linkedinMemberId: varchar("linkedin_member_id"),
  linkedinAccessToken: text("linkedin_access_token"),
  linkedinTokenExpiresAt: timestamp("linkedin_token_expires_at"),
  // Facebook-specific fields (populated via Facebook OAuth)
  facebookPageId: varchar("facebook_page_id"),
  facebookAccessToken: text("facebook_access_token"),
  facebookTokenExpiresAt: timestamp("facebook_token_expires_at"),
  facebookPageName: varchar("facebook_page_name"),
  facebookFansCount: integer("facebook_fans_count"),
  // Verification status
  verified: boolean("verified").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCreatorSocialProfileSchema = createInsertSchema(creatorSocialProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatorSocialProfile = typeof creatorSocialProfiles.$inferSelect;
export type InsertCreatorSocialProfile = z.infer<typeof insertCreatorSocialProfileSchema>;

// Email Contacts (guests, subscribers, team, etc.)
export const emailContacts = pgTable("email_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  category: varchar("category").default("subscriber"), // guest, subscriber, sponsor, collaborator, team
  notes: text("notes"),
  tags: text("tags").array(),
  isSubscribed: boolean("is_subscribed").default(true),
  lastEmailedAt: timestamp("last_emailed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Templates (reusable templates)
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(), // HTML content
  category: varchar("category").default("custom"), // guest_invite, newsletter, thank_you, follow_up, custom
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Campaigns (sent emails / drafts)
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  templateId: varchar("template_id"),
  recipientType: varchar("recipient_type").default("individual"), // individual, category, all
  recipientFilter: text("recipient_filter"), // JSON for filtering (e.g., { category: "guest" })
  status: varchar("status").default("draft"), // draft, scheduled, sending, sent, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Campaign Recipients (individual recipients for a campaign)
export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  contactId: varchar("contact_id"),
  email: varchar("email").notNull(),
  status: varchar("status").default("pending"), // pending, sent, delivered, opened, clicked, bounced, failed
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
});

export const insertEmailContactSchema = createInsertSchema(emailContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastEmailedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  openCount: true,
  clickCount: true,
});

export const insertEmailCampaignRecipientSchema = createInsertSchema(emailCampaignRecipients).omit({
  id: true,
  sentAt: true,
  openedAt: true,
  clickedAt: true,
});

export type EmailContact = typeof emailContacts.$inferSelect;
export type InsertEmailContact = z.infer<typeof insertEmailContactSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;
export type InsertEmailCampaignRecipient = z.infer<typeof insertEmailCampaignRecipientSchema>;

// YouTube Video Analysis
export const videoAnalyses = pgTable("video_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  videoUrl: text("video_url").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  transcript: text("transcript"),
  presenceScore: integer("presence_score"),
  speakingAbilityScore: integer("speaking_ability_score"),
  fillerWordsScore: integer("filler_words_score"),
  appearanceScore: integer("appearance_score"),
  overallScore: integer("overall_score"),
  presenceFeedback: text("presence_feedback"),
  speakingAbilityFeedback: text("speaking_ability_feedback"),
  fillerWordsFeedback: text("filler_words_feedback"),
  appearanceFeedback: text("appearance_feedback"),
  overallFeedback: text("overall_feedback"),
  fillerWordsDetected: jsonb("filler_words_detected"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

export const insertVideoAnalysisSchema = createInsertSchema(videoAnalyses).omit({
  id: true,
  createdAt: true,
  analyzedAt: true,
});

export type VideoAnalysis = typeof videoAnalyses.$inferSelect;
export type InsertVideoAnalysis = z.infer<typeof insertVideoAnalysisSchema>;

// Upload-Post connected social accounts for creators
export const uploadPostAccounts = pgTable("upload_post_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  uploadPostUsername: varchar("upload_post_username").notNull(),
  platform: varchar("platform").notNull(),
  platformAccountId: varchar("platform_account_id"),
  platformUsername: varchar("platform_username"),
  profileUrl: text("profile_url"),
  profilePictureUrl: text("profile_picture_url"),
  isConnected: boolean("is_connected").default(true),
  connectedAt: timestamp("connected_at").defaultNow(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Upload-Post scheduled/published posts
export const uploadPostPosts = pgTable("upload_post_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  uploadPostPostId: varchar("upload_post_post_id"),
  platforms: text("platforms").array(),
  content: text("content"),
  mediaUrls: text("media_urls").array(),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  status: varchar("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadPostAccountSchema = createInsertSchema(uploadPostAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertUploadPostPostSchema = createInsertSchema(uploadPostPosts).omit({
  id: true,
  createdAt: true,
});

export type UploadPostAccount = typeof uploadPostAccounts.$inferSelect;
export type InsertUploadPostAccount = z.infer<typeof insertUploadPostAccountSchema>;
export type UploadPostPost = typeof uploadPostPosts.$inferSelect;
export type InsertUploadPostPost = z.infer<typeof insertUploadPostPostSchema>;

// Admin Creator List - influencers discovered and added by admin for outreach/management
export const adminCreatorList = pgTable("admin_creator_list", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addedByUserId: varchar("added_by_user_id").notNull(),
  platform: varchar("platform").notNull(),
  platformUserId: varchar("platform_user_id"),
  username: varchar("username").notNull(),
  fullName: varchar("full_name"),
  profilePicUrl: text("profile_pic_url"),
  bio: text("bio"),
  email: varchar("email"),
  phone: varchar("phone"),
  websiteUrl: text("website_url"),
  followerCount: integer("follower_count"),
  followingCount: integer("following_count"),
  engagementRate: integer("engagement_rate"),
  avgLikes: integer("avg_likes"),
  avgComments: integer("avg_comments"),
  avgViews: integer("avg_views"),
  location: varchar("location"),
  categories: text("categories").array(),
  niche: varchar("niche"),
  hourlyRate: integer("hourly_rate"),
  perPostRate: integer("per_post_rate"),
  perVideoRate: integer("per_video_rate"),
  perStoryRate: integer("per_story_rate"),
  monthlyRetainerRate: integer("monthly_retainer_rate"),
  packageDescription: text("package_description"),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("prospect"),
  priority: varchar("priority").default("medium"),
  notes: text("notes"),
  tags: text("tags").array(),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminCreatorSchema = createInsertSchema(adminCreatorList).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AdminCreator = typeof adminCreatorList.$inferSelect;
export type InsertAdminCreator = z.infer<typeof insertAdminCreatorSchema>;

// Client Portal - Saved Creators for brands/agencies
export const clientSavedCreators = pgTable("client_saved_creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // The client/brand user
  platform: varchar("platform").notNull(), // instagram, youtube, tiktok, twitter, podcast
  platformUserId: varchar("platform_user_id"), // External platform ID if available
  username: varchar("username").notNull(),
  displayName: varchar("display_name"),
  profilePicUrl: text("profile_pic_url"),
  bio: text("bio"),
  followerCount: integer("follower_count"),
  engagementRate: integer("engagement_rate"), // Stored as percentage * 100
  avgViews: integer("avg_views"),
  avgLikes: integer("avg_likes"),
  location: varchar("location"),
  categories: text("categories").array(),
  email: varchar("email"), // Contact email if available
  estimatedPostRate: integer("estimated_post_rate"), // In cents
  estimatedStoryRate: integer("estimated_story_rate"),
  estimatedVideoRate: integer("estimated_video_rate"),
  notes: text("notes"),
  tags: text("tags").array(),
  status: varchar("status").default("saved"), // saved, interested, contacted, negotiating, partnered, declined
  listName: varchar("list_name"), // For organizing into lists
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Portal - Outreach/Connection Requests
export const clientOutreachRequests = pgTable("client_outreach_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // The client/brand user
  savedCreatorId: varchar("saved_creator_id").notNull(), // References clientSavedCreators
  messageType: varchar("message_type").default("collaboration"), // collaboration, sponsorship, ambassador, custom
  subject: varchar("subject"),
  message: text("message"),
  proposedBudget: integer("proposed_budget"), // In cents
  proposedDeliverables: text("proposed_deliverables"),
  status: varchar("status").default("draft"), // draft, sent, viewed, replied, accepted, declined
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  creatorResponse: text("creator_response"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSavedCreatorSchema = createInsertSchema(clientSavedCreators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientOutreachRequestSchema = createInsertSchema(clientOutreachRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ClientSavedCreator = typeof clientSavedCreators.$inferSelect;
export type InsertClientSavedCreator = z.infer<typeof insertClientSavedCreatorSchema>;
export type ClientOutreachRequest = typeof clientOutreachRequests.$inferSelect;
export type InsertClientOutreachRequest = z.infer<typeof insertClientOutreachRequestSchema>;

export const adminDevDocuments = pgTable("admin_dev_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").default("general"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminDevDocumentSchema = createInsertSchema(adminDevDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AdminDevDocument = typeof adminDevDocuments.$inferSelect;
export type InsertAdminDevDocument = z.infer<typeof insertAdminDevDocumentSchema>;

export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("admin"),
  invitedByUserId: varchar("invited_by_user_id").notNull(),
  invitedByName: varchar("invited_by_name"),
  status: varchar("status").default("pending"),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  acceptedAt: true,
  createdAt: true,
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
