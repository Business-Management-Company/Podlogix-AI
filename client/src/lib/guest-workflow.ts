export const GUEST_STAGES = [
  { id: "prospect", label: "Prospect", chip: "bg-zinc-100 text-zinc-600" },
  { id: "invited", label: "Invited", chip: "bg-amber-100 text-amber-800" },
  { id: "booked", label: "Booked", chip: "bg-blue-100 text-blue-800" },
  { id: "recorded", label: "Recorded", chip: "bg-purple-100 text-purple-800" },
  { id: "published", label: "Published", chip: "bg-emerald-100 text-emerald-800" },
  { id: "follow_up", label: "Follow up", chip: "bg-orange-100 text-orange-800" },
  { id: "alumni", label: "Alumni", chip: "bg-slate-100 text-slate-600" },
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
