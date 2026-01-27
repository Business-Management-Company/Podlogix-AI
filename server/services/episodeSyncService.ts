import { storage } from "../storage";
import { parseFeed } from "./rssService";
import { transcribeEpisode, processEpisodeBriefing } from "./briefingService";
import type { PodcastSubscription, SubscriptionEpisode } from "@shared/schema";

export async function syncEpisodesForSubscription(subscription: PodcastSubscription): Promise<number> {
  if (!subscription.feedUrl || subscription.feedUrl.startsWith('https://open.spotify.com')) {
    return 0;
  }

  try {
    const feed = await parseFeed(subscription.feedUrl);
    const existingEpisodes = await storage.getSubscriptionEpisodesBySubscription(subscription.id);
    const existingGuids = new Set(existingEpisodes.map((e: SubscriptionEpisode) => e.guid));
    
    let newCount = 0;
    for (const episode of feed.episodes.slice(0, 20)) {
      if (!episode.guid || existingGuids.has(episode.guid)) {
        continue;
      }
      
      await storage.createSubscriptionEpisode({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        duration: episode.duration,
        publishedAt: episode.publishedAt,
        guid: episode.guid,
      });
      newCount++;
    }

    await storage.updatePodcastSubscription(subscription.id, {
      lastCheckedAt: new Date(),
      latestEpisodeAt: feed.episodes[0]?.publishedAt || undefined,
    });

    return newCount;
  } catch (error) {
    console.error(`Error syncing episodes for ${subscription.title}:`, error);
    return 0;
  }
}

export async function syncAllSubscriptionsForUser(userId: string): Promise<{ synced: number; newEpisodes: number }> {
  const subscriptions = await storage.getPodcastSubscriptionsByUserId(userId);
  let totalNew = 0;
  
  for (const sub of subscriptions) {
    if (sub.isActive) {
      const newCount = await syncEpisodesForSubscription(sub);
      totalNew += newCount;
    }
  }
  
  return { synced: subscriptions.length, newEpisodes: totalNew };
}

export async function processAutoBriefingsForUser(userId: string, maxEpisodes = 3): Promise<{ processed: number; briefings: number }> {
  const interests = await storage.getUserInterests(userId);
  if (interests.length === 0) {
    return { processed: 0, briefings: 0 };
  }

  const episodes = await storage.getSubscriptionEpisodesByUser(userId);
  const pendingEpisodes = episodes.filter(
    (e: SubscriptionEpisode) => e.transcriptStatus === 'pending' && e.audioUrl
  ).slice(0, maxEpisodes);

  let processed = 0;
  let briefingsCreated = 0;

  for (const episode of pendingEpisodes) {
    try {
      const transcript = await transcribeEpisode(episode.id, userId);
      
      if (transcript) {
        processed++;
        
        await processEpisodeBriefing(episode.id, userId);
        briefingsCreated++;
      }
    } catch (error) {
      console.error(`Error processing episode ${episode.id}:`, error);
    }
  }

  return { processed, briefings: briefingsCreated };
}

export async function runDailyBriefingJob(): Promise<void> {
  console.log('Starting daily briefing job...');
  
  const allSubscriptions = await storage.getAllActiveSubscriptions();
  const userIdSet = new Set<string>();
  for (const sub of allSubscriptions) {
    userIdSet.add(sub.userId);
  }
  const userIds = Array.from(userIdSet);
  
  for (const userId of userIds) {
    try {
      const syncResult = await syncAllSubscriptionsForUser(userId);
      console.log(`User ${userId}: Synced ${syncResult.synced} subscriptions, ${syncResult.newEpisodes} new episodes`);
      
      if (syncResult.newEpisodes > 0) {
        const briefingResult = await processAutoBriefingsForUser(userId);
        console.log(`User ${userId}: Processed ${briefingResult.processed} episodes, ${briefingResult.briefings} briefings`);
      }
    } catch (error) {
      console.error(`Error in daily job for user ${userId}:`, error);
    }
  }
  
  console.log('Daily briefing job completed');
}
