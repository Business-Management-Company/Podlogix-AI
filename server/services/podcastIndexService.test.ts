import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isPodcastIndexConfigured, PodcastIndexError, probePodcastIndex } from "./podcastIndexService";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.PODCAST_INDEX_API_KEY;
const originalApiSecret = process.env.PODCAST_INDEX_API_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("PODCAST_INDEX_API_KEY", originalApiKey);
  restoreEnv("PODCAST_INDEX_API_SECRET", originalApiSecret);
});

test("normalizes a read-only key-and-secret capability probe", async () => {
  process.env.PODCAST_INDEX_API_KEY = "test-read-only-key";
  process.env.PODCAST_INDEX_API_SECRET = "test-read-only-secret";
  const observedHeaders: Headers[] = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    observedHeaders.push(headers);

    if (url.pathname.endsWith("/search/byterm")) {
      return jsonResponse({
        status: "true",
        feeds: [{
          id: 42,
          podcastGuid: "feed-guid",
          title: "Test Show",
          author: "Test Author",
          ownerName: "Test Owner",
          url: "https://example.com/feed.xml",
          link: "https://example.com",
          categories: { "1": "Technology" },
          episodeCount: 12,
        }],
      });
    }
    if (url.pathname.endsWith("/episodes/byfeedid")) {
      return jsonResponse({
        status: "true",
        items: [{
          id: 99,
          feedId: 42,
          feedTitle: "Test Show",
          title: "Episode One",
          enclosureUrl: "https://example.com/episode.mp3",
          datePublished: 1_700_000_000,
          chaptersUrl: "https://example.com/chapters.json",
          transcripts: [{ url: "https://example.com/transcript.vtt", type: "text/vtt" }],
          persons: [{ name: "Alex Guest", role: "guest", group: "cast" }],
          socialInteract: [{ uri: "https://social.example/post/1", protocol: "activitypub" }],
        }],
      });
    }
    if (url.pathname.endsWith("/search/byperson")) {
      return jsonResponse({ status: "true", items: [{ id: 100, title: "Guest Appearance", feedTitle: "Another Show" }] });
    }
    if (url.pathname.endsWith("/podcasts/trending")) {
      return jsonResponse({ status: "true", feeds: [{ id: 7, title: "Trending Show", trendScore: 88 }] });
    }
    if (url.pathname.endsWith("/categories/list")) {
      return jsonResponse({ status: "true", feeds: [{ id: 1, name: "Technology" }] });
    }
    return jsonResponse({ status: "false", description: "Unexpected test request" }, 500);
  };

  const result = await probePodcastIndex("technology", "Alex Guest", 3);

  assert.equal(result.authMode, "legacy-key-secret");
  assert.equal(result.podcasts[0]?.title, "Test Show");
  assert.equal(result.podcasts[0]?.ownerName, "Test Owner");
  assert.equal(result.sampleEpisodes[0]?.people[0]?.name, "Alex Guest");
  assert.equal(result.sampleEpisodes[0]?.transcripts[0]?.type, "text/vtt");
  assert.equal(result.coverage.episodesWithTranscripts, 1);
  assert.equal(result.coverage.episodesWithSocialLinks, 1);
  assert.deepEqual(result.categories, [{ id: 1, name: "Technology" }]);
  assert.ok(observedHeaders.length >= 5);
  assert.ok(observedHeaders.every((headers) => headers.get("X-Auth-Key") === "test-read-only-key"));
  assert.ok(observedHeaders.every((headers) => /^\d+$/.test(headers.get("X-Auth-Date") ?? "")));
  assert.ok(observedHeaders.every((headers) => /^[a-f0-9]{40}$/.test(headers.get("Authorization") ?? "")));
});

test("requires the API secret before making a provider request", async () => {
  process.env.PODCAST_INDEX_API_KEY = "key-without-secret";
  delete process.env.PODCAST_INDEX_API_SECRET;
  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({ status: "true", feeds: [] });
  };

  assert.equal(isPodcastIndexConfigured(), false);
  await assert.rejects(
    () => probePodcastIndex("technology", "Alex Guest", 1),
    (error: unknown) => error instanceof PodcastIndexError && error.code === "NOT_CONFIGURED",
  );
  assert.equal(fetchCalled, false);
});

test("reports an authentication failure without including the configured key", async () => {
  process.env.PODCAST_INDEX_API_KEY = "do-not-leak-this-key";
  process.env.PODCAST_INDEX_API_SECRET = "do-not-leak-this-secret";
  globalThis.fetch = async () => jsonResponse({ message: "Forbidden" }, 403);

  await assert.rejects(
    () => probePodcastIndex("technology", "Alex Guest", 1),
    (error: unknown) => {
      assert.ok(error instanceof PodcastIndexError);
      assert.equal(error.code, "AUTH_FAILED");
      assert.equal(error.message.includes("do-not-leak-this-key"), false);
      assert.equal(error.message.includes("do-not-leak-this-secret"), false);
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
