import { db } from "./db";
import { 
  subscribers, messages, identityAssets, profiles, profileLinks, profileSections, podcasts, episodes, rssFeeds, distributionChannels, channelSubmissions,
  podcastSubscriptions, subscriptionEpisodes, userInterests, episodeBriefings, notifications, spotifyConnections, googleCalendarConnections,
  savedInfluencers, hashtagMonitors, influencerSearches, connectedSocialAccounts, socialMonitoringAlerts, creatorSocialProfiles,
  emailContacts, contactNotes, emailTemplates, emailCampaigns, emailCampaignRecipients, videoAnalyses, uploadPostAccounts, uploadPostPosts,
  adminCreatorList, guestPipelineEntries, savedCreators, mediaLibraryItems, liveSessions, liveMarks,
  type Subscriber, type InsertSubscriber, type Message, type InsertMessage, type IdentityAsset, type InsertIdentityAsset,
  type Profile, type InsertProfile, type ProfileLink, type InsertProfileLink, type ProfileSection, type InsertProfileSection, type Podcast, type InsertPodcast,
  type RssFeed, type InsertRssFeed, type Episode, type InsertEpisode, type DistributionChannel, type ChannelSubmission, type InsertChannelSubmission,
  type PodcastSubscription, type InsertPodcastSubscription, type SubscriptionEpisode, type InsertSubscriptionEpisode,
  type UserInterest, type InsertUserInterest, type EpisodeBriefing, type InsertEpisodeBriefing,
  type Notification, type InsertNotification, type SpotifyConnection, type GoogleCalendarConnection,
  type SavedInfluencer, type InsertSavedInfluencer, type HashtagMonitor, type InsertHashtagMonitor,
  type InfluencerSearch, type InsertInfluencerSearch,
  type ConnectedSocialAccount, type InsertConnectedSocialAccount,
  type SocialMonitoringAlert, type InsertSocialMonitoringAlert,
  type CreatorSocialProfile, type InsertCreatorSocialProfile,
  type EmailContact, type InsertEmailContact, type ContactNote, type InsertContactNote, type EmailTemplate, type InsertEmailTemplate,
  type EmailCampaign, type InsertEmailCampaign, type EmailCampaignRecipient, type InsertEmailCampaignRecipient,
  type GuestPipelineEntry, type InsertGuestPipelineEntry,
  type SavedCreator, type InsertSavedCreator,
  type MediaLibraryItem, type InsertMediaLibraryItem,
  type LiveSession, type InsertLiveSession, type LiveMark, type InsertLiveMark,
  type VideoAnalysis, type InsertVideoAnalysis,
  type UploadPostAccount, type InsertUploadPostAccount, type UploadPostPost, type InsertUploadPostPost,
  type AdminCreator, type InsertAdminCreator
} from "@shared/schema";
import { eq, asc, desc, and } from "drizzle-orm";

