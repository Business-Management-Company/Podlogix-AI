import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getPodchaserGuestAppearances,
  getPodchaserCreator,
  getPodchaserPodcastCredits,
  isPodchaserConfigured,
  PodchaserError,
  probePodchaserGuest,
  searchPodchaserCreators,
  searchPodchaserPodcasts,
} from "./podchaserGuestService";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.PODCHASER_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("PODCHASER_API_KEY", originalApiKey);
});

test("returns structured guest credits and measures Starter quota use", async () => {
  process.env.PODCHASER_API_KEY = "test-podchaser-key";
  const observedHeaders: Headers[] = [];
  const observedUrls: URL[] = [];
  let usageCalls = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    observedUrls.push(url);
    observedHeaders.push(new Headers(init?.headers));

    if (url.pathname.endsWith("/usage")) {
      usageCalls += 1;
      return jsonResponse({
        data: {
          tier: "starter",
          quota: 1000,
          used: usageCalls === 1 ? 10 : 13,
          remaining: usageCalls === 1 ? 990 : 987,
          cycle_start: "2026-08-19 00:00:00",
          cycle_end: "2026-09-18 00:00:00",
        },
      });
    }
    if (url.pathname.endsWith("/search/creators")) {
      return jsonResponse([
        { pcid: "999", name: "Andrew Huber", episodeAppearanceCount: 50 },
        {
          pcid: "452446",
          name: "Dr. Andrew Huberman",
          bio: "Neuroscientist",
          episodeAppearanceCount: 410,
          socialLinks: { twitter: "https://x.com/hubermanlab" },
        },
      ]);
    }
    if (url.pathname.endsWith("/creators/452446/episodes")) {
      return jsonResponse({
        data: [{
          id: "credit-1",
          episode: { id: "episode-1", title: "Andrew Huberman on Sleep", airDate: "2026-08-01 12:00:00" },
          podcast: { id: "podcast-1", title: "Test Show", imageUrl: "https://example.com/show.jpg" },
          role: { code: "guest", title: "Guest" },
          characters: [],
        }],
        pagination: { total_results: 17, page: 1, per_page: 10, total_pages: 2, has_more: true },
      });
    }
    if (url.pathname.endsWith("/creators/452446/podcasts")) {
      return jsonResponse({
        data: [{
          id: "credit-2",
          podcast: { id: "podcast-1", title: "Test Show", imageUrl: "https://example.com/show.jpg" },
          role: { code: "guest", title: "Guest" },
          episodeCount: 2,
          lastEpisode: { id: "episode-1", title: "Andrew Huberman on Sleep", airDate: "2026-08-01 12:00:00" },
        }],
        pagination: { total_results: 8, page: 1, per_page: 10, total_pages: 1, has_more: false },
      });
    }
    return jsonResponse({ error: { message: "Unexpected test request" } }, 500);
  };

  const result = await probePodchaserGuest("Andrew Huberman", 10);

  assert.equal(result.identityConfidence, "exact");
  assert.equal(result.selectedCreator?.id, "452446");
  assert.equal(result.selectedCreator?.episodeAppearanceCount, 410);
  assert.equal(result.selectedCreator?.socialLinks.twitter, "https://x.com/hubermanlab");
  assert.equal(result.guestEpisodes[0]?.podcastTitle, "Test Show");
  assert.equal(result.guestEpisodes[0]?.roleCode, "guest");
  assert.equal(result.guestEpisodes[0]?.airDate, "2026-08-01T12:00:00.000Z");
  assert.equal(result.guestPodcasts[0]?.episodeCount, 2);
  assert.deepEqual(result.pagination, { guestEpisodesTotal: 17, guestPodcastsTotal: 8 });
  assert.equal(result.quota.tier, "starter");
  assert.equal(result.requestsConsumed, 3);
  assert.ok(observedHeaders.every((headers) => headers.get("x-api-key") === "test-podchaser-key"));
  assert.ok(observedUrls.some((url) => url.pathname.endsWith("/search/creators") && url.searchParams.get("sort") === "appearance_count"));
  assert.ok(observedUrls.some((url) => url.pathname.endsWith("/creators/452446/episodes") && url.searchParams.get("role") === "guest"));
});

