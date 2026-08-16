import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  CalendarCheck,
  Clapperboard,
  ExternalLink,
  HandCoins,
  Link2,
  Mail,
  Mic,
  MonitorPlay,
  Play,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { SiSpotify, SiApplepodcasts, SiYoutube, SiInstagram, SiTiktok, SiX, SiLinkedin, SiPatreon, SiDiscord, SiFacebook } from "react-icons/si";
import type { ProfileSection, ProfileDesignSettings } from "@shared/schema";
import { getLinkButtonStyle, getCardStyle, getPageBackground, withAlpha } from "@/lib/profile-design";

const SOCIAL_ICON_MAP: Record<string, React.ReactNode> = {
  spotify: <SiSpotify className="h-5 w-5" />,
  apple: <SiApplepodcasts className="h-5 w-5" />,
  youtube: <SiYoutube className="h-5 w-5" />,
  instagram: <SiInstagram className="h-5 w-5" />,
  tiktok: <SiTiktok className="h-5 w-5" />,
  twitter: <SiX className="h-5 w-5" />,
  linkedin: <SiLinkedin className="h-5 w-5" />,
  patreon: <SiPatreon className="h-5 w-5" />,
  discord: <SiDiscord className="h-5 w-5" />,
  facebook: <SiFacebook className="h-5 w-5" />,
};

const AVATAR_SIZE: Record<ProfileDesignSettings["profileImageSize"], number> = { s: 64, m: 88, l: 112 };

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match ? match[1] : null;
}

export interface ProfilePageRendererProps {
  displayName: string;
  username?: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  heroImageUrl?: string | null;
  heroImageFormat: string;
  isVerified?: boolean;
  socialIcons?: { platform: string; url: string }[];
  youtubeVideoUrl?: string | null;
  sections: ProfileSection[];
  design: ProfileDesignSettings;
  /** Non-interactive: renders the same markup but disables link navigation (used for the editor's live preview). */
  interactive?: boolean;
}

