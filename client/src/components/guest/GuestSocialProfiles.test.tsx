import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuestSocialProfiles } from "./GuestSocialProfiles";

test("combines personal links with hosted-show links and labels their source", () => {
  const markup = renderToStaticMarkup(
    <GuestSocialProfiles
      socialLinks={{
        twitter: "https://x.com/hubermanlab",
        wikipedia: "https://en.wikipedia.org/wiki/Andrew_Huberman",
      }}
      hostedPodcasts={[{
        podcastId: "huberman-lab",
        podcastTitle: "Huberman Lab",
        webUrl: "https://hubermanlab.com",
        socialLinks: {
          twitter: "https://x.com/hubermanlab",
          instagram: "https://instagram.com/hubermanlab",
          youtube: "https://youtube.com/@hubermanlab",
          tiktok: "https://tiktok.com/@hubermanlab",
          facebook: "https://facebook.com/hubermanlab",
          linkedin: "https://linkedin.com/in/andrew-huberman",
        },
      }]}
    />,
  );

  assert.match(markup, /Personal/);
  assert.match(markup, /Via Huberman Lab/);
  assert.match(markup, /Official website/);
  assert.match(markup, /Instagram/);
  assert.match(markup, /YouTube/);
  assert.equal(markup.match(/href="https:\/\/x\.com\/hubermanlab"/g)?.length, 1);
});
