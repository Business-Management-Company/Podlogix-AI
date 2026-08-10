import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import {
  Zap,
  Mic,
  Plug,
  Users,
  Share2,
  Rss,
  Users2,
  Settings,
  HelpCircle,
  Sparkles,
  LayoutDashboard,
  List,
  Fingerprint,
  Settings2,
  ChevronDown,
  ChevronLeft,
  X,
  Send,
  Headphones,
  Search,
  Bell,
  LogOut,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { pageIn } from "@/components/kit";

// ─── Design tokens ────────────────────────────────────────────────────────────

const SB_BG        = "#1d0d10";
const SB_PANEL_BG  = "#231215";
const RAIL_W       = 52;
const PANEL_W      = 180;
const SB_TEXT      = "rgba(234,219,212,0.48)";
const SB_TEXT_H    = "rgba(255,255,255,0.84)";
const SB_TEXT_ACT  = "#ffffff";
const SB_HOVER     = "rgba(255,96,49,0.08)";
const SB_ACTIVE    = "rgba(255,96,49,0.14)";
const SB_BORDER    = "rgba(255,255,255,0.065)";
const ORANGE       = "#ff6031";
const SPRING       = "cubic-bezier(0.16, 1, 0.3, 1)";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  exact?: boolean;
}

interface RailGroup {
  key: string;
  icon: LucideIcon;
  label: string;
  /** If set, clicking the icon navigates directly instead of opening sub-panel */
  directHref?: string;
  items?: NavItem[];
}

// ─── Rail group definitions ───────────────────────────────────────────────────

const WORKSPACE_GROUPS: RailGroup[] = [
  {
    key: "activity",
    icon: Zap,
    label: "Activity",
    directHref: "/activity",
  },
  {
    key: "podcasts",
    icon: Mic,
    label: "Podcasts",
    items: [
      { label: "Episodes",     icon: List,   href: "/dashboard/episodes" },
      { label: "Distribution", icon: Share2, href: "/dashboard/distribution" },
      { label: "RSS Feeds",    icon: Rss,    href: "/dashboard/rss" },
    ],
  },
  {
    key: "listen",
    icon: Headphones,
    label: "Listen",
    directHref: "/listener",
  },
  {
    key: "connections",
    icon: Plug,
    label: "Connections",
    items: [
      { label: "Connectors", icon: Plug,  href: "/connectors" },
      { label: "Social",     icon: Users, href: "/dashboard/social-hub" },
    ],
  },
];

const UTIL_GROUPS: RailGroup[] = [
  {
    key: "settings",
    icon: Settings,
    label: "Settings",
    items: [
      { label: "Team",     icon: Users2,     href: "/team" },
      { label: "Settings", icon: Settings,   href: "/settings" },
      { label: "Help",     icon: HelpCircle, href: "/help" },
    ],
  },
];

// For show context
function buildShowGroups(podcastId: string): RailGroup[] {
  const base = `/podcasts/${podcastId}`;
  return [
    {
      key: "overview",
      icon: LayoutDashboard,
      label: "Overview",
      directHref: base,
    },
    {
      key: "episodes",
      icon: List,
      label: "Episodes",
      directHref: `${base}/episodes`,
    },
    {
      key: "audience",
      icon: Users,
      label: "Audience",
      directHref: `${base}/audience`,
    },
    {
      key: "identity",
      icon: Fingerprint,
      label: "Identity",
      directHref: `${base}/identity`,
    },
    {
      key: "show-settings",
      icon: Settings2,
      label: "Settings",
      directHref: `${base}/settings`,
    },
  ];
}

// ─── isActive helper ──────────────────────────────────────────────────────────

function isActive(location: string, href: string, exact?: boolean): boolean {
  if (exact) return location === href;
  return location.startsWith(href);
}

function groupIsActive(location: string, group: RailGroup): boolean {
  if (group.directHref) return isActive(location, group.directHref, group.key === "activity");
  return group.items?.some((item) => isActive(location, item.href)) ?? false;
}

// ─── Page title lookup ────────────────────────────────────────────────────────

