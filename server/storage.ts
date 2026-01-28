import { db } from "./db";
import { 
  subscribers, messages, identityAssets, profiles, profileLinks, podcasts, rssFeeds, distributionChannels, channelSubmissions,
  podcastSubscriptions, subscriptionEpisodes, userInterests, episodeBriefings, notifications, spotifyConnections,
  savedInfluencers, hashtagMonitors, influencerSearches, connectedSocialAccounts, socialMonitoringAlerts, creatorSocialProfiles,
  type Subscriber, type InsertSubscriber, type Message, type InsertMessage, type IdentityAsset, type InsertIdentityAsset,
  type Profile, type InsertProfile, type ProfileLink, type InsertProfileLink, type Podcast, type InsertPodcast,
  type RssFeed, type InsertRssFeed, type DistributionChannel, type ChannelSubmission, type InsertChannelSubmission,
  type PodcastSubscription, type InsertPodcastSubscription, type SubscriptionEpisode, type InsertSubscriptionEpisode,
  type UserInterest, type InsertUserInterest, type EpisodeBriefing, type InsertEpisodeBriefing,
  type Notification, type InsertNotification, type SpotifyConnection,
  type SavedInfluencer, type InsertSavedInfluencer, type HashtagMonitor, type InsertHashtagMonitor,
  type InfluencerSearch, type InsertInfluencerSearch,
  type ConnectedSocialAccount, type InsertConnectedSocialAccount,
  type SocialMonitoringAlert, type InsertSocialMonitoringAlert,
  type CreatorSocialProfile, type InsertCreatorSocialProfile
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
  // Podcasts
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getPodcastsByUserId(userId: string): Promise<Podcast[]>;
  getPodcast(id: string): Promise<Podcast | undefined>;
  updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined>;
  // RSS Feeds
  createRssFeed(feed: InsertRssFeed): Promise<RssFeed>;
  getRssFeedsByPodcast(podcastId: string): Promise<RssFeed[]>;
  updateRssFeed(id: string, updates: Partial<RssFeed>): Promise<RssFeed | undefined>;
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
}

export const storage = new DatabaseStorage();
