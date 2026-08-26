import type { Podcast, Episode } from "@shared/schema";

/**
 * Generates an Apple Podcasts–spec RSS 2.0 feed for a Podlogix-hosted podcast.
 *
 * Spec reference: https://help.apple.com/itc/podcasts_connect/#/itcb54353390
 * Required channel tags: title, description, itunes:image, language, itunes:category, itunes:explicit
 * Required item tags: title, enclosure (url, length, type)
 */

function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string | null | undefined): string {
  if (!value) return "<![CDATA[]]>";
  // Guard against CDATA injection by splitting any ]]> sequences
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds < 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Resolve stored audio/artwork paths (e.g. /objects/uploads/uuid) to absolute URLs. */
function absoluteUrl(pathOrUrl: string | null | undefined, baseUrl: string): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl.replace(/\/$/, "")}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Apple requires enclosure URLs to end in a real file extension. */
function enclosureFilename(mimeType: string | null | undefined): string {
  const ext =
    {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "m4a",
      "audio/x-m4a": "m4a",
      "audio/aac": "aac",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/ogg": "ogg",
    }[mimeType || "audio/mpeg"] || "mp3";
  return `media.${ext}`;
}

export function generatePodcastFeedXml(
  podcast: Podcast,
  publishedEpisodes: Episode[],
  baseUrl: string,
): string {
  const feedUrl = `${baseUrl.replace(/\/$/, "")}/feeds/${podcast.id}/feed.xml`;
  const siteLink = podcast.websiteUrl || `${baseUrl.replace(/\/$/, "")}/podcasts/${podcast.id}`;
  const artwork = absoluteUrl(podcast.artworkUrl, baseUrl);
  const explicit = podcast.isExplicit ? "true" : "false";
  const author = podcast.author || podcast.ownerName || "";

  const itemsXml = publishedEpisodes
    .filter((ep) => ep.audioUrl) // an item without an enclosure is invalid
    .map((ep) => {
      // Enclosures route through /e/:episodeId so every download is counted
      // before a 302 to the actual file (see the tracked enclosure route).
      const audio = `${baseUrl.replace(/\/$/, "")}/e/${ep.id}/${enclosureFilename(ep.mimeType)}`;
      const epArtwork = absoluteUrl(ep.artworkUrl, baseUrl);
      const duration = formatDuration(ep.durationSeconds);
      const pubDate = (ep.publishedAt ?? ep.createdAt ?? new Date()).toUTCString();
      const guid = ep.guid || ep.id;

      return [
        "    <item>",
        `      <title>${esc(ep.title)}</title>`,
        `      <description>${cdata(ep.showNotes || ep.description)}</description>`,
        `      <enclosure url="${esc(audio)}" length="${ep.fileSizeBytes ?? 0}" type="${esc(ep.mimeType || "audio/mpeg")}"/>`,
        `      <guid isPermaLink="false">${esc(guid)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        duration ? `      <itunes:duration>${duration}</itunes:duration>` : null,
        ep.episodeNumber != null ? `      <itunes:episode>${ep.episodeNumber}</itunes:episode>` : null,
        ep.seasonNumber != null ? `      <itunes:season>${ep.seasonNumber}</itunes:season>` : null,
        `      <itunes:episodeType>${esc(ep.episodeType || "full")}</itunes:episodeType>`,
        `      <itunes:explicit>${ep.isExplicit ? "true" : "false"}</itunes:explicit>`,
        epArtwork ? `      <itunes:image href="${esc(epArtwork)}"/>` : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
    `  <channel>`,
    `    <title>${esc(podcast.title)}</title>`,
    `    <description>${cdata(podcast.description)}</description>`,
    `    <link>${esc(siteLink)}</link>`,
    `    <language>${esc(podcast.language || "en")}</language>`,
    `    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    author ? `    <itunes:author>${esc(author)}</itunes:author>` : null,
    podcast.ownerName || podcast.ownerEmail
      ? [
          `    <itunes:owner>`,
          podcast.ownerName ? `      <itunes:name>${esc(podcast.ownerName)}</itunes:name>` : null,
          podcast.ownerEmail ? `      <itunes:email>${esc(podcast.ownerEmail)}</itunes:email>` : null,
          `    </itunes:owner>`,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    artwork ? `    <itunes:image href="${esc(artwork)}"/>` : null,
    podcast.category ? `    <itunes:category text="${esc(podcast.category)}"/>` : null,
    `    <itunes:explicit>${explicit}</itunes:explicit>`,
    podcast.copyright ? `    <copyright>${esc(podcast.copyright)}</copyright>` : null,
    itemsXml || null,
    `  </channel>`,
    `</rss>`,
  ]
    .filter(Boolean)
    .join("\n");
}