const EXTRA_TITLES: Record<string, string> = {
  "/settings": "Account Settings",
  "/help": "Help Center",
  "/connectors": "Connectors",
  "/listener": "Listen",
  "/listener/analytics": "Listener Analytics",
  "/dashboard/episodes": "Podcasts",
  "/dashboard/distribution": "Distribution",
  "/dashboard/social-hub": "Social Hub",
  "/dashboard/rss": "RSS Feeds",
  "/admin": "Admin",
  "/saas-admin": "SaaS Admin",
  "/client": "Client Portal",
  "/brand": "Brand Dashboard",
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Activity",     icon: Zap,        href: "/activity",              exact: true },
  { label: "Episodes",     icon: List,       href: "/dashboard/episodes" },
  { label: "Listen",       icon: Headphones, href: "/listener" },
  { label: "Distribution", icon: Share2,     href: "/dashboard/distribution" },
  { label: "Connectors",   icon: Plug,       href: "/connectors" },
  { label: "Social",       icon: Users,      href: "/dashboard/social-hub" },
  { label: "RSS Feeds",    icon: Rss,        href: "/dashboard/rss" },
  { label: "Team",         icon: Users2,     href: "/team" },
  { label: "Settings",     icon: Settings,   href: "/settings" },
  { label: "Help",         icon: HelpCircle, href: "/help" },
];

function getPageTitle(location: string): string {
  const navItem = ALL_NAV_ITEMS.find((item) => isActive(location, item.href, item.exact));
  return navItem?.label ?? EXTRA_TITLES[location] ?? "Podlogix";
}

// ─── Rail icon button ─────────────────────────────────────────────────────────

function RailBtn({
  group,
  location,
  isOpen,
  onClick,
}: {
  group: RailGroup;
  location: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  const active = groupIsActive(location, group);
  const Icon = group.icon;
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={group.label}
      style={{
        width: RAIL_W,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: isOpen
          ? SB_ACTIVE
          : active
          ? "rgba(255,96,49,0.10)"
          : hover
          ? SB_HOVER
          : "transparent",
        cursor: "pointer",
        position: "relative",
        borderRadius: 0,
        transition: "background 120ms",
        flexShrink: 0,
      }}
    >
      {/* Active indicator */}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 2,
            height: 16,
            borderRadius: 1,
            background: ORANGE,
          }}
        />
      )}
      <Icon
        size={16}
        style={{
          color: active || isOpen ? ORANGE : hover ? SB_TEXT_H : SB_TEXT,
          transition: "color 120ms, transform 150ms",
          transform: hover && !active ? "scale(1.1)" : "scale(1)",
        }}
      />
    </button>
  );
}

// ─── Sub-panel item ───────────────────────────────────────────────────────────

function PanelItem({ item, location }: { item: NavItem; location: string }) {
  const active = isActive(location, item.href, item.exact);
  const Icon = item.icon;
  const [hover, setHover] = useState(false);

  return (
    <Link href={item.href}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 10px",
          height: 34,
          borderRadius: 7,
          cursor: "pointer",
          color: active ? SB_TEXT_ACT : hover ? SB_TEXT_H : SB_TEXT,
          margin: "1px 6px",
          position: "relative",
          overflow: "hidden",
          whiteSpace: "nowrap",
          transition: "color 120ms",
        }}
      >
        {active ? (
          <motion.span
            layoutId="panel-active-pill"
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.4 }}
            style={{ position: "absolute", inset: 0, borderRadius: 7, background: SB_ACTIVE }}
          />
        ) : hover ? (
          <span style={{ position: "absolute", inset: 0, borderRadius: 7, background: SB_HOVER }} />
        ) : null}
        <Icon
          size={13}
          style={{
            flexShrink: 0,
            color: active ? ORANGE : "inherit",
            position: "relative",
            zIndex: 1,
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            fontWeight: active ? 500 : 400,
            letterSpacing: "-0.01em",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.label}
        </span>
      </div>
    </Link>
  );
}

// ─── AI Slide-out Panel ───────────────────────────────────────────────────────

