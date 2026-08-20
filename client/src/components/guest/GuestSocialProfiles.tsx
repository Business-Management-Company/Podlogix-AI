import React from "react";
import { ExternalLink } from "lucide-react";
import { SectionHeader } from "@/components/kit";
import { socialProfileSummary } from "@/lib/guest-workflow";

interface GuestSocialProfilesProps {
  socialLinks?: Record<string, string | null | undefined> | null;
  hostedPodcasts?: Array<{
    podcastId: string;
    podcastTitle: string;
    webUrl?: string | null;
    socialLinks?: Record<string, string | null | undefined> | null;
  }>;
}

const PLATFORM_ORDER = [
  "website",
  "instagram",
  "youtube",
  "tiktok",
  "twitter",
  "linkedin",
  "facebook",
  "twitch",
  "patreon",
  "wikipedia",
];

function platformRank(platform: string): number {
  const rank = PLATFORM_ORDER.indexOf(platform.toLowerCase());
  return rank === -1 ? PLATFORM_ORDER.length : rank;
}

type SocialLink = [platform: string, url: string];

function orderedLinks(socialLinks?: Record<string, string | null | undefined> | null): SocialLink[] {
  return Object.entries(socialLinks ?? {})
    .filter((entry): entry is SocialLink => Boolean(entry[1]))
    .sort(([left], [right]) => platformRank(left) - platformRank(right));
}

function normalizedUrl(url: string): string {
  return url.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "").toLowerCase();
}

function SocialLinkButtons({ links }: { links: SocialLink[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(([platform, url]) => (
        <a
          key={`${platform}:${url}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-950"
        >
          {socialProfileSummary(platform, url)}
          <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
        </a>
      ))}
    </div>
  );
}

export function GuestSocialProfiles({ socialLinks, hostedPodcasts = [] }: GuestSocialProfilesProps) {
  const personalLinks = orderedLinks(socialLinks);
  const seenUrls = new Set(personalLinks.map(([, url]) => normalizedUrl(url)));
  const personalPlatforms = new Set(personalLinks.map(([platform]) => platform.toLowerCase()));
  const hostedSources = hostedPodcasts.flatMap((podcast) => {
    const officialLinks = orderedLinks({
      ...podcast.socialLinks,
      website: podcast.webUrl,
    }).filter(([platform, url]) => {
      const key = normalizedUrl(url);
      const normalizedPlatform = platform.toLowerCase();
      if (seenUrls.has(key) || personalPlatforms.has(normalizedPlatform)) return false;
      seenUrls.add(key);
      return true;
    });
    return officialLinks.length > 0 ? [{ ...podcast, officialLinks }] : [];
  });

  if (personalLinks.length === 0 && hostedSources.length === 0) return null;

  return (
    <section aria-label="Social profiles">
      <SectionHeader title="Social profiles" />
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        {personalLinks.length > 0 ? (
          <div className="space-y-2">
            {hostedSources.length > 0 ? <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Personal</p> : null}
            <SocialLinkButtons links={personalLinks} />
          </div>
        ) : null}
        {hostedSources.map((source) => (
          <div key={source.podcastId} className="space-y-2 border-t border-zinc-200 pt-3 first:border-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Via {source.podcastTitle}</p>
            <SocialLinkButtons links={source.officialLinks} />
          </div>
        ))}
      </div>
    </section>
  );
}