test("stages creator search before appearance requests", async () => {
  process.env.PODCHASER_API_KEY = "test-podchaser-key";
  const requestedPaths: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requestedPaths.push(url.pathname);
    if (url.pathname.endsWith("/search/creators")) {
      return jsonResponse([{ pcid: "brene", name: "Brené Brown", episodeAppearanceCount: 90 }]);
    }
    if (url.pathname.endsWith("/creators/brene/episodes")) {
      return jsonResponse({ data: [], pagination: { total_results: 44 } });
    }
    if (url.pathname.endsWith("/creators/brene/podcasts")) {
      return jsonResponse({ data: [], pagination: { total_results: 20 } });
    }
    return jsonResponse({ error: { message: "Unexpected request" } }, 500);
  };

  const search = await searchPodchaserCreators("Brené Brown", 10);

  assert.equal(search.creatorCandidates[0]?.id, "brene");
  assert.deepEqual(requestedPaths, ["/api/rest/v1/search/creators"]);

  const appearances = await getPodchaserGuestAppearances("brene", 10);

  assert.deepEqual(appearances.pagination, { guestEpisodesTotal: 44, guestPodcastsTotal: 20 });
  assert.equal(requestedPaths.length, 3);
  assert.ok(requestedPaths.some((path) => path.endsWith("/creators/brene/episodes")));
  assert.ok(requestedPaths.some((path) => path.endsWith("/creators/brene/podcasts")));
});

test("requires a configured key before making a request", async () => {
  delete process.env.PODCHASER_API_KEY;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };

  assert.equal(isPodchaserConfigured(), false);
  await assert.rejects(
    () => probePodchaserGuest("Andrew Huberman", 5),
    (error: unknown) => error instanceof PodchaserError && error.code === "NOT_CONFIGURED",
  );
  assert.equal(fetchCalled, false);
});

test("marks duplicate exact-name creator matches as possible identities", async () => {
  process.env.PODCHASER_API_KEY = "test-podchaser-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/usage")) {
      return jsonResponse({ tier: "starter", quota: 1000, used: 20, remaining: 980 });
    }
    if (url.pathname.endsWith("/search/creators")) {
      return jsonResponse([
        { pcid: "first", name: "Alex Smith", subtitle: "Host on Show One", episodeAppearanceCount: 280 },
        { pcid: "second", name: "Alex Smith", subtitle: "Guest on Show Two", episodeAppearanceCount: 70 },
      ]);
    }
    return jsonResponse({ data: [], pagination: { total_results: 0 } });
  };

  const result = await probePodchaserGuest("Alex Smith", 10);

  assert.equal(result.selectedCreator?.id, "first");
  assert.equal(result.identityConfidence, "possible");
  assert.equal(result.creatorCandidates.length, 2);
});

test("does not expose the configured key in authentication errors", async () => {
  process.env.PODCHASER_API_KEY = "do-not-leak-podchaser-key";
  globalThis.fetch = async () => jsonResponse({ error: { message: "Unauthorized" } }, 401);

  await assert.rejects(
    () => probePodchaserGuest("Andrew Huberman", 5),
    (error: unknown) => {
      assert.ok(error instanceof PodchaserError);
      assert.equal(error.code, "AUTH_FAILED");
      assert.equal(error.message.includes("do-not-leak-podchaser-key"), false);
      return true;
    },
  );
});

test("offers a ranked spelling suggestion after one controlled fallback search", async () => {
  process.env.PODCHASER_API_KEY = "test-podchaser-key";
  const queries: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    queries.push(url.searchParams.get("q") ?? "");
    if (url.searchParams.get("q") === "Andrew Humberman") {
      return jsonResponse({ data: [], pagination: { page: 1, per_page: 10, total_results: 0, total_pages: 1, has_more: false } });
    }
    return jsonResponse({
      data: [
        { pcid: "other", name: "Andrew Smith", episodeAppearanceCount: 12 },
        { pcid: "huberman", name: "Dr. Andrew Huberman", episodeAppearanceCount: 554 },
      ],
      pagination: { page: 1, per_page: 10, total_results: 2, total_pages: 1, has_more: false },
    });
  };

  const result = await searchPodchaserCreators("Andrew Humberman", 10, 1, "relevance");

  assert.deepEqual(queries, ["Andrew Humberman", "Andrew"]);
  assert.equal(result.suggestedQuery, "Dr. Andrew Huberman");
  assert.equal(result.creatorCandidates[0]?.id, "huberman");
});

