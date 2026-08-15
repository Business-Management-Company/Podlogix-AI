import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImg from "@assets/Seeksy_logo_1771103113779.png";
import {
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Link2,
  Share2,
  Sparkles,
  User,
  HelpCircle,
  LogOut,
  Users,
  Plug,
  Building2,
  Search,
  Bell,
  Mic,
  List,
  Megaphone,
  Settings,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Contact,
  Headphones,
  Video,
  UserPlus,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

// ─── Workspace nav model ─────────────────────────────────────────────────────
//
// One nav model instead of "modes". The rail shows the primary workspace
// destinations; the panel lists them with labels plus a lower Settings group.
// Adding a future destination (Guests, Sponsors, …) is one entry in
// WORKSPACE_PRIMARY.

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Active only on exact match (for index-style routes like /today). */
  exact?: boolean;
  /** Panel section this item renders under. Items must stay grouped consecutively — omit for a pinned, unlabeled top item (e.g. Today). */
  group?: string;
}

const WORKSPACE_PRIMARY: NavItem[] = [
  { title: "Today", url: "/today", icon: LayoutDashboard, exact: true },
  { title: "Shows", url: "/shows", icon: Mic, group: "Content" },
  { title: "Episodes", url: "/episodes", icon: List, group: "Content" },
  { title: "Listen", url: "/listener", icon: Headphones, group: "Content" },
  { title: "Audience", url: "/audience", icon: Users, group: "Growth" },
  { title: "Guests", url: "/guests", icon: UserPlus, group: "Growth" },
  { title: "Contacts", url: "/dashboard/email", icon: Contact, group: "Growth" },
  { title: "Social Hub", url: "/dashboard/social-hub", icon: Share2, group: "Growth" },
  { title: "AI Studio", url: "/dashboard/ai", icon: Sparkles, group: "Studio" },
  { title: "Video Analysis", url: "/dashboard/video-analysis", icon: Video, group: "Studio" },
  { title: "Voice Certification", url: "/dashboard/certify", icon: ShieldCheck, group: "Identity" },
  { title: "Identity Protection", url: "/identity", icon: Shield, group: "Identity" },
  { title: "Likeness Certification", url: "/dashboard/certify-likeness", icon: Fingerprint, group: "Identity" },
  { title: "Link Page", url: "/dashboard/profile", icon: Link2, group: "Settings" },
  { title: "Connected apps", url: "/connectors", icon: Plug, group: "Settings" },
  { title: "Workspace Settings", url: "/settings", icon: Settings, group: "Settings" },
];

// Rail bottom cluster — quick-access shortcuts into the Settings group above.
const RAIL_BOTTOM: RailItem[] = [
  { title: "Connected apps", icon: Plug, url: "/connectors", isActive: (leaf) => leaf?.url === "/connectors" },
  { title: "Settings", icon: Settings, url: "/settings", isActive: (leaf) => leaf?.group === "Settings" },
];

interface RailItem {
  title: string;
  icon: LucideIcon;
  /** Where clicking this rail entry navigates — the group's first child, or the item's own url. */
  url: string;
  /** Whether this rail entry is "lit" for the currently matched WORKSPACE_PRIMARY leaf. */
  isActive: (activeLeaf: NavItem | null) => boolean;
}

// The rail shows only the big-ticket destinations — Today, one icon per
// WORKSPACE_PRIMARY group, and any ungrouped standalone item. Clicking a
// group icon navigates to its first child; the panel then reveals that
// group's full item list (see `panelItems` below) instead of repeating
// every leaf in the rail too.
const RAIL_ITEMS: RailItem[] = [
  { title: "Today", icon: LayoutDashboard, url: "/today", isActive: (leaf) => leaf?.url === "/today" },
  { title: "Content", icon: Mic, url: "/shows", isActive: (leaf) => leaf?.group === "Content" },
  { title: "Growth", icon: Users, url: "/audience", isActive: (leaf) => leaf?.group === "Growth" },
  { title: "Studio", icon: Sparkles, url: "/dashboard/ai", isActive: (leaf) => leaf?.group === "Studio" },
  { title: "Identity", icon: ShieldCheck, url: "/dashboard/certify", isActive: (leaf) => leaf?.group === "Identity" },
];

