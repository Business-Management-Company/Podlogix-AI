import assert from "node:assert/strict";
import { test } from "node:test";
import { isCountableDownload, listenerHash, parseListeningApp } from "./listenAnalytics";

// ── isCountableDownload — the IAB-lite counting rules ─────────────────────────

test("counts a plain GET with no Range header", () => {
  assert.equal(isCountableDownload("GET", undefined), true);
});

test("counts a GET requesting the start of the file", () => {
  assert.equal(isCountableDownload("GET", "bytes=0-"), true);
  assert.equal(isCountableDownload("GET", "bytes=0-1"), true);
  assert.equal(isCountableDownload("GET", "  bytes=0-500000  "), true);
});

test("does not count mid-file range requests from streaming apps", () => {
  assert.equal(isCountableDownload("GET", "bytes=500000-"), false);
  assert.equal(isCountableDownload("GET", "bytes=1-"), false);
});

test("does not count HEAD probes", () => {
  assert.equal(isCountableDownload("HEAD", undefined), false);
  assert.equal(isCountableDownload("HEAD", "bytes=0-"), false);
});

// ── parseListeningApp ─────────────────────────────────────────────────────────

test("recognizes major podcast apps", () => {
  assert.equal(
    parseListeningApp("AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X) Apple Podcasts"),
    "Apple Podcasts",
  );
  assert.equal(parseListeningApp("Spotify/8.9.42 iOS/17.5 (iPhone14,5)"), "Spotify");
  assert.equal(parseListeningApp("Overcast/3.0 (+http://overcast.fm/; iOS podcast app)"), "Overcast");
  assert.equal(parseListeningApp("Pocket Casts/7.61"), "Pocket Casts");
  assert.equal(parseListeningApp("AntennaPod/3.3.2"), "AntennaPod");
});

test("classifies browsers as Web Browser", () => {
  assert.equal(
    parseListeningApp("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"),
    "Web Browser",
  );
});

test("returns Unknown for a missing user agent and Other for an unrecognized one", () => {
  assert.equal(parseListeningApp(undefined), "Unknown");
  assert.equal(parseListeningApp(""), "Unknown");
  assert.equal(parseListeningApp("SomeBrandNewClient/1.0"), "Other");
});

// ── listenerHash ──────────────────────────────────────────────────────────────

test("is stable for the same ip+ua on the same day and never leaks the ip", () => {
  const a = listenerHash("203.0.113.7", "Spotify/8.9");
  const b = listenerHash("203.0.113.7", "Spotify/8.9");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a.includes("203"), false);
});

test("differs across devices", () => {
  const a = listenerHash("203.0.113.7", "Spotify/8.9");
  const b = listenerHash("203.0.113.8", "Spotify/8.9");
  const c = listenerHash("203.0.113.7", "Overcast/3.0");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});
