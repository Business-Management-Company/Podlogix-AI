import { ExternalLink } from "lucide-react";
import { SectionHeader } from "@/components/kit";
import { socialProfileSummary } from "@/lib/guest-workflow";

interface GuestSocialProfilesProps {
  socialLinks?: Record<string, string | null | undefined> | null;
}

const PLATFORM_ORDER = [
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

export function GuestSocialProfiles({ socialLinks }: GuestSocialProfilesProps) {
  const links = Object.entries(socialLinks ?? {})
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .sort(([left], [right]) => platformRank(left) - platformRank(right));

  if (links.length === 0) return null;

  return (
    <section aria-label="Social profiles">
      <SectionHeader title="Social profiles" />
      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        {links.map(([platform, url]) => (
          <a
            key={platform}
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
    </section>
  );
}
