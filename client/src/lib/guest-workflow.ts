// Translucent tint + saturated text, not flat pastel fills — matches the
// category-badge idiom elsewhere (EmailHub's categoryColors) instead of the
// old bg-100/text-800 combo, which read as dated/candy-colored.
export const GUEST_STAGES = [
  { id: "prospect", label: "Prospect", chip: "bg-zinc-500/15 text-zinc-600" },
  { id: "invited", label: "Invited", chip: "bg-amber-500/15 text-amber-600" },
  { id: "booked", label: "Booked", chip: "bg-blue-500/15 text-blue-600" },
  { id: "recorded", label: "Recorded", chip: "bg-purple-500/15 text-purple-600" },
  { id: "published", label: "Published", chip: "bg-emerald-500/15 text-emerald-600" },
  { id: "follow_up", label: "Follow up", chip: "bg-orange-500/15 text-orange-600" },
  { id: "alumni", label: "Alumni", chip: "bg-slate-500/15 text-slate-600" },
] as const;

export type GuestStage = (typeof GUEST_STAGES)[number]["id"];

export function guestStageMeta(stage: string) {
  return GUEST_STAGES.find((item) => item.id === stage) ?? GUEST_STAGES[0];
}

export function socialProfileLabel(platform: string): string {
  const labels: Record<string, string> = {
    twitter: "X",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    patreon: "Patreon",
    twitch: "Twitch",
    wikipedia: "Wikipedia",
    website: "Official website",
  };
  return labels[platform.toLowerCase()] ?? platform;
}

export function socialProfileSummary(platform: string, url: string): string {
  const label = socialProfileLabel(platform);
  if (platform.toLowerCase() === "wikipedia") return `${label} profile found`;
  try {
    const parsedUrl = new URL(url);
    if (platform.toLowerCase() === "website") return `${label} · ${parsedUrl.hostname.replace(/^www\./, "")}`;
    const handle = parsedUrl.pathname.split("/").filter(Boolean).at(-1)?.replace(/^@/, "");
    return handle ? `${label} · @${handle}` : `${label} profile found`;
  } catch {
    return `${label} profile found`;
  }
}
