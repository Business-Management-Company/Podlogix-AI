import assert from "node:assert/strict";
import { test } from "node:test";
import { matchGuestEpisodesToRss } from "./guestPodcastPlaybackService";
import type { PodchaserGuestEpisode } from "./podchaserGuestService";
import type { RssEpisode } from "./rssService";

const creator = { name: "Dr. Andrew Huberman", informalName: "Andrew" };

test("matches a verified Podchaser guest credit to its publisher RSS enclosure", () => {
  const verified = [guestCredit("The Science of Sleep with Andrew Huberman", "2026-08-01T12:00:00.000Z")];
  const feed = [rssEpisode({
    title: "The Science of Sleep with Dr. Andrew Huberman",
    publishedAt: new Date("2026-08-01T08:00:00.000Z"),
    mediaUrl: "https://cdn.example.com/sleep.mp3",
    mimeType: "audio/mpeg",
    mediaKind: "audio",
  })];

  const result = matchGuestEpisodesToRss(creator, verified, feed, 5);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.mediaUrl, "https://cdn.example.com/sleep.mp3");
  assert.equal(result[0]?.matchType, "verified-credit");
  assert.equal(result[0]?.mediaKind, "audio");
});

test("finds additional publisher RSS episodes by the guest's name and supports video enclosures", () => {
  const feed = [
    rssEpisode({
      title: "Andrew Huberman on focus and performance",
      publishedAt: new Date("2025-05-04T08:00:00.000Z"),
      mediaUrl: "https://cdn.example.com/huberman.mp4",
      mimeType: "video/mp4",
      mediaKind: "video",
    }),
    rssEpisode({
      title: "A different guest",
      publishedAt: new Date("2025-04-01T08:00:00.000Z"),
      mediaUrl: "https://cdn.example.com/other.mp3",
      mimeType: "audio/mpeg",
      mediaKind: "audio",
    }),
  ];

  const result = matchGuestEpisodesToRss(creator, [], feed, 5);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.mediaKind, "video");
  assert.equal(result[0]?.matchType, "rss-name-match");
});

function guestCredit(title: string, airDate: string): PodchaserGuestEpisode {
  return {
    creditId: "credit-1",
    episodeId: "episode-1",
    episodeTitle: title,
    airDate,
    podcastId: "podcast-1",
    podcastTitle: "Test Show",
    podcastImageUrl: null,
    podcastRssUrl: "https://feeds.example.com/test-show",
    roleCode: "guest",
    roleTitle: "Guest",
    characters: [],
  };
}

function rssEpisode(overrides: Partial<RssEpisode>): RssEpisode {
  return {
    title: "Untitled episode",
    description: "",
    audioUrl: null,
    mediaUrl: null,
    mimeType: null,
    mediaKind: null,
    duration: 3600,
    publishedAt: null,
    guid: "episode-guid",
    imageUrl: null,
    ...overrides,
  };
}