function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.18)",
            zIndex: 40,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: "#ffffff",
          borderLeft: "1px solid #e4e4e7",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform 280ms ${SPRING}`,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={15} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#09090b", lineHeight: 1.2 }}>
                Podlogix AI
              </p>
              <p style={{ fontSize: 11, color: "#a1a1aa" }}>Your creative assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a1a1aa",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Draft show notes", "Write episode title", "Plan next episode", "Social post ideas"].map((s) => (
            <button
              key={s}
              style={{
                padding: "5px 10px",
                borderRadius: 20,
                border: "1px solid #e4e4e7",
                background: "#fafafa",
                fontSize: 12,
                color: "#52525b",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center", marginTop: 40 }}>
            How can I help you today?
          </p>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <textarea
            placeholder="Ask anything about your podcast…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid #e4e4e7",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              color: "#09090b",
              background: "#fafafa",
              outline: "none",
              lineHeight: 1.5,
            }}
          />
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              border: "none",
              background: ORANGE,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Send size={14} style={{ color: "white" }} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main AppLayout ───────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // ⌘K opens the command palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close sub-panel when clicking outside the sidebar
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Auto-open the panel that matches the current route
  useEffect(() => {
    const allGroups = [...WORKSPACE_GROUPS, ...UTIL_GROUPS];
    const matched = allGroups.find(
      (g) => !g.directHref && g.items?.some((item) => isActive(location, item.href))
    );
    if (matched) setOpenPanel(matched.key);
  }, [location]);

  function goTo(href: string) {
    setPaletteOpen(false);
    setLocation(href);
  }

  function handleRailClick(group: RailGroup) {
    if (group.directHref) {
      setLocation(group.directHref);
      setOpenPanel(null);
    } else {
      setOpenPanel((prev) => (prev === group.key ? null : group.key));
    }
  }

  // Detect show context
  const showMatch = location.match(/^\/podcasts\/([^/]+)(?:\/|$)/);
  const podcastId = showMatch ? showMatch[1] : null;
  const isShowContext = !!podcastId;

  const { data: podcast } = useQuery<{ title: string; id: string } | null>({
    queryKey: [`/api/podcasts/${podcastId}`],
    enabled: !!podcastId,
  });

  const railGroups = isShowContext
    ? buildShowGroups(podcastId!)
    : WORKSPACE_GROUPS;

  const utilGroups = isShowContext ? [] : UTIL_GROUPS;

  const activeGroup =
    openPanel
      ? [...railGroups, ...utilGroups].find((g) => g.key === openPanel) ?? null
      : null;

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const panelOpen = !!activeGroup?.items?.length;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        background: "#170b0d",
      }}
    >
      {/* ── Sidebar (rail + sub-panel) ────────────────────────────────────── */}
      <div
        ref={sidebarRef}
        style={{
          display: "flex",
          flexShrink: 0,
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* ── Icon rail ──────────────────────────────────────────────── */}
        <div
          style={{
            width: RAIL_W,
            background: SB_BG,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${SB_BORDER}`,
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: `1px solid ${SB_BORDER}`,
              flexShrink: 0,
            }}
          >
            <Link href="/activity">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#ff6031",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Mic size={14} style={{ color: "white" }} />
              </div>
            </Link>
          </div>

          {/* Show context: back arrow */}
          {isShowContext && (
            <Link href="/dashboard/episodes">
              <button
                title="Back to all podcasts"
                style={{
                  width: RAIL_W,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: SB_TEXT,
                  marginTop: 4,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = SB_TEXT_H)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = SB_TEXT)}
              >
                <ChevronLeft size={16} />
              </button>
            </Link>
          )}

          {/* Main rail icons */}
          <nav style={{ flex: 1, paddingTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            {railGroups.map((group) => (
              <RailBtn
                key={group.key}
                group={group}
                location={location}
                isOpen={openPanel === group.key}
                onClick={() => handleRailClick(group)}
              />
            ))}
          </nav>

          {/* Util rail icons */}
          <div style={{ paddingBottom: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            {utilGroups.map((group) => (
              <RailBtn
                key={group.key}
                group={group}
                location={location}
                isOpen={openPanel === group.key}
                onClick={() => handleRailClick(group)}
              />
            ))}

            {/* User avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title={user?.email ?? "Account"}
                  style={{
                    width: RAIL_W,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Avatar style={{ width: 26, height: 26 }}>
                    <AvatarFallback
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        background: "linear-gradient(135deg, #ff6031 0%, #ff9a62 100%)",
                        color: "white",
                      }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-zinc-400">Signed in as</p>
                  <p className="truncate text-sm font-medium text-zinc-950">
                    {user?.email ?? "—"}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <span className="flex w-full cursor-pointer items-center gap-2">
                      <UserCog size={14} />
                      Account settings
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">
                    <span className="flex w-full cursor-pointer items-center gap-2">
                      <HelpCircle size={14} />
                      Help center
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => logout()}
                  disabled={isLoggingOut}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut size={14} />
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Sub-panel ──────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {panelOpen && activeGroup && (
            <motion.div
              key={activeGroup.key}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: PANEL_W, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                overflow: "hidden",
                background: SB_PANEL_BG,
                borderRight: `1px solid ${SB_BORDER}`,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <div style={{ width: PANEL_W }}>
                {/* Panel header */}
                <div
                  style={{
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    borderBottom: `1px solid ${SB_BORDER}`,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: SB_TEXT,
                    }}
                  >
                    {activeGroup.label}
                  </span>
                </div>

                {/* Panel items */}
                <nav style={{ padding: "6px 0" }}>
                  {activeGroup.items?.map((item) => (
                    <PanelItem key={item.href} item={item} location={location} />
                  ))}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            padding: "0 16px 0 20px",
            borderBottom: "1px solid rgba(255,255,255,0.065)",
            flexShrink: 0,
            gap: 10,
            background: "#211012",
          }}
        >
          {/* Page title / breadcrumb */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isShowContext ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#9d817e",
                }}
              >
                <Link href="/dashboard/episodes">
                  <span
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#fff8ed")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#9d817e")}
                  >
                    Podcasts
                  </span>
                </Link>
                <span style={{ color: "#5d3c3e" }}>/</span>
                <span style={{ color: "#fff8ed", fontWeight: 500 }}>
                  {podcast?.title ?? "My Podcast"}
                </span>
              </div>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff8ed",
                  letterSpacing: "-0.01em",
                }}
              >
                {getPageTitle(location)}
              </span>
            )}
          </div>

          {/* Search / quick-nav (⌘K) */}
          <button
            onClick={() => setPaletteOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
              height: 32,
              width: 200,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "#2a1417",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 120ms",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#34181b")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#2a1417")}
          >
            <Search size={13} style={{ color: "#9d817e", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#9d817e", flex: 1, textAlign: "left" }}>
              Jump to…
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "#9d817e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: "1px 5px",
                flexShrink: 0,
                background: "#211012",
              }}
            >
              ⌘K
            </span>
          </button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "#2a1417",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#b99d98",
                  flexShrink: 0,
                  transition: "background 120ms, color 120ms",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "#34181b";
                  (e.currentTarget as HTMLElement).style.color = "#fff8ed";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "#2a1417";
                  (e.currentTarget as HTMLElement).style.color = "#b99d98";
                }}
              >
                <Bell size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-6 text-center">
                <p className="text-xs text-zinc-400">You're all caught up.</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI button */}
          <button
            onClick={() => setAiOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              height: 32,
              borderRadius: 8,
              border: `1px solid ${aiOpen ? "rgba(255,96,49,0.35)" : "rgba(255,255,255,0.07)"}`,
              background: aiOpen ? "rgba(255,96,49,0.06)" : "#2a1417",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: aiOpen ? ORANGE : "#b99d98",
              fontFamily: "inherit",
              transition: "background 120ms, color 120ms, border-color 120ms",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (!aiOpen) {
                (e.currentTarget as HTMLElement).style.background = "#34181b";
                (e.currentTarget as HTMLElement).style.color = "#fff8ed";
              }
            }}
            onMouseLeave={e => {
              if (!aiOpen) {
                (e.currentTarget as HTMLElement).style.background = "#2a1417";
                (e.currentTarget as HTMLElement).style.color = "#b99d98";
              }
            }}
          >
            <Sparkles size={13} />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", background: "#170b0d" }}>
          <motion.div key={location} variants={pageIn} initial="hidden" animate="show">
            {children}
          </motion.div>
        </div>
      </div>

      {/* ── AI Panel ─────────────────────────────────────────────────────── */}
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* ── Command palette (⌘K) ─────────────────────────────────────────── */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {ALL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => goTo(item.href)}>
                  <Icon size={14} />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default AppLayout;