test("searches podcast shows and loads internal host and guest credits", async () => {
  process.env.PODCHASER_API_KEY = "test-podchaser-key";
  const requestedPaths: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requestedPaths.push(url.pathname);
    if (url.pathname.endsWith("/search/podcasts")) {
      return jsonResponse({
        data: [{
          id: "show-1",
          title: "Huberman Lab",
          description: "A science podcast",
          imageUrl: "https://example.com/huberman.jpg",
          webUrl: "https://hubermanlab.com",
          rssUrl: "https://feeds.example.com/huberman",
          numberOfEpisodes: 411,
          avgEpisodeLength: 7200,
          daysBetweenEpisodes: 7,
          ratingAverage: 4.8,
          ratingCount: 125,
          reviewCount: 18,
          socialLinks: { youtube: "https://youtube.com/@hubermanlab", instagram: "https://instagram.com/hubermanlab" },
          socialFollowerCounts: { youtube: 7_000_000, instagram: 6_000_000 },
          latestEpisodeDate: "2026-08-10 08:00:00",
          categories: [{ title: "Science", slug: "science" }],
          hasGuests: true,
          status: "active",
          author: { name: "Scicomm Media", email: "show@example.com" },
        }],
        pagination: { page: 1, per_page: 10, total_results: 14, total_pages: 2, has_more: true },
        restricted_fields: ["audienceEstimate"],
      });
    }
    if (url.pathname.endsWith("/podcasts/show-1/credits")) {
      return jsonResponse({
        data: [{
          creator: { pcid: "huberman", name: "Dr. Andrew Huberman", imageUrl: "https://example.com/andrew.jpg" },
          role: { code: "host", title: "Host" },
          episodeCount: 410,
          lastEpisode: { id: "episode-1", title: "Latest episode", airDate: "2026-08-10 08:00:00" },
        }],
        pagination: { page: 1, per_page: 25, total_results: 142, total_pages: 6, has_more: true },
      });
    }
    if (url.pathname.endsWith("/creators/huberman")) {
      return jsonResponse({
        pcid: "huberman",
        name: "Dr. Andrew Huberman",
        socialLinks: { twitter: "https://x.com/hubermanlab" },
        episodeAppearanceCount: 554,
        followerCount: 329,
      });
    }
    return jsonResponse({ error: { message: "Unexpected request" } }, 500);
  };

  const search = await searchPodchaserPodcasts("Huberman Lab", 10, 1, "relevance");
  const credits = await getPodchaserPodcastCredits("show-1", 25);
  const creator = await getPodchaserCreator("huberman");

  assert.equal(search.podcastCandidates[0]?.title, "Huberman Lab");
  assert.equal(search.podcastCandidates[0]?.author.email, "show@example.com");
  assert.equal(search.podcastCandidates[0]?.webUrl, "https://hubermanlab.com");
  assert.equal(search.podcastCandidates[0]?.avgEpisodeLength, 7200);
  assert.equal(search.podcastCandidates[0]?.daysBetweenEpisodes, 7);
  assert.equal(search.podcastCandidates[0]?.ratingAverage, 4.8);
  assert.equal(search.podcastCandidates[0]?.socialLinks.youtube, "https://youtube.com/@hubermanlab");
  assert.equal(search.podcastCandidates[0]?.socialFollowerCounts.instagram, 6_000_000);
  assert.deepEqual(search.restrictedFields, ["audienceEstimate"]);
  assert.equal(search.pagination.totalResults, 14);
  assert.equal(credits.credits[0]?.creator.name, "Dr. Andrew Huberman");
  assert.equal(credits.credits[0]?.roleCode, "host");
  assert.equal(credits.pagination.totalResults, 142);
  assert.equal(creator.socialLinks.twitter, "https://x.com/hubermanlab");
  assert.equal(creator.followerCount, 329);
  assert.ok(requestedPaths.some((path) => path.endsWith("/search/podcasts")));
  assert.ok(requestedPaths.some((path) => path.endsWith("/podcasts/show-1/credits")));
  assert.ok(requestedPaths.some((path) => path.endsWith("/creators/huberman")));
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
