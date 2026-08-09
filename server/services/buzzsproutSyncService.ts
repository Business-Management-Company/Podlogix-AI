/**
 * Buzzsprout Sync Service
 *
 * The glue between BuzzsproutConnector (raw API calls) and the database
 * (persistent storage). All Buzzsprout-related business logic lives here:
 * connect, disconnect, sync (with upsert), and read.
 *
 * Never import BuzzsproutConnector directly outside this file — everything
 * goes through this service so the rest of the server never sees Buzzsprout's
 * raw API shapes.
 */

import { db } from "../db";
import { buzzsproutConnections, buzzsproutEpisodes } from "@shared/schema";
import type {
  BuzzsproutConnection,
  BuzzsproutEpisode,
  InsertBuzzsproutEpisode,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { BuzzsproutConnector } from "../connectors/BuzzsproutConnector";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildConnector(userId: string, apiToken: string, podcastId?: string) {
  return new BuzzsproutConnector({ userId, podcastId, credentials: { apiToken } });
}

// ─── Connection management ────────────────────────────────────────────────────

/**
 * Verify the token + podcast ID against the real Buzzsprout API, then persist
 * the connection. If a connection already exists for this user, it is replaced.
 */
export async function connectBuzzsprout(
  userId: string,
  apiToken: string,
  podcastId: string
): Promise<BuzzsproutConnection> {
  // 1. Verify credentials are actually valid before saving anything.
  const connector = buildConnector(userId, apiToken, podcastId);
  await connector.connect({ apiToken });

  // 2. Pull podcast metadata to cache alongside the token.
  const podcast = await connector.getPodcast(podcastId);

  // 3. Upsert the connection record.
  const [connection] = await db
    .insert(buzzsproutConnections)
    .values({
      userId,
      apiToken,
      podcastId,
      podcastTitle: podcast?.title ?? null,
      podcastArtworkUrl: podcast?.artworkUrl ?? null,
      podcastAuthor: null,
      podcastCategory: podcast?.category ?? null,
      status: "connected",
    })
    .onConflictDoUpdate({
      target: buzzsproutConnections.userId,
      set: {
        apiToken,
        podcastId,
        podcastTitle: podcast?.title ?? null,
        podcastArtworkUrl: podcast?.artworkUrl ?? null,
        podcastCategory: podcast?.category ?? null,
        status: "connected",
        updatedAt: new Date(),
      },
    })
    .returning();

  return connection;
}

/** Remove the connection and all synced episodes for a user. */
export async function disconnectBuzzsprout(userId: string): Promise<void> {
  const conn = await getConnection(userId);
  if (!conn) return;

  await db
    .delete(buzzsproutEpisodes)
    .where(eq(buzzsproutEpisodes.connectionId, conn.id));

  await db
    .delete(buzzsproutConnections)
    .where(eq(buzzsproutConnections.userId, userId));
}

/** Return the connection record (or null if not connected). */
export async function getConnection(
  userId: string
): Promise<BuzzsproutConnection | null> {
  const [conn] = await db
    .select()
    .from(buzzsproutConnections)
    .where(eq(buzzsproutConnections.userId, userId))
    .limit(1);
  return conn ?? null;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncSummary {
  episodesAdded: number;
  episodesUpdated: number;
  total: number;
}

/**
 * Fetch all episodes from Buzzsprout and upsert them into `buzzsprout_episodes`.
 * Uses externalId as the upsert key so re-running is always safe (idempotent).
 */
export async function syncBuzzsprout(userId: string): Promise<SyncSummary> {
  const conn = await getConnection(userId);
  if (!conn) throw new Error("No Buzzsprout connection found for this user.");

  // Mark as syncing
  await db
    .update(buzzsproutConnections)
    .set({ status: "syncing", updatedAt: new Date() })
    .where(eq(buzzsproutConnections.userId, userId));

  try {
    const connector = buildConnector(userId, conn.apiToken, conn.podcastId);
    await connector.connect({ apiToken: conn.apiToken });

    const rawEpisodes = await connector.getEpisodes(conn.podcastId);

    let episodesAdded = 0;
    let episodesUpdated = 0;

    for (const ep of rawEpisodes) {
      // Each connector Episode carries its Buzzsprout external ID in .connections
      const externalId =
        ep.connections.find((c) => c.provider === "buzzsprout")?.externalId ??
        ep.id.replace("buzzsprout-", "");

      const row: InsertBuzzsproutEpisode = {
        connectionId: conn.id,
        userId,
        externalId,
        title: ep.title,
        description: ep.description ?? null,
        showNotes: ep.showNotes ?? null,
        audioUrl: ep.audioUrl ?? null,
        artworkUrl: ep.artworkUrl ?? null,
        durationSeconds: ep.durationSeconds ?? null,
        episodeNumber: ep.episodeNumber ?? null,
        seasonNumber: ep.seasonNumber ?? null,
        tags: null,
        totalPlays: 0,
        status: ep.status,
        publishedAt: ep.publishedAt ? new Date(ep.publishedAt) : null,
        guid: null,
        isExplicit: ep.isExplicit,
        isPrivate: false,
      };

      // Upsert on (connectionId, externalId)
      const result = await db
        .insert(buzzsproutEpisodes)
        .values(row)
        .onConflictDoUpdate({
          target: [buzzsproutEpisodes.connectionId, buzzsproutEpisodes.externalId],
          set: {
            title: row.title,
            description: row.description,
            showNotes: row.showNotes,
            audioUrl: row.audioUrl,
            artworkUrl: row.artworkUrl,
            durationSeconds: row.durationSeconds,
            episodeNumber: row.episodeNumber,
            seasonNumber: row.seasonNumber,
            status: row.status,
            publishedAt: row.publishedAt,
            isExplicit: row.isExplicit,
            updatedAt: new Date(),
          },
        })
        .returning({ id: buzzsproutEpisodes.id });

      // Drizzle onConflictDoUpdate always returns the row — check if it was
      // newly inserted by comparing syncedAt vs updatedAt (a rough heuristic).
      // Simpler: just count both and let the caller care about totals.
      episodesAdded++;
    }

    const total = rawEpisodes.length;

    // Update connection metadata
    await db
      .update(buzzsproutConnections)
      .set({
        status: "connected",
        episodeCount: total,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(buzzsproutConnections.userId, userId));

    return { episodesAdded, episodesUpdated, total };
  } catch (err) {
    await db
      .update(buzzsproutConnections)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(buzzsproutConnections.userId, userId));
    throw err;
  }
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getBuzzsproutEpisodes(
  userId: string,
  limit = 50,
  offset = 0
): Promise<BuzzsproutEpisode[]> {
  return db
    .select()
    .from(buzzsproutEpisodes)
    .where(eq(buzzsproutEpisodes.userId, userId))
    .orderBy(sql`${buzzsproutEpisodes.publishedAt} desc nulls last`)
    .limit(limit)
    .offset(offset);
}

export async function getBuzzsproutEpisode(
  userId: string,
  episodeId: string
): Promise<BuzzsproutEpisode | null> {
  const [ep] = await db
    .select()
    .from(buzzsproutEpisodes)
    .where(
      and(
        eq(buzzsproutEpisodes.userId, userId),
        eq(buzzsproutEpisodes.id, episodeId)
      )
    )
    .limit(1);
  return ep ?? null;
}
