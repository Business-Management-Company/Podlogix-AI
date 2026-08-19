import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isPodchaserConfigured, PodchaserError, probePodchaserGuest } from "./podchaserGuestService";

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
        { pcid: "452446", name: "Dr. Andrew Huberman", bio: "Neuroscientist", episodeAppearanceCount: 410 },
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
