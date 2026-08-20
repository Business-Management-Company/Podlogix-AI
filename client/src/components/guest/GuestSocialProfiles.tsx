import React from "react";
import { ExternalLink, Globe2 } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiLinkedin,
  SiPatreon,
  SiTiktok,
  SiTwitch,
  SiWikipedia,
  SiX,
  SiYoutube,
} from "react-icons/si";
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
  compact?: boolean;
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

const PLATFORM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  linkedin: SiLinkedin,
  patreon: SiPatreon,
  tiktok: SiTiktok,
  twitch: SiTwitch,
  twitter: SiX,
  wikipedia: SiWikipedia,
  x: SiX,
  youtube: SiYoutube,
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
  linkedin: "text-[#0A66C2]",
  patreon: "text-[#FF424D]",
  tiktok: "text-zinc-950",
  twitch: "text-[#9146FF]",
  twitter: "text-zinc-950",
  x: "text-zinc-950",
  youtube: "text-[#FF0000]",
};

function PlatformIcon({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  if (normalized === "website") return <Globe2 className="h-4 w-4 text-zinc-500" aria-hidden="true" />;
  const Icon = PLATFORM_ICON[normalized] ?? Globe2;
  return <Icon className={`h-4 w-4 ${PLATFORM_COLOR[normalized] ?? "text-zinc-500"}`} aria-hidden="true" />;
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
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950"
        >
          <PlatformIcon platform={platform} />
          {socialProfileSummary(platform, url)}
          <ExternalLink className="h-3 w-3 text-zinc-400" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export function GuestSocialProfiles({ socialLinks, hostedPodcasts = [], compact = false }: GuestSocialProfilesProps) {
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
    <section aria-label="Social profiles" className={compact ? "space-y-2" : undefined}>
      {compact ? <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Social profiles</p> : <SectionHeader title="Social profiles" />}
      <div className={`space-y-2 ${compact ? "" : "rounded-xl border border-zinc-200 bg-zinc-50 p-3"}`}>
        {personalLinks.length > 0 ? (
          <div className="space-y-2">
            {hostedSources.length > 0 ? <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Personal</p> : null}
            <SocialLinkButtons links={personalLinks} />
          </div>
        ) : null}
        {hostedSources.map((source) => (
          <div key={source.podcastId} className="space-y-2 border-t border-zinc-200 pt-3 first:border-0 first:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Via {source.podcastTitle}</p>
            <SocialLinkButtons links={source.officialLinks} />
          </div>
        ))}
      </div>
    </section>
  );
}
