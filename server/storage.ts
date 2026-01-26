import { db } from "./db";
import { 
  subscribers, messages, identityAssets, profiles, profileLinks, podcasts, rssFeeds, distributionChannels, channelSubmissions,
  type Subscriber, type InsertSubscriber, type Message, type InsertMessage, type IdentityAsset, type InsertIdentityAsset,
  type Profile, type InsertProfile, type ProfileLink, type InsertProfileLink, type Podcast, type InsertPodcast,
  type RssFeed, type InsertRssFeed, type DistributionChannel, type ChannelSubmission, type InsertChannelSubmission
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  // Subscribers & Messages
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  createMessage(message: InsertMessage): Promise<Message>;
  // Identity Assets
  createIdentityAsset(asset: InsertIdentityAsset): Promise<IdentityAsset>;
  getIdentityAsset(id: string): Promise<IdentityAsset | undefined>;
  getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]>;
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
    const [asset] = await db.insert(identityAssets).values(insertAsset).returning();
    return asset;
  }

  async getIdentityAsset(id: string): Promise<IdentityAsset | undefined> {
    const [asset] = await db.select().from(identityAssets).where(eq(identityAssets.id, id));
    return asset;
  }

  async getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]> {
    return await db.select().from(identityAssets).where(eq(identityAssets.email, email));
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
}

export const storage = new DatabaseStorage();
