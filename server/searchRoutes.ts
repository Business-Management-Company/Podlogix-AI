import type { Express } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import { emailContacts, episodes, mediaLibraryItems, podcasts, studios } from "@shared/schema";
import { isAuthenticated } from "./replit_integrations/auth";

/**
 * Site-wide search over the creator's own data. One query, grouped results,
 * everything scoped to the signed-in user — shows, episodes, media, studios,
 * and guest contacts. Static pages and Help Center articles are matched
 * client-side (they live in the bundle), so this route only handles what's
 * in the database.
 */
export function registerSearchRoutes(app: Express) {
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const q = String(req.query.q ?? "").trim().slice(0, 80);
      if (q.length < 2) return res.json({ shows: [], episodes: [], media: [], studios: [], guests: [] });
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;

      const [shows, eps, media, studioRows, guests] = await Promise.all([
        db.select({ id: podcasts.id, title: podcasts.title })
          .from(podcasts)
          .where(and(eq(podcasts.userId, userId), ilike(podcasts.title, like)))
          .limit(5),
        db.select({ id: episodes.id, title: episodes.title, podcastId: episodes.podcastId, status: episodes.status })
          .from(episodes)
          .innerJoin(podcasts, eq(episodes.podcastId, podcasts.id))
          .where(and(eq(podcasts.userId, userId), ilike(episodes.title, like)))
          .limit(6),
        db.select({ id: mediaLibraryItems.id, caption: mediaLibraryItems.caption, mediaType: mediaLibraryItems.mediaType, platform: mediaLibraryItems.platform })
          .from(mediaLibraryItems)
          .where(and(eq(mediaLibraryItems.userId, userId), ilike(sql`coalesce(${mediaLibraryItems.caption}, '')`, like)))
          .limit(6),
        db.select({ id: studios.id, name: studios.name })
          .from(studios)
          .where(and(eq(studios.userId, userId), ilike(studios.name, like)))
          .limit(4),
        db.select({ id: emailContacts.id, firstName: emailContacts.firstName, lastName: emailContacts.lastName, email: emailContacts.email })
          .from(emailContacts)
          .where(and(
            eq(emailContacts.userId, userId),
            or(
              ilike(sql`coalesce(${emailContacts.firstName}, '')`, like),
              ilike(sql`coalesce(${emailContacts.lastName}, '')`, like),
              ilike(emailContacts.email, like),
            ),
          ))
          .limit(5),
      ]);

      res.json({ shows, episodes: eps, media, studios: studioRows, guests });
    } catch (error) {
      console.error("Search failed:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });
}
