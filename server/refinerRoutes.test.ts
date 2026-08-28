import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClipCommand } from "./refinerRoutes";

test("9:16 renders 1080x1920 and trims to the span", () => {
  const r = buildClipCommand({ aspect: "9:16", startSeconds: 47, endSeconds: 57 });
  assert.equal(r.width, 1080);
  assert.equal(r.height, 1920);
  assert.equal(r.durationSeconds, 10);
  assert.match(r.command, /-ss 47\.00 -to 57\.00/);
  assert.match(r.command, /scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(r.command, /h264_nvenc/); // VPS translates to libx264
  assert.match(r.command, /loudnorm=/); // clips get mastered too
});

test("each aspect maps to the right dimensions", () => {
  assert.deepEqual([buildClipCommand({ aspect: "1:1", startSeconds: 0, endSeconds: 5 }).width, buildClipCommand({ aspect: "1:1", startSeconds: 0, endSeconds: 5 }).height], [1080, 1080]);
  assert.deepEqual([buildClipCommand({ aspect: "16:9", startSeconds: 0, endSeconds: 5 }).width, buildClipCommand({ aspect: "16:9", startSeconds: 0, endSeconds: 5 }).height], [1920, 1080]);
  assert.deepEqual([buildClipCommand({ aspect: "4:5", startSeconds: 0, endSeconds: 5 }).width, buildClipCommand({ aspect: "4:5", startSeconds: 0, endSeconds: 5 }).height], [1080, 1350]);
});

test("a zero/negative span is floored to a minimum duration", () => {
  const r = buildClipCommand({ aspect: "9:16", startSeconds: 10, endSeconds: 10 });
  assert.ok(r.durationSeconds >= 0.5);
  assert.match(r.command, /-ss 10\.00 -to 10\.50/);
});

test("negative start is clamped to zero", () => {
  const r = buildClipCommand({ aspect: "9:16", startSeconds: -3, endSeconds: 5 });
  assert.match(r.command, /-ss 0\.00 -to 5\.00/);
});