export interface IStorage {
  // Subscribers & Messages
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  createMessage(message: InsertMessage): Promise<Message>;
  // Identity Assets
  createIdentityAsset(asset: InsertIdentityAsset): Promise<IdentityAsset>;
  getIdentityAsset(id: string): Promise<IdentityAsset | undefined>;
  getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]>;
  getAllIdentityAssets(): Promise<IdentityAsset[]>;
  updateIdentityAsset(id: string, updates: Partial<IdentityAsset>): Promise<IdentityAsset | undefined>;
  // Profiles
  createProfile(profile: InsertProfile): Promise<Profile>;
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  getProfileBySlug(slug: string): Promise<Profile | undefined>;
  updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | undefined>;
  // Profile Links
  createProfileLink(link: InsertProfileLink): Promise<ProfileLink>;
  getProfileLinks(profileId: string): Promise<ProfileLink[]>;
  updateProfileLink(id: string, updates: Partial<ProfileLink>): Promise<ProfileLink | undefined>;
  deleteProfileLink(id: string): Promise<void>;
  // Profile Sections
  createProfileSection(section: InsertProfileSection): Promise<ProfileSection>;
  getProfileSections(profileId: string): Promise<ProfileSection[]>;
  updateProfileSection(id: string, updates: Partial<ProfileSection>): Promise<ProfileSection | undefined>;
  deleteProfileSection(id: string): Promise<void>;
  // Podcasts
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getPodcastsByUserId(userId: string): Promise<Podcast[]>;
  getPodcast(id: string): Promise<Podcast | undefined>;
  updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined>;
  // RSS Feeds
  createRssFeed(feed: InsertRssFeed): Promise<RssFeed>;
  getRssFeedsByPodcast(podcastId: string): Promise<RssFeed[]>;
  updateRssFeed(id: string, updates: Partial<RssFeed>): Promise<RssFeed | undefined>;

  // Creator Episodes (hosted)
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  getEpisodesByPodcast(podcastId: string): Promise<Episode[]>;
  getPublishedEpisodesByPodcast(podcastId: string): Promise<Episode[]>;
  getEpisode(id: string): Promise<Episode | undefined>;
  updateEpisode(id: string, updates: Partial<Episode>): Promise<Episode | undefined>;
  deleteEpisode(id: string): Promise<void>;
  // Distribution
  getDistributionChannels(): Promise<DistributionChannel[]>;
  getChannelSubmissions(podcastId: string): Promise<ChannelSubmission[]>;
  createChannelSubmission(submission: InsertChannelSubmission): Promise<ChannelSubmission>;
  updateChannelSubmission(id: string, updates: Partial<ChannelSubmission>): Promise<ChannelSubmission | undefined>;
  // Podcast Subscriptions (listener side)
  createPodcastSubscription(subscription: InsertPodcastSubscription): Promise<PodcastSubscription>;
  getPodcastSubscriptionsByUserId(userId: string): Promise<PodcastSubscription[]>;
  getAllPodcastSubscriptions(): Promise<PodcastSubscription[]>;
  getPodcastSubscription(id: string): Promise<PodcastSubscription | undefined>;
  updatePodcastSubscription(id: string, updates: Partial<PodcastSubscription>): Promise<PodcastSubscription | undefined>;
  deletePodcastSubscription(id: string): Promise<void>;
  // Subscription Episodes
  createSubscriptionEpisode(episode: InsertSubscriptionEpisode): Promise<SubscriptionEpisode>;
  getSubscriptionEpisodesByUser(userId: string): Promise<SubscriptionEpisode[]>;
  getSubscriptionEpisodesBySubscription(subscriptionId: string): Promise<SubscriptionEpisode[]>;
  getSubscriptionEpisode(id: string): Promise<SubscriptionEpisode | undefined>;
  updateSubscriptionEpisode(id: string, updates: Partial<SubscriptionEpisode>): Promise<SubscriptionEpisode | undefined>;
  // User Interests
  createUserInterest(interest: InsertUserInterest): Promise<UserInterest>;
  getUserInterests(userId: string): Promise<UserInterest[]>;
  updateUserInterest(id: string, updates: Partial<UserInterest>): Promise<UserInterest | undefined>;
  deleteUserInterest(id: string): Promise<void>;
  // Episode Briefings
  createEpisodeBriefing(briefing: InsertEpisodeBriefing): Promise<EpisodeBriefing>;
  getEpisodeBriefingsByUser(userId: string): Promise<EpisodeBriefing[]>;
  getEpisodeBriefing(id: string): Promise<EpisodeBriefing | undefined>;
  getEpisodeBriefingByEpisode(episodeId: string): Promise<EpisodeBriefing | undefined>;
  updateEpisodeBriefing(id: string, updates: Partial<EpisodeBriefing>): Promise<EpisodeBriefing | undefined>;
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  // Spotify Connections
  getSpotifyConnection(userId: string): Promise<SpotifyConnection | undefined>;
  upsertSpotifyConnection(connection: Omit<SpotifyConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpotifyConnection>;
  deleteSpotifyConnection(userId: string): Promise<void>;
  getGoogleCalendarConnection(userId: string): Promise<GoogleCalendarConnection | undefined>;
  upsertGoogleCalendarConnection(connection: Omit<GoogleCalendarConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleCalendarConnection>;
  deleteGoogleCalendarConnection(userId: string): Promise<void>;
  // All subscriptions (for background jobs)
  getAllActiveSubscriptions(): Promise<PodcastSubscription[]>;
  // Saved Influencers
  createSavedInfluencer(influencer: InsertSavedInfluencer): Promise<SavedInfluencer>;
  getSavedInfluencersByUser(userId: string): Promise<SavedInfluencer[]>;
  getSavedInfluencer(id: string): Promise<SavedInfluencer | undefined>;
  updateSavedInfluencer(id: string, updates: Partial<SavedInfluencer>): Promise<SavedInfluencer | undefined>;
  deleteSavedInfluencer(id: string): Promise<void>;
  // Hashtag Monitors
  createHashtagMonitor(monitor: InsertHashtagMonitor): Promise<HashtagMonitor>;
  getHashtagMonitorsByUser(userId: string): Promise<HashtagMonitor[]>;
  updateHashtagMonitor(id: string, updates: Partial<HashtagMonitor>): Promise<HashtagMonitor | undefined>;
  deleteHashtagMonitor(id: string): Promise<void>;
  // Influencer Searches
  createInfluencerSearch(search: InsertInfluencerSearch): Promise<InfluencerSearch>;
  getInfluencerSearchesByUser(userId: string): Promise<InfluencerSearch[]>;
  deleteInfluencerSearch(id: string): Promise<void>;
  // Connected Social Accounts
  createConnectedSocialAccount(account: InsertConnectedSocialAccount): Promise<ConnectedSocialAccount>;
  getConnectedSocialAccountsByUser(userId: string): Promise<ConnectedSocialAccount[]>;
  getConnectedSocialAccount(id: string): Promise<ConnectedSocialAccount | undefined>;
  updateConnectedSocialAccount(id: string, updates: Partial<ConnectedSocialAccount>): Promise<ConnectedSocialAccount | undefined>;
  deleteConnectedSocialAccount(id: string): Promise<void>;
  // Social Monitoring Alerts
  createSocialMonitoringAlert(alert: InsertSocialMonitoringAlert): Promise<SocialMonitoringAlert>;
  getSocialMonitoringAlertsByUser(userId: string): Promise<SocialMonitoringAlert[]>;
  getUnresolvedAlertsByUser(userId: string): Promise<SocialMonitoringAlert[]>;
  updateSocialMonitoringAlert(id: string, updates: Partial<SocialMonitoringAlert>): Promise<SocialMonitoringAlert | undefined>;
  // Creator Social Profiles
  createCreatorSocialProfile(profile: InsertCreatorSocialProfile): Promise<CreatorSocialProfile>;
  getCreatorSocialProfilesByUser(userId: string): Promise<CreatorSocialProfile[]>;
  getCreatorSocialProfile(id: string): Promise<CreatorSocialProfile | undefined>;
  getCreatorSocialProfileByPlatform(userId: string, platform: string): Promise<CreatorSocialProfile | undefined>;
  updateCreatorSocialProfile(id: string, updates: Partial<CreatorSocialProfile>): Promise<CreatorSocialProfile | undefined>;
  deleteCreatorSocialProfile(id: string): Promise<void>;
  // Email Contacts
  getEmailContacts(userId: string): Promise<EmailContact[]>;
  getContactNotes(contactId: string, userId: string): Promise<ContactNote[]>;
  createContactNote(note: InsertContactNote): Promise<ContactNote>;
  getEmailContact(id: string): Promise<EmailContact | undefined>;
  createEmailContact(contact: InsertEmailContact): Promise<EmailContact>;
  updateEmailContact(id: string, userId: string, updates: Partial<EmailContact>): Promise<EmailContact | undefined>;
  deleteEmailContact(id: string, userId: string): Promise<void>;
  // Guest Pipeline
  getGuestPipelineEntriesByPodcast(podcastId: string): Promise<GuestPipelineEntry[]>;
  createGuestPipelineEntry(entry: InsertGuestPipelineEntry): Promise<GuestPipelineEntry>;
  updateGuestPipelineEntry(id: string, updates: Partial<GuestPipelineEntry>): Promise<GuestPipelineEntry | undefined>;
  deleteGuestPipelineEntry(id: string): Promise<void>;
  getSavedCreatorsByUser(userId: string): Promise<SavedCreator[]>;
  createSavedCreator(entry: InsertSavedCreator): Promise<SavedCreator>;
  deleteSavedCreator(id: string, userId: string): Promise<void>;
  // Media Library
  getMediaLibraryItemsByUser(userId: string): Promise<MediaLibraryItem[]>;
  createLiveSession(session: InsertLiveSession): Promise<LiveSession>;
  getLatestLiveSession(userId: string): Promise<LiveSession | undefined>;
  getLiveSession(id: string): Promise<LiveSession | undefined>;
  updateLiveSession(id: string, updates: Partial<LiveSession>): Promise<LiveSession | undefined>;
  getLiveSessionByInviteCode(code: string): Promise<LiveSession | undefined>;
  createLiveMark(mark: InsertLiveMark): Promise<LiveMark>;
  getLiveMarks(sessionId: string): Promise<LiveMark[]>;
  getLiveMark(id: string): Promise<LiveMark | undefined>;
  updateLiveMark(id: string, updates: Partial<LiveMark>): Promise<LiveMark | undefined>;
  createMediaLibraryItem(item: InsertMediaLibraryItem): Promise<MediaLibraryItem | undefined>;
  deleteMediaLibraryItem(id: string, userId: string): Promise<void>;
  // Email Templates
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string, userId: string): Promise<void>;
  // Email Campaigns
  getEmailCampaigns(userId: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, userId: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined>;
  // Video Analysis
  createVideoAnalysis(analysis: InsertVideoAnalysis): Promise<VideoAnalysis>;
  getVideoAnalysesByUser(userId: string): Promise<VideoAnalysis[]>;
  getVideoAnalysis(id: string): Promise<VideoAnalysis | undefined>;
  updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis | undefined>;
  // Upload-Post Accounts
  createUploadPostAccount(account: InsertUploadPostAccount): Promise<UploadPostAccount>;
  getUploadPostAccountsByUser(userId: string): Promise<UploadPostAccount[]>;
  getUploadPostAccount(id: string): Promise<UploadPostAccount | undefined>;
  updateUploadPostAccount(id: string, updates: Partial<UploadPostAccount>): Promise<UploadPostAccount | undefined>;
  deleteUploadPostAccount(id: string): Promise<void>;
  deleteUploadPostAccountsByUser(userId: string): Promise<void>;
  // Upload-Post Posts
  createUploadPostPost(post: InsertUploadPostPost): Promise<UploadPostPost>;
  getUploadPostPostsByUser(userId: string): Promise<UploadPostPost[]>;
  getUploadPostPost(id: string): Promise<UploadPostPost | undefined>;
  getUploadPostPostByExternalId(externalId: string): Promise<UploadPostPost | undefined>;
  updateUploadPostPost(id: string, updates: Partial<UploadPostPost>): Promise<UploadPostPost | undefined>;
  // Admin Creator List
  createAdminCreator(creator: InsertAdminCreator): Promise<AdminCreator>;
  getAdminCreators(): Promise<AdminCreator[]>;
  getAdminCreator(id: string): Promise<AdminCreator | undefined>;
  updateAdminCreator(id: string, updates: Partial<AdminCreator>): Promise<AdminCreator | undefined>;
  deleteAdminCreator(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
    return subscriber;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async createIdentityAsset(insertAsset: InsertIdentityAsset): Promise<IdentityAsset> {
    const { socialChannels, monitorChannels, likenessImages, ...baseAsset } = insertAsset;
    const [asset] = await db.insert(identityAssets).values({
      ...baseAsset,
      youtubeChannel: socialChannels?.youtube || null,
      twitterHandle: socialChannels?.twitter || null,
      instagramHandle: socialChannels?.instagram || null,
      tiktokHandle: socialChannels?.tiktok || null,
      linkedinUrl: socialChannels?.linkedin || null,
      spotifyUrl: socialChannels?.spotify || null,
      monitorChannels: monitorChannels ?? true,
      likenessImages: likenessImages || null,
    }).returning();
    return asset;
  }

  async getIdentityAsset(id: string): Promise<IdentityAsset | undefined> {
    const [asset] = await db.select().from(identityAssets).where(eq(identityAssets.id, id));
    return asset;
  }

  async getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]> {
    return await db.select().from(identityAssets).where(eq(identityAssets.email, email));
  }

  async getAllIdentityAssets(): Promise<IdentityAsset[]> {
    return await db.select().from(identityAssets).orderBy(desc(identityAssets.createdAt));
  }

  async updateIdentityAsset(id: string, updates: Partial<IdentityAsset>): Promise<IdentityAsset | undefined> {
    const [updated] = await db.update(identityAssets).set(updates).where(eq(identityAssets.id, id)).returning();
    return updated;
  }

  // Profiles
  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(insertProfile).returning();
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getProfileBySlug(slug: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.slug, slug));
    return profile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | undefined> {
    const [updated] = await db.update(profiles).set({ ...updates, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
    return updated;
  }

  // Profile Links
  async createProfileLink(insertLink: InsertProfileLink): Promise<ProfileLink> {
    const [link] = await db.insert(profileLinks).values(insertLink).returning();
    return link;
  }

  async getProfileLinks(profileId: string): Promise<ProfileLink[]> {
    return await db.select().from(profileLinks).where(eq(profileLinks.profileId, profileId)).orderBy(asc(profileLinks.order));
  }

  async updateProfileLink(id: string, updates: Partial<ProfileLink>): Promise<ProfileLink | undefined> {
    const [updated] = await db.update(profileLinks).set(updates).where(eq(profileLinks.id, id)).returning();
    return updated;
  }

  async deleteProfileLink(id: string): Promise<void> {
    await db.delete(profileLinks).where(eq(profileLinks.id, id));
  }

  // Profile Sections
  async createProfileSection(insertSection: InsertProfileSection): Promise<ProfileSection> {
    const [section] = await db.insert(profileSections).values(insertSection).returning();
    return section;
  }

  async getProfileSections(profileId: string): Promise<ProfileSection[]> {
    return await db.select().from(profileSections).where(eq(profileSections.profileId, profileId)).orderBy(asc(profileSections.order));
  }

  async updateProfileSection(id: string, updates: Partial<ProfileSection>): Promise<ProfileSection | undefined> {
    const [updated] = await db.update(profileSections).set(updates).where(eq(profileSections.id, id)).returning();
    return updated;
  }

  async deleteProfileSection(id: string): Promise<void> {
    await db.delete(profileSections).where(eq(profileSections.id, id));
  }

  // Podcasts
  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const [podcast] = await db.insert(podcasts).values(insertPodcast).returning();
    return podcast;
  }

  async getPodcastsByUserId(userId: string): Promise<Podcast[]> {
    return await db.select().from(podcasts).where(eq(podcasts.userId, userId));
  }

  async getPodcast(id: string): Promise<Podcast | undefined> {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, id));
    return podcast;
  }

  async updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined> {
    const [updated] = await db.update(podcasts).set({ ...updates, updatedAt: new Date() }).where(eq(podcasts.id, id)).returning();
    return updated;
  }

  // RSS Feeds
  async createRssFeed(insertFeed: InsertRssFeed): Promise<RssFeed> {
    const [feed] = await db.insert(rssFeeds).values(insertFeed).returning();
    return feed;
  }

  async getRssFeedsByPodcast(podcastId: string): Promise<RssFeed[]> {
    return await db.select().from(rssFeeds).where(eq(rssFeeds.podcastId, podcastId));
  }

  async updateRssFeed(id: string, updates: Partial<RssFeed>): Promise<RssFeed | undefined> {
    const [updated] = await db.update(rssFeeds).set(updates).where(eq(rssFeeds.id, id)).returning();
    return updated;
  }

  // Creator Episodes (hosted)
  async createEpisode(insertEpisode: InsertEpisode): Promise<Episode> {
    const [episode] = await db.insert(episodes).values(insertEpisode).returning();
    return episode;
  }

  async getEpisodesByPodcast(podcastId: string): Promise<Episode[]> {
    return await db.select().from(episodes).where(eq(episodes.podcastId, podcastId)).orderBy(desc(episodes.createdAt));
  }

  async getPublishedEpisodesByPodcast(podcastId: string): Promise<Episode[]> {
    return await db.select().from(episodes)
      .where(and(eq(episodes.podcastId, podcastId), eq(episodes.status, 'published')))
      .orderBy(desc(episodes.publishedAt));
  }

  async getEpisode(id: string): Promise<Episode | undefined> {
    const [episode] = await db.select().from(episodes).where(eq(episodes.id, id));
    return episode;
  }

  async updateEpisode(id: string, updates: Partial<Episode>): Promise<Episode | undefined> {
    const [updated] = await db.update(episodes).set({ ...updates, updatedAt: new Date() }).where(eq(episodes.id, id)).returning();
    return updated;
  }

  async deleteEpisode(id: string): Promise<void> {
    await db.delete(episodes).where(eq(episodes.id, id));
  }

  // Distribution
  async getDistributionChannels(): Promise<DistributionChannel[]> {
    return await db.select().from(distributionChannels).where(eq(distributionChannels.isActive, true));
  }

  async getChannelSubmissions(podcastId: string): Promise<ChannelSubmission[]> {
    return await db.select().from(channelSubmissions).where(eq(channelSubmissions.podcastId, podcastId));
  }

  async createChannelSubmission(insertSubmission: InsertChannelSubmission): Promise<ChannelSubmission> {
    const [submission] = await db.insert(channelSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async updateChannelSubmission(id: string, updates: Partial<ChannelSubmission>): Promise<ChannelSubmission | undefined> {
    const [updated] = await db.update(channelSubmissions).set(updates).where(eq(channelSubmissions.id, id)).returning();
    return updated;
  }

  // Podcast Subscriptions (listener side)
  async createPodcastSubscription(insertSub: InsertPodcastSubscription): Promise<PodcastSubscription> {
    const [sub] = await db.insert(podcastSubscriptions).values(insertSub).returning();
    return sub;
  }

  async getPodcastSubscriptionsByUserId(userId: string): Promise<PodcastSubscription[]> {
    return await db.select().from(podcastSubscriptions).where(eq(podcastSubscriptions.userId, userId)).orderBy(desc(podcastSubscriptions.createdAt));
  }

  async getAllPodcastSubscriptions(): Promise<PodcastSubscription[]> {
    return await db.select().from(podcastSubscriptions).orderBy(desc(podcastSubscriptions.createdAt));
  }

  async getPodcastSubscription(id: string): Promise<PodcastSubscription | undefined> {
    const [sub] = await db.select().from(podcastSubscriptions).where(eq(podcastSubscriptions.id, id));
    return sub;
  }

  async updatePodcastSubscription(id: string, updates: Partial<PodcastSubscription>): Promise<PodcastSubscription | undefined> {
    const [updated] = await db.update(podcastSubscriptions).set(updates).where(eq(podcastSubscriptions.id, id)).returning();
    return updated;
  }

  async deletePodcastSubscription(id: string): Promise<void> {
    await db.delete(podcastSubscriptions).where(eq(podcastSubscriptions.id, id));
  }

  // Subscription Episodes
  async createSubscriptionEpisode(insertEp: InsertSubscriptionEpisode): Promise<SubscriptionEpisode> {
    const [ep] = await db.insert(subscriptionEpisodes).values(insertEp).returning();
    return ep;
  }

  async getSubscriptionEpisodesByUser(userId: string): Promise<SubscriptionEpisode[]> {
    return await db.select().from(subscriptionEpisodes).where(eq(subscriptionEpisodes.userId, userId)).orderBy(desc(subscriptionEpisodes.publishedAt));
  }

  async getSubscriptionEpisodesBySubscription(subscriptionId: string): Promise<SubscriptionEpisode[]> {
    return await db.select().from(subscriptionEpisodes).where(eq(subscriptionEpisodes.subscriptionId, subscriptionId)).orderBy(desc(subscriptionEpisodes.publishedAt));
  }

  async getSubscriptionEpisode(id: string): Promise<SubscriptionEpisode | undefined> {
    const [ep] = await db.select().from(subscriptionEpisodes).where(eq(subscriptionEpisodes.id, id));
    return ep;
  }

  async updateSubscriptionEpisode(id: string, updates: Partial<SubscriptionEpisode>): Promise<SubscriptionEpisode | undefined> {
    const [updated] = await db.update(subscriptionEpisodes).set(updates).where(eq(subscriptionEpisodes.id, id)).returning();
    return updated;
  }

  // User Interests
  async createUserInterest(insertInterest: InsertUserInterest): Promise<UserInterest> {
    const [interest] = await db.insert(userInterests).values(insertInterest).returning();
    return interest;
  }

  async getUserInterests(userId: string): Promise<UserInterest[]> {
    return await db.select().from(userInterests).where(eq(userInterests.userId, userId));
  }

  async updateUserInterest(id: string, updates: Partial<UserInterest>): Promise<UserInterest | undefined> {
    const [updated] = await db.update(userInterests).set(updates).where(eq(userInterests.id, id)).returning();
    return updated;
  }

  async deleteUserInterest(id: string): Promise<void> {
    await db.delete(userInterests).where(eq(userInterests.id, id));
  }

  // Episode Briefings
  async createEpisodeBriefing(insertBriefing: InsertEpisodeBriefing): Promise<EpisodeBriefing> {
    const [briefing] = await db.insert(episodeBriefings).values(insertBriefing).returning();
    return briefing;
  }

  async getEpisodeBriefingsByUser(userId: string): Promise<EpisodeBriefing[]> {
    return await db.select().from(episodeBriefings).where(eq(episodeBriefings.userId, userId)).orderBy(desc(episodeBriefings.createdAt));
  }

  async getEpisodeBriefing(id: string): Promise<EpisodeBriefing | undefined> {
    const [briefing] = await db.select().from(episodeBriefings).where(eq(episodeBriefings.id, id));
    return briefing;
  }

  async getEpisodeBriefingByEpisode(episodeId: string): Promise<EpisodeBriefing | undefined> {
    const [briefing] = await db.select().from(episodeBriefings).where(eq(episodeBriefings.episodeId, episodeId));
    return briefing;
  }

  async updateEpisodeBriefing(id: string, updates: Partial<EpisodeBriefing>): Promise<EpisodeBriefing | undefined> {
    const [updated] = await db.update(episodeBriefings).set(updates).where(eq(episodeBriefings.id, id)).returning();
    return updated;
  }

  // Notifications
  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(insertNotif).returning();
    return notif;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // Spotify Connections
  async getSpotifyConnection(userId: string): Promise<SpotifyConnection | undefined> {
    const [connection] = await db.select().from(spotifyConnections).where(eq(spotifyConnections.userId, userId));
    return connection;
  }

  async upsertSpotifyConnection(connection: Omit<SpotifyConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpotifyConnection> {
    const existing = await this.getSpotifyConnection(connection.userId);
    if (existing) {
      const [updated] = await db.update(spotifyConnections)
        .set({ ...connection, updatedAt: new Date() })
        .where(eq(spotifyConnections.userId, connection.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(spotifyConnections).values(connection).returning();
    return created;
  }

  async deleteSpotifyConnection(userId: string): Promise<void> {
    await db.delete(spotifyConnections).where(eq(spotifyConnections.userId, userId));
  }

  // Google Calendar Connections
  async getGoogleCalendarConnection(userId: string): Promise<GoogleCalendarConnection | undefined> {
    const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
    return connection;
  }

  async upsertGoogleCalendarConnection(connection: Omit<GoogleCalendarConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleCalendarConnection> {
    const existing = await this.getGoogleCalendarConnection(connection.userId);
    if (existing) {
      const [updated] = await db.update(googleCalendarConnections)
        .set({ ...connection, updatedAt: new Date() })
        .where(eq(googleCalendarConnections.userId, connection.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(googleCalendarConnections).values(connection).returning();
    return created;
  }

  async deleteGoogleCalendarConnection(userId: string): Promise<void> {
    await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
  }

  async getAllActiveSubscriptions(): Promise<PodcastSubscription[]> {
    return await db.select().from(podcastSubscriptions).where(eq(podcastSubscriptions.isActive, true));
  }

  // Saved Influencers
  async createSavedInfluencer(influencer: InsertSavedInfluencer): Promise<SavedInfluencer> {
    const [saved] = await db.insert(savedInfluencers).values(influencer).returning();
    return saved;
  }

  async getSavedInfluencersByUser(userId: string): Promise<SavedInfluencer[]> {
    return await db.select().from(savedInfluencers)
      .where(eq(savedInfluencers.userId, userId))
      .orderBy(desc(savedInfluencers.createdAt));
  }

  async getSavedInfluencer(id: string): Promise<SavedInfluencer | undefined> {
    const [influencer] = await db.select().from(savedInfluencers).where(eq(savedInfluencers.id, id));
    return influencer;
  }

  async updateSavedInfluencer(id: string, updates: Partial<SavedInfluencer>): Promise<SavedInfluencer | undefined> {
    const [updated] = await db.update(savedInfluencers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedInfluencers.id, id))
      .returning();
    return updated;
  }

  async deleteSavedInfluencer(id: string): Promise<void> {
    await db.delete(savedInfluencers).where(eq(savedInfluencers.id, id));
  }

  // Hashtag Monitors
  async createHashtagMonitor(monitor: InsertHashtagMonitor): Promise<HashtagMonitor> {
    const [created] = await db.insert(hashtagMonitors).values(monitor).returning();
    return created;
  }

  async getHashtagMonitorsByUser(userId: string): Promise<HashtagMonitor[]> {
    return await db.select().from(hashtagMonitors)
      .where(eq(hashtagMonitors.userId, userId))
      .orderBy(desc(hashtagMonitors.createdAt));
  }

  async updateHashtagMonitor(id: string, updates: Partial<HashtagMonitor>): Promise<HashtagMonitor | undefined> {
    const [updated] = await db.update(hashtagMonitors)
      .set(updates)
      .where(eq(hashtagMonitors.id, id))
      .returning();
    return updated;
  }

  async deleteHashtagMonitor(id: string): Promise<void> {
    await db.delete(hashtagMonitors).where(eq(hashtagMonitors.id, id));
  }

  // Influencer Searches
  async createInfluencerSearch(search: InsertInfluencerSearch): Promise<InfluencerSearch> {
    const [created] = await db.insert(influencerSearches).values(search).returning();
    return created;
  }

  async getInfluencerSearchesByUser(userId: string): Promise<InfluencerSearch[]> {
    return await db.select().from(influencerSearches)
      .where(and(eq(influencerSearches.userId, userId), eq(influencerSearches.isSaved, true)))
      .orderBy(desc(influencerSearches.createdAt));
  }

  async deleteInfluencerSearch(id: string): Promise<void> {
    await db.delete(influencerSearches).where(eq(influencerSearches.id, id));
  }

  // Connected Social Accounts
  async createConnectedSocialAccount(account: InsertConnectedSocialAccount): Promise<ConnectedSocialAccount> {
    const [created] = await db.insert(connectedSocialAccounts).values(account).returning();
    return created;
  }

  async getConnectedSocialAccountsByUser(userId: string): Promise<ConnectedSocialAccount[]> {
    return await db.select().from(connectedSocialAccounts)
      .where(eq(connectedSocialAccounts.userId, userId))
      .orderBy(desc(connectedSocialAccounts.createdAt));
  }

  async getConnectedSocialAccount(id: string): Promise<ConnectedSocialAccount | undefined> {
    const [account] = await db.select().from(connectedSocialAccounts)
      .where(eq(connectedSocialAccounts.id, id));
    return account;
  }

  async updateConnectedSocialAccount(id: string, updates: Partial<ConnectedSocialAccount>): Promise<ConnectedSocialAccount | undefined> {
    const [updated] = await db.update(connectedSocialAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(connectedSocialAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteConnectedSocialAccount(id: string): Promise<void> {
    await db.delete(connectedSocialAccounts).where(eq(connectedSocialAccounts.id, id));
  }

  // Social Monitoring Alerts
  async createSocialMonitoringAlert(alert: InsertSocialMonitoringAlert): Promise<SocialMonitoringAlert> {
    const [created] = await db.insert(socialMonitoringAlerts).values(alert).returning();
    return created;
  }

  async getSocialMonitoringAlertsByUser(userId: string): Promise<SocialMonitoringAlert[]> {
    return await db.select().from(socialMonitoringAlerts)
      .where(eq(socialMonitoringAlerts.userId, userId))
      .orderBy(desc(socialMonitoringAlerts.detectedAt));
  }

  async getUnresolvedAlertsByUser(userId: string): Promise<SocialMonitoringAlert[]> {
    return await db.select().from(socialMonitoringAlerts)
      .where(and(
        eq(socialMonitoringAlerts.userId, userId),
        eq(socialMonitoringAlerts.isResolved, false)
      ))
      .orderBy(desc(socialMonitoringAlerts.detectedAt));
  }

  async updateSocialMonitoringAlert(id: string, updates: Partial<SocialMonitoringAlert>): Promise<SocialMonitoringAlert | undefined> {
    const [updated] = await db.update(socialMonitoringAlerts)
      .set(updates)
      .where(eq(socialMonitoringAlerts.id, id))
      .returning();
    return updated;
  }

  // Creator Social Profiles
  async createCreatorSocialProfile(profile: InsertCreatorSocialProfile): Promise<CreatorSocialProfile> {
    const [created] = await db.insert(creatorSocialProfiles).values(profile).returning();
    return created;
  }

  async getCreatorSocialProfilesByUser(userId: string): Promise<CreatorSocialProfile[]> {
    return await db.select().from(creatorSocialProfiles)
      .where(eq(creatorSocialProfiles.userId, userId))
      .orderBy(asc(creatorSocialProfiles.platform));
  }

  async getCreatorSocialProfile(id: string): Promise<CreatorSocialProfile | undefined> {
    const [profile] = await db.select().from(creatorSocialProfiles).where(eq(creatorSocialProfiles.id, id));
    return profile;
  }

  async getCreatorSocialProfileByPlatform(userId: string, platform: string): Promise<CreatorSocialProfile | undefined> {
    const [profile] = await db.select().from(creatorSocialProfiles)
      .where(and(
        eq(creatorSocialProfiles.userId, userId),
        eq(creatorSocialProfiles.platform, platform)
      ));
    return profile;
  }

  async updateCreatorSocialProfile(id: string, updates: Partial<CreatorSocialProfile>): Promise<CreatorSocialProfile | undefined> {
    const [updated] = await db.update(creatorSocialProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(creatorSocialProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteCreatorSocialProfile(id: string): Promise<void> {
    await db.delete(creatorSocialProfiles).where(eq(creatorSocialProfiles.id, id));
  }

  // Email Contacts
  async getContactNotes(contactId: string, userId: string): Promise<ContactNote[]> {
    return await db.select().from(contactNotes)
      .where(and(eq(contactNotes.contactId, contactId), eq(contactNotes.userId, userId)))
      .orderBy(desc(contactNotes.createdAt));
  }

  async createContactNote(note: InsertContactNote): Promise<ContactNote> {
    const [created] = await db.insert(contactNotes).values(note).returning();
    return created;
  }

  async getEmailContacts(userId: string): Promise<EmailContact[]> {
    return await db.select().from(emailContacts)
      .where(eq(emailContacts.userId, userId))
      .orderBy(desc(emailContacts.createdAt));
  }

  async getEmailContact(id: string): Promise<EmailContact | undefined> {
    const [contact] = await db.select().from(emailContacts).where(eq(emailContacts.id, id));
    return contact;
  }

  async createEmailContact(contact: InsertEmailContact): Promise<EmailContact> {
    const [created] = await db.insert(emailContacts).values(contact).returning();
    return created;
  }

  async updateEmailContact(id: string, userId: string, updates: Partial<EmailContact>): Promise<EmailContact | undefined> {
    const [updated] = await db.update(emailContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailContacts.id, id), eq(emailContacts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteEmailContact(id: string, userId: string): Promise<void> {
    await db.delete(emailContacts).where(and(eq(emailContacts.id, id), eq(emailContacts.userId, userId)));
  }

  // Guest Pipeline
  async getGuestPipelineEntriesByPodcast(podcastId: string): Promise<GuestPipelineEntry[]> {
    return await db.select().from(guestPipelineEntries)
      .where(eq(guestPipelineEntries.podcastId, podcastId))
      .orderBy(desc(guestPipelineEntries.createdAt));
  }

  async createGuestPipelineEntry(entry: InsertGuestPipelineEntry): Promise<GuestPipelineEntry> {
    const [created] = await db.insert(guestPipelineEntries).values(entry).returning();
    return created;
  }

  async updateGuestPipelineEntry(id: string, updates: Partial<GuestPipelineEntry>): Promise<GuestPipelineEntry | undefined> {
    const [updated] = await db.update(guestPipelineEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(guestPipelineEntries.id, id))
      .returning();
    return updated;
  }

  async deleteGuestPipelineEntry(id: string): Promise<void> {
    await db.delete(guestPipelineEntries).where(eq(guestPipelineEntries.id, id));
  }

  async getSavedCreatorsByUser(userId: string): Promise<SavedCreator[]> {
    return await db.select().from(savedCreators)
      .where(eq(savedCreators.userId, userId))
      .orderBy(desc(savedCreators.createdAt));
  }

  async createSavedCreator(entry: InsertSavedCreator): Promise<SavedCreator> {
    const [created] = await db.insert(savedCreators).values(entry).returning();
    return created;
  }

  async deleteSavedCreator(id: string, userId: string): Promise<void> {
    await db.delete(savedCreators).where(and(eq(savedCreators.id, id), eq(savedCreators.userId, userId)));
  }

  // Media Library
  async createLiveSession(session: InsertLiveSession): Promise<LiveSession> {
    const [created] = await db.insert(liveSessions).values(session).returning();
    return created;
  }

  async getLatestLiveSession(userId: string): Promise<LiveSession | undefined> {
    const [session] = await db.select().from(liveSessions)
      .where(eq(liveSessions.userId, userId))
      .orderBy(desc(liveSessions.startedAt))
      .limit(1);
    return session;
  }

  async getLiveSession(id: string): Promise<LiveSession | undefined> {
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    return session;
  }

  async getLiveSessionByInviteCode(code: string): Promise<LiveSession | undefined> {
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.guestInviteCode, code));
    return session;
  }

  async updateLiveSession(id: string, updates: Partial<LiveSession>): Promise<LiveSession | undefined> {
    const [updated] = await db.update(liveSessions).set(updates).where(eq(liveSessions.id, id)).returning();
    return updated;
  }

  async createLiveMark(mark: InsertLiveMark): Promise<LiveMark> {
    const [created] = await db.insert(liveMarks).values(mark).returning();
    return created;
  }

  async getLiveMarks(sessionId: string): Promise<LiveMark[]> {
    return await db.select().from(liveMarks)
      .where(eq(liveMarks.sessionId, sessionId))
      .orderBy(liveMarks.atSeconds);
  }

  async getLiveMark(id: string): Promise<LiveMark | undefined> {
    const [mark] = await db.select().from(liveMarks).where(eq(liveMarks.id, id));
    return mark;
  }

  async updateLiveMark(id: string, updates: Partial<LiveMark>): Promise<LiveMark | undefined> {
    const [updated] = await db.update(liveMarks).set(updates).where(eq(liveMarks.id, id)).returning();
    return updated;
  }

  async getMediaLibraryItemsByUser(userId: string): Promise<MediaLibraryItem[]> {
    return await db.select().from(mediaLibraryItems)
      .where(eq(mediaLibraryItems.userId, userId))
      .orderBy(desc(mediaLibraryItems.postedAt));
  }

  async createMediaLibraryItem(item: InsertMediaLibraryItem): Promise<MediaLibraryItem | undefined> {
    // Re-imports of the same post are no-ops (unique on user+platform+external id).
    const [created] = await db.insert(mediaLibraryItems).values(item).onConflictDoNothing().returning();
    return created;
  }

  async deleteMediaLibraryItem(id: string, userId: string): Promise<void> {
    await db.delete(mediaLibraryItems).where(and(eq(mediaLibraryItems.id, id), eq(mediaLibraryItems.userId, userId)));
  }

  // Email Templates
  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [created] = await db.insert(emailTemplates).values(template).returning();
    return created;
  }

  async deleteEmailTemplate(id: string, userId: string): Promise<void> {
    await db.delete(emailTemplates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }

  // Email Campaigns
  async getEmailCampaigns(userId: string): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns)
      .where(eq(emailCampaigns.userId, userId))
      .orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async updateEmailCampaign(id: string, userId: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updated] = await db.update(emailCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)))
      .returning();
    return updated;
  }

  // Video Analysis
  async createVideoAnalysis(analysis: InsertVideoAnalysis): Promise<VideoAnalysis> {
    const [created] = await db.insert(videoAnalyses).values(analysis).returning();
    return created;
  }

  async getVideoAnalysesByUser(userId: string): Promise<VideoAnalysis[]> {
    return await db.select().from(videoAnalyses)
      .where(eq(videoAnalyses.userId, userId))
      .orderBy(desc(videoAnalyses.createdAt));
  }

  async getVideoAnalysis(id: string): Promise<VideoAnalysis | undefined> {
    const [analysis] = await db.select().from(videoAnalyses).where(eq(videoAnalyses.id, id));
    return analysis;
  }

  async updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis | undefined> {
    const [updated] = await db.update(videoAnalyses)
      .set(updates)
      .where(eq(videoAnalyses.id, id))
      .returning();
    return updated;
  }

  // Upload-Post Accounts
  async createUploadPostAccount(account: InsertUploadPostAccount): Promise<UploadPostAccount> {
    const [created] = await db.insert(uploadPostAccounts).values(account).returning();
    return created;
  }

  async getUploadPostAccountsByUser(userId: string): Promise<UploadPostAccount[]> {
    return await db.select().from(uploadPostAccounts)
      .where(eq(uploadPostAccounts.userId, userId))
      .orderBy(desc(uploadPostAccounts.createdAt));
  }

  async getUploadPostAccount(id: string): Promise<UploadPostAccount | undefined> {
    const [account] = await db.select().from(uploadPostAccounts).where(eq(uploadPostAccounts.id, id));
    return account;
  }

  async updateUploadPostAccount(id: string, updates: Partial<UploadPostAccount>): Promise<UploadPostAccount | undefined> {
    const [updated] = await db.update(uploadPostAccounts)
      .set(updates)
      .where(eq(uploadPostAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteUploadPostAccount(id: string): Promise<void> {
    await db.delete(uploadPostAccounts).where(eq(uploadPostAccounts.id, id));
  }

  async deleteUploadPostAccountsByUser(userId: string): Promise<void> {
    await db.delete(uploadPostAccounts).where(eq(uploadPostAccounts.userId, userId));
  }

  // Upload-Post Posts
  async createUploadPostPost(post: InsertUploadPostPost): Promise<UploadPostPost> {
    const [created] = await db.insert(uploadPostPosts).values(post).returning();
    return created;
  }

  async getUploadPostPostsByUser(userId: string): Promise<UploadPostPost[]> {
    return await db.select().from(uploadPostPosts)
      .where(eq(uploadPostPosts.userId, userId))
      .orderBy(desc(uploadPostPosts.createdAt));
  }

  async getUploadPostPost(id: string): Promise<UploadPostPost | undefined> {
    const [post] = await db.select().from(uploadPostPosts).where(eq(uploadPostPosts.id, id));
    return post;
  }

  async getUploadPostPostByExternalId(externalId: string): Promise<UploadPostPost | undefined> {
    const [post] = await db.select().from(uploadPostPosts)
      .where(eq(uploadPostPosts.uploadPostPostId, externalId));
    return post;
  }

  async updateUploadPostPost(id: string, updates: Partial<UploadPostPost>): Promise<UploadPostPost | undefined> {
    const [updated] = await db.update(uploadPostPosts)
      .set(updates)
      .where(eq(uploadPostPosts.id, id))
      .returning();
    return updated;
  }

  // Admin Creator List
  async createAdminCreator(creator: InsertAdminCreator): Promise<AdminCreator> {
    const [created] = await db.insert(adminCreatorList).values(creator).returning();
    return created;
  }

  async getAdminCreators(): Promise<AdminCreator[]> {
    return await db.select().from(adminCreatorList)
      .orderBy(desc(adminCreatorList.createdAt));
  }

  async getAdminCreator(id: string): Promise<AdminCreator | undefined> {
    const [creator] = await db.select().from(adminCreatorList).where(eq(adminCreatorList.id, id));
    return creator;
  }

  async updateAdminCreator(id: string, updates: Partial<AdminCreator>): Promise<AdminCreator | undefined> {
    const [updated] = await db.update(adminCreatorList)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminCreatorList.id, id))
      .returning();
    return updated;
  }

  async deleteAdminCreator(id: string): Promise<void> {
    await db.delete(adminCreatorList).where(eq(adminCreatorList.id, id));
  }
}

export const storage = new DatabaseStorage();
