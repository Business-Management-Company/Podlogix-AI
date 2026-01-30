import { syncAllSubscriptionsForUser } from "./episodeSyncService";
import { storage } from "../storage";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let syncIntervalId: NodeJS.Timeout | null = null;

export async function runAutoSync(): Promise<void> {
  console.log('[Scheduler] Starting automatic episode sync...');
  
  try {
    const allSubscriptions = await storage.getAllActiveSubscriptions();
    const userIdSet = new Set<string>();
    for (const sub of allSubscriptions) {
      userIdSet.add(sub.userId);
    }
    const userIds = Array.from(userIdSet);
    
    console.log(`[Scheduler] Found ${userIds.length} users with active subscriptions`);
    
    for (const userId of userIds) {
      try {
        const result = await syncAllSubscriptionsForUser(userId);
        if (result.newEpisodes > 0) {
          console.log(`[Scheduler] User ${userId}: ${result.newEpisodes} new episodes synced`);
        }
      } catch (error) {
        console.error(`[Scheduler] Error syncing for user ${userId}:`, error);
      }
    }
    
    console.log('[Scheduler] Automatic sync completed');
  } catch (error) {
    console.error('[Scheduler] Error in auto sync:', error);
  }
}

export function startAutoSyncScheduler(): void {
  if (syncIntervalId) {
    console.log('[Scheduler] Auto-sync scheduler already running');
    return;
  }
  
  console.log(`[Scheduler] Starting auto-sync scheduler (interval: ${SYNC_INTERVAL_MS / 60000} minutes)`);
  
  // Run immediately on startup after a short delay
  setTimeout(() => {
    runAutoSync().catch(err => console.error('[Scheduler] Initial sync error:', err));
  }, 10000); // Wait 10 seconds after startup
  
  // Then run periodically
  syncIntervalId = setInterval(() => {
    runAutoSync().catch(err => console.error('[Scheduler] Periodic sync error:', err));
  }, SYNC_INTERVAL_MS);
}

export function stopAutoSyncScheduler(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[Scheduler] Auto-sync scheduler stopped');
  }
}
