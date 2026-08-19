import { ExternalLink, MapPin } from "lucide-react";
import { socialProfileSummary } from "@/lib/guest-workflow";

interface GuestResearchSummaryProps {
  subtitle?: string | null;
  bio?: string | null;
  location?: string | null;
  creditedEpisodes?: number | null;
  socialLinks?: Record<string, string | null | undefined> | null;
  compact?: boolean;
}

export function GuestResearchSummary({
  subtitle,
  bio,
  location,
  creditedEpisodes,
  socialLinks,
  compact = false,
}: GuestResearchSummaryProps) {
  const links = Object.entries(socialLinks ?? {})
    .filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      {subtitle ? <p className="text-sm font-medium text-zinc-900">{subtitle}</p> : null}
      {bio ? (
        <p className={`mt-2 text-sm leading-6 text-zinc-600 ${compact ? "line-clamp-5" : ""}`}>
          {bio}
        </p>
      ) : null}
      {location || creditedEpisodes != null ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
          {location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span> : null}
          {creditedEpisodes != null ? <span>{creditedEpisodes.toLocaleString()} credited episodes across all roles</span> : null}
        </div>
      ) : null}
      {links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
            >
              {socialProfileSummary(platform, url)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