export function ProfilePageRenderer({
  displayName,
  username,
  headline,
  bio,
  avatarUrl,
  heroImageUrl,
  heroImageFormat,
  isVerified,
  socialIcons = [],
  youtubeVideoUrl,
  sections,
  design,
  interactive = true,
}: ProfilePageRendererProps) {
  const isDark = design.darkMode;
  const textColor = isDark ? "#F5F5F5" : "#0a0a0a";
  const mutedColor = isDark ? "#9CA3AF" : "#6B7280";
  const avatarSize = AVATAR_SIZE[design.profileImageSize] ?? AVATAR_SIZE.m;

  const open = (url?: string) => {
    if (!interactive || !url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const visibleSections = sections.filter((s) => s.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groupTitles = new Map(visibleSections.filter((s) => s.type === "section_title").map((s) => [s.id, s]));
  const topLevel = visibleSections.filter((s) => s.type === "section_title" || !s.groupId || !groupTitles.has(s.groupId));
  const childrenOf = (groupId: string) => visibleSections.filter((s) => s.type !== "section_title" && s.groupId === groupId);

  const renderLinkButton = (key: string, label: string, onClick: () => void, opts?: { imageUrl?: string; imageDisplayType?: string; description?: string }) => {
    const style = getLinkButtonStyle(design);
    const showFeatured = opts?.imageDisplayType === "featured" && opts.imageUrl;
    const showIcon = opts?.imageDisplayType === "icon" && opts.imageUrl;
    return (
      <button
        key={key}
        onClick={onClick}
        style={style}
        className="w-full overflow-hidden text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        {showFeatured && <img src={opts!.imageUrl} alt="" className="h-32 w-full object-cover" />}
        <div className="flex items-center gap-3 px-4 py-3.5">
          {showIcon && <img src={opts!.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{label}</p>
            {opts?.description && <p className="truncate text-xs opacity-75">{opts.description}</p>}
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </div>
      </button>
    );
  };

  const renderSection = (section: ProfileSection) => {
    const cfg = (section.config ?? {}) as Record<string, unknown>;
    const cardStyle = { ...getCardStyle(design), color: textColor };

    switch (section.type) {
      case "custom_links": {
        const links = Array.isArray(cfg.links) ? (cfg.links as any[]) : [];
        if (links.length === 0) return null;
        return (
          <div key={section.id} className="space-y-2.5">
            {links.map((link, i) =>
              renderLinkButton(link.id ?? `${section.id}-${i}`, link.label || "Untitled link", () => open(link.url), {
                imageUrl: link.imageUrl,
                imageDisplayType: link.imageDisplayType,
                description: link.description,
              })
            )}
          </div>
        );
      }
      case "featured_video": {
        const videoUrl = cfg.videoUrl as string | undefined;
        const ytId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
        return (
          <div key={section.id} style={cardStyle} className="overflow-hidden">
            {ytId ? (
              <button onClick={() => open(videoUrl)} className="relative block aspect-video w-full">
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="rounded-full bg-red-600 p-3 shadow-lg">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                </div>
              </button>
            ) : (
              <button onClick={() => open(videoUrl)} className="flex w-full items-center gap-3 p-4 text-left">
                <Clapperboard className="h-5 w-5 shrink-0" style={{ color: design.themeColor }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{(cfg.title as string) || "Featured video"}</p>
                  {cfg.sectionDescription ? <p className="truncate text-xs opacity-75">{cfg.sectionDescription as string}</p> : null}
                </div>
              </button>
            )}
          </div>
        );
      }
      case "podcast":
        return (
          <button key={section.id} onClick={() => open(cfg.feedUrl as string)} style={cardStyle} className="flex w-full items-center gap-3 p-4 text-left">
            <Mic className="h-5 w-5 shrink-0" style={{ color: design.themeColor }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{(cfg.displayTitle as string) || "Listen to the podcast"}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </button>
        );
      case "book_meeting":
        return renderLinkButton(section.id, (cfg.buttonLabel as string) || "Book a Meeting", () => open(cfg.calendlyUrl as string), {
          description: cfg.description as string,
        });
      case "promo_codes":
        return (
          <div key={section.id} style={cardStyle} className="p-4">
            {cfg.title ? <p className="mb-1 text-sm font-semibold">{cfg.title as string}</p> : null}
            {cfg.sectionDescription ? <p className="mb-2 text-xs opacity-75">{cfg.sectionDescription as string}</p> : null}
            <button
              onClick={() => open(cfg.promoUrl as string)}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-sm font-semibold tracking-wide"
              style={{ borderColor: design.themeColor, color: design.themeColor }}
            >
              <Ticket className="h-3.5 w-3.5" />
              {(cfg.promoCode as string) || "PROMO"}
            </button>
          </div>
        );
      case "tips":
      case "streaming_channel":
      case "books":
      case "store":
      case "blog": {
        const urlField = ({ tips: "tipsUrl", streaming_channel: "channelUrl", books: undefined, store: "storeUrl", blog: "blogUrl" } as Record<string, string | undefined>)[section.type];
        const url = urlField ? (cfg[urlField] as string | undefined) : undefined;
        const Icon = { tips: HandCoins, streaming_channel: MonitorPlay, books: BookOpen, store: ShoppingBag, blog: Mail }[section.type];
        if (!cfg.title && !url) return null;
        return (
          <button key={section.id} onClick={() => open(url)} style={cardStyle} className="flex w-full items-center gap-3 p-4 text-left">
            <Icon className="h-5 w-5 shrink-0" style={{ color: design.themeColor }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{(cfg.title as string) || "Learn more"}</p>
              {cfg.sectionDescription ? <p className="truncate text-xs opacity-75">{cfg.sectionDescription as string}</p> : null}
            </div>
          </button>
        );
      }
      default:
        return null;
    }
  };

  const heroBanner = heroImageUrl && design.showHeroImage ? (
    <div
      className={heroImageFormat === "landscape" ? "aspect-[16/6] w-full" : "aspect-[3/1] w-full"}
      style={{ backgroundImage: `url(${heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
    />
  ) : null;

  const avatarNode = design.showProfileImage ? (
    <img
      src={avatarUrl ?? undefined}
      alt={displayName}
      style={{ width: avatarSize, height: avatarSize, borderRadius: "9999px", border: `4px solid ${isDark ? "#111" : "#fff"}`, background: mutedColor }}
      className="object-cover shadow-lg"
    />
  ) : null;

  return (
    <div
      style={{ background: getPageBackground(design), color: textColor, fontFamily: design.fontFamily }}
      className="min-h-full w-full"
    >
      {heroImageFormat === "full_blend" && heroImageUrl && design.showHeroImage ? (
        <div className="relative min-h-[280px] w-full" style={{ backgroundImage: `url(${heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, transparent 0%, rgba(0,0,0,0.55) 100%)" }} />
          <div className="relative flex flex-col items-center px-6 pb-6 pt-16 text-center text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            <h1 className="flex items-center gap-1 text-xl font-bold">
              {displayName}
              {isVerified && <BadgeCheck className="h-4 w-4 text-sky-300" />}
            </h1>
            {design.showUsername && username && <p className="text-sm opacity-90">@{username}</p>}
          </div>
        </div>
      ) : (
        <>
          {heroBanner}
          <div className={`flex flex-col items-center px-6 pb-2 text-center ${heroBanner ? "-mt-10" : "pt-10"}`}>
            {avatarNode}
            <h1 className="mt-3 flex items-center gap-1 text-xl font-bold">
              {displayName}
              {isVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
            </h1>
            {design.showUsername && username && <p className="text-sm" style={{ color: mutedColor }}>@{username}</p>}
          </div>
        </>
      )}

      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 pb-10 pt-4 text-center">
        {headline && <p style={{ color: mutedColor }} className="text-sm">{headline}</p>}
        {bio && <p style={{ color: mutedColor }} className="max-w-xs text-xs leading-relaxed">{bio}</p>}

        {design.showSocialIcons !== false && socialIcons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {socialIcons.map((icon, i) => (
              <button
                key={i}
                onClick={() => open(icon.url)}
                style={{ background: isDark ? "rgba(255,255,255,0.1)" : withAlpha("#111827", "0F") }}
                className="flex h-9 w-9 items-center justify-center rounded-full"
              >
                {SOCIAL_ICON_MAP[icon.platform] || <Link2 className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}

        {youtubeVideoUrl && getYouTubeVideoId(youtubeVideoUrl) && (
          <button onClick={() => open(youtubeVideoUrl)} className="relative w-full overflow-hidden rounded-xl shadow-lg">
            <img src={`https://img.youtube.com/vi/${getYouTubeVideoId(youtubeVideoUrl)}/mqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-red-600 p-2.5 shadow-lg">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            </div>
          </button>
        )}

        <div className="w-full space-y-5">
          {topLevel.map((section) => {
            if (section.type === "section_title") {
              const style = (section.config as any)?.style ?? "heading";
              const kids = childrenOf(section.id).map(renderSection).filter(Boolean);
              return (
                <div key={section.id} className="w-full space-y-2.5">
                  {style !== "divider" && (
                    <h2 className="pt-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: mutedColor }}>
                      {section.label}
                    </h2>
                  )}
                  {style !== "heading" && <div className="h-px w-full" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb" }} />}
                  {kids}
                </div>
              );
            }
            return renderSection(section);
          })}
        </div>

        {design.showBranding && (
          <a href="/" className="mt-6 inline-flex items-center gap-2 text-xs" style={{ color: mutedColor }}>
            <div className="flex h-4 w-4 items-center justify-center rounded" style={{ background: design.themeColor }}>
              <BookMarked className="h-2.5 w-2.5 text-white" />
            </div>
            Powered by Podlogix
          </a>
        )}
      </div>
    </div>
  );
}

export function getSectionCatalogIcon(icon: string) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Type: BookMarked, Link: Link2, Clapperboard, Mic, CalendarCheck, Ticket,
    HandCoins, MonitorPlay, BookOpen, ShoppingBag, Mail,
  };
  return map[icon] ?? Link2;
}