/** Nav for a single show's context — shown in the panel when inside /shows/:id. */
function showNavItems(showId: string): NavItem[] {
  const base = `/shows/${showId}`;
  return [
    { title: "Overview", url: base, icon: LayoutDashboard, exact: true },
    { title: "Episodes", url: `${base}/episodes`, icon: List },
    { title: "Promotion", url: `${base}/promotion`, icon: Megaphone },
    { title: "Distribution", url: `${base}/distribution`, icon: Share2 },
    { title: "Audience", url: `${base}/audience`, icon: Users },
    { title: "Show Settings", url: `${base}/settings`, icon: Settings2 },
  ];
}

interface PodcastSummary {
  id: string;
  title: string;
  artworkUrl?: string | null;
}

interface BuzzsproutStatus {
  connected: boolean;
  connection?: {
    podcastTitle?: string | null;
    podcastArtworkUrl?: string | null;
  };
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [panelOpen, setPanelOpen] = useState(true);
  const [railExpanded, setRailExpanded] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // ── Nav mode: workspace vs. show context ──
  const showMatch = location.match(/^\/shows\/([^/]+)/);
  const showId = showMatch?.[1];
  const navMode: "workspace" | "show" = showId ? "show" : "workspace";

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/check", { credentials: "include" });
      if (!res.ok) return { isAdmin: false, isSuperAdmin: false, role: "user" };
      return res.json();
    },
    retry: 1,
  });

  // Show identity for the panel header (only fetched inside show context).
  const { data: podcastList } = useQuery<PodcastSummary[]>({
    queryKey: ["/api/podcasts"],
    enabled: isAuthenticated && navMode === "show",
  });
  const { data: buzzsproutStatus } = useQuery<BuzzsproutStatus>({
    queryKey: ["/api/connectors/buzzsprout/status"],
    enabled: isAuthenticated && navMode === "show" && showId === "buzzsprout",
  });

  const currentShow = Array.isArray(podcastList)
    ? podcastList.find((p) => p.id === showId)
    : undefined;
  const showName =
    currentShow?.title ??
    (showId === "buzzsprout"
      ? buzzsproutStatus?.connection?.podcastTitle ?? "Show"
      : "Show");
  const showArtwork =
    currentShow?.artworkUrl ??
    (showId === "buzzsprout"
      ? buzzsproutStatus?.connection?.podcastArtworkUrl ?? null
      : null);

  const isItemActive = (item: NavItem) =>
    item.exact ? location === item.url : location.startsWith(item.url);

  // Which WORKSPACE_PRIMARY leaf the current URL belongs to — drives both the
  // rail's active group icon and which group the panel expands into. Longest
  // matching prefix wins (e.g. /dashboard/social-hub over a shorter /dashboard).
  const activeLeaf: NavItem | null = (() => {
    let best: NavItem | null = null;
    for (const item of WORKSPACE_PRIMARY) {
      const matches = item.exact ? location === item.url : location.startsWith(item.url);
      if (matches && (!best || item.url.length > best.url.length)) best = item;
    }
    return best;
  })();

  // Today pinned at top, then — only when the URL is inside one of the
  // groups — that group's items. No group active (e.g. on /today or Voice
  // Certification) means the panel shows just Today; the rail alone still
  // gets you everywhere else.
  const activeGroupItems = activeLeaf?.group
    ? WORKSPACE_PRIMARY.filter((i) => i.group === activeLeaf.group)
    : [];
  const panelItems =
    navMode === "show"
      ? showNavItems(showId!)
      : [WORKSPACE_PRIMARY.find((i) => i.exact)!, ...activeGroupItems];

  const panelLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors cursor-pointer ${
      active
        ? "bg-muted text-foreground font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* ── Rail ──────────────────────────────────────────────────────────── */}
      <nav className={`flex flex-col shrink-0 bg-[#0D1B2A] border-r border-white/[0.06] z-20 transition-all duration-200 overflow-hidden ${railExpanded ? "w-44" : "w-14"}`}>

        {/* Logo row — collapse button appears here when expanded */}
        <div className={`flex items-center h-14 border-b border-white/[0.06] shrink-0 ${railExpanded ? "px-3 justify-between" : "justify-center"}`}>
          <Link href="/today" className="flex items-center gap-2.5 min-w-0">
            <img src={logoImg} alt="Podlogix" className="w-7 h-7 rounded-lg shrink-0" />
            {railExpanded && (
              <span className="text-white text-sm font-semibold truncate">Podlogix</span>
            )}
          </Link>
          {railExpanded && (
            <button
              onClick={() => setRailExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors shrink-0 ml-1"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Primary workspace icons */}
        <div className={`flex flex-col gap-1 py-3 flex-1 ${railExpanded ? "px-2" : "items-center"}`}>

          {/* Expand button — only shown when collapsed */}
          {!railExpanded && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setRailExpanded(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150 mb-1"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-[18px] w-[18px] text-slate-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Expand</TooltipContent>
            </Tooltip>
          )}

          {RAIL_ITEMS.map((item) => {
            const isActive = item.isActive(activeLeaf);
            const Icon = item.icon;
            const btn = (
              <button
                onClick={() => {
                  navigate(item.url);
                  if (!panelOpen) setPanelOpen(true);
                }}
                className={`
                  relative flex items-center h-10 rounded-xl transition-all duration-150
                  ${railExpanded ? "gap-2.5 px-3 w-full" : "justify-center w-10"}
                  ${isActive ? "bg-white/10 shadow-sm" : "hover:bg-white/[0.06]"}
                `}
                aria-label={item.title}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-500"}`} />
                {railExpanded && (
                  <span className={`text-sm truncate ${isActive ? "text-white font-medium" : "text-slate-400"}`}>
                    {item.title}
                  </span>
                )}
              </button>
            );
            return railExpanded ? (
              <div key={item.url}>{btn}</div>
            ) : (
              <Tooltip key={item.url} delayDuration={300}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className={`flex flex-col gap-1 py-3 border-t border-white/[0.06] ${railExpanded ? "px-2" : "items-center"}`}>

          {RAIL_BOTTOM.map((item) => {
            const isActive = item.isActive(activeLeaf);
            const Icon = item.icon;
            const btn = (
              <Link href={item.url}>
                <button
                  className={`
                    flex items-center h-10 rounded-xl transition-all duration-150
                    ${railExpanded ? "gap-2.5 px-3 w-full" : "justify-center w-10"}
                    ${isActive ? "bg-white/10" : "hover:bg-white/[0.06]"}
                  `}
                  aria-label={item.title}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-slate-200" : "text-slate-500"}`} />
                  {railExpanded && (
                    <span className={`text-sm truncate ${isActive ? "text-slate-200" : "text-slate-400"}`}>{item.title}</span>
                  )}
                </button>
              </Link>
            );
            return railExpanded ? (
              <div key={item.url}>{btn}</div>
            ) : (
              <Tooltip key={item.url} delayDuration={300}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Admin — only visible to admins */}
          {adminCheck?.isAdmin && (
            railExpanded ? (
              <Link href="/admin">
                <button className="flex items-center gap-2.5 px-3 w-full h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150" aria-label="Admin">
                  <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-slate-500" />
                  <span className="text-sm text-slate-400">Admin</span>
                </button>
              </Link>
            ) : (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link href="/admin">
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150" aria-label="Admin">
                      <ShieldCheck className="h-[18px] w-[18px] text-slate-500" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">Admin</TooltipContent>
              </Tooltip>
            )
          )}

          {/* User avatar */}
          <div className="mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150 ${railExpanded ? "gap-2.5 px-2 w-full" : "justify-center w-10"}`}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {railExpanded && (
                    <span className="text-sm text-slate-300 truncate">{user?.firstName || "Account"}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <Link2 className="h-4 w-4 mr-2" />
                    Edit Link Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {panelOpen && (
        <aside className="w-52 shrink-0 bg-background border-r flex flex-col z-10">

          {/* Panel header */}
          {navMode === "workspace" ? (
            <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
              <span className="text-sm font-semibold tracking-tight">Workspace</span>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Collapse panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="border-b shrink-0">
              <div className="flex items-center justify-between px-4 h-10 pt-1">
                <Link href="/shows">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All shows
                  </span>
                </Link>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Collapse panel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2.5 px-4 pb-3 pt-1">
                {showArtwork ? (
                  <img
                    src={showArtwork}
                    alt={showName}
                    className="h-8 w-8 rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-semibold tracking-tight truncate">{showName}</span>
              </div>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col">
            <div className="flex-1">
              {panelItems.map((item, idx) => {
                const Icon = item.icon;
                const prevGroup = idx > 0 ? panelItems[idx - 1].group : undefined;
                const showGroupLabel = navMode === "workspace" && item.group && item.group !== prevGroup;
                return (
                  <div key={item.url}>
                    {showGroupLabel && (
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {item.group}
                        </p>
                      </div>
                    )}
                    <Link href={item.url}>
                      <div className={panelLinkClass(isItemActive(item))}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Help — always at bottom, always shown */}
            <div className="pt-4 pb-1">
              <Link href="/help">
                <div className={panelLinkClass(location.startsWith("/help"))}>
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Help Center</span>
                </div>
              </Link>

              {/* Admin-only items — below Help */}
              {adminCheck?.isSuperAdmin && navMode === "workspace" && (
                <>
                  <div className="px-3 pt-4 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
                  </div>
                  <Link href="/admin">
                    <div className={panelLinkClass(location.startsWith("/admin") && !location.startsWith("/admin/integrations"))}>
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Admin Panel</span>
                    </div>
                  </Link>
                  <Link href="/saas-admin">
                    <div className={panelLinkClass(location.startsWith("/saas-admin"))}>
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>SaaS Portal</span>
                    </div>
                  </Link>
                  <Link href="/admin/integrations">
                    <div className={panelLinkClass(location.startsWith("/admin/integrations"))}>
                      <Plug className="h-4 w-4 shrink-0" />
                      <span>Integrations</span>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </aside>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Global top bar */}
        <header className="flex items-center h-14 px-4 border-b bg-background shrink-0 gap-3">
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Open panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Search anything..."
                className="pl-8 h-9 text-sm bg-white border border-zinc-200 shadow-sm focus-visible:ring-1 focus-visible:border-zinc-300 rounded-lg"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/help">
                  <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Help Center</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center rounded-full ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 cursor-pointer">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <Link2 className="h-4 w-4 mr-2" />
                    Edit Link Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── AI Assistant Floating Button ────────────────────────────────────── */}
      {!aiOpen && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setAiOpen(true)}
              className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
              aria-label="Open AI Assistant"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">AI Assistant</TooltipContent>
        </Tooltip>
      )}

      {/* ── AI Assistant Slide-out Panel ──────────────────────────────────── */}

      {/* Backdrop — click to close */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setAiOpen(false)}
        />
      )}

      {/* Full-height right slide-out */}
      <div
        className={`fixed inset-y-0 right-0 w-[380px] bg-background border-l shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${aiOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">AI Assistant</span>
          </div>
          <button
            onClick={() => setAiOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close AI Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Welcome / empty state */}
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12 gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
                Ask me anything about your podcast — analytics, content ideas, distribution tips, and more.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[260px] mt-2">
              {["Summarize my top episodes", "Write show notes for my last recording", "How do I grow my audience?"].map((suggestion) => (
                <button
                  key={suggestion}
                  className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t shrink-0">
          <div className="relative">
            <Input
              placeholder="Ask AI anything..."
              className="pr-10 h-10 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">AI may make mistakes — verify important information.</p>
        </div>
      </div>

    </div>
  );
}
