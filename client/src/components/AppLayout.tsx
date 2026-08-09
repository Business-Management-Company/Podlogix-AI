import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
const SB_W         = 220;
const SB_W_MIN     = 52;
const SB_TEXT      = "rgba(234,219,212,0.48)";
const SB_TEXT_H    = "rgba(255,255,255,0.84)";
const SB_TEXT_ACT  = "#ffffff";
const SB_HOVER     = "rgba(255,96,49,0.08)";
const SB_ACTIVE    = "rgba(255,96,49,0.14)";
const SB_BORDER    = "rgba(255,255,255,0.065)";
const GREEN        = "#ff6031";
const SPRING       = "cubic-bezier(0.16, 1, 0.3, 1)";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  exact?: boolean;
}

// ─── Nav definitions ──────────────────────────────────────────────────────────

const WORKSPACE_MAIN: NavItem[] = [
  { label: "Activity",     icon: Zap,        href: "/activity",               exact: true },
  { label: "Podcasts",     icon: Mic,        href: "/dashboard/episodes" },
  { label: "Listen",       icon: Headphones, href: "/listener" },
  { label: "Distribution", icon: Share2,     href: "/dashboard/distribution" },
  { label: "Connectors",   icon: Plug,       href: "/connectors" },
  { label: "Social",       icon: Users,      href: "/dashboard/social-hub" },
  { label: "RSS Feeds",    icon: Rss,        href: "/dashboard/rss" },
];

const WORKSPACE_UTIL: NavItem[] = [
  { label: "Team",     icon: Users2,    href: "/team" },
  { label: "Settings", icon: Settings,  href: "/settings" },
  { label: "Help",     icon: HelpCircle, href: "/help" },
];

function buildShowNav(podcastId: string): { main: NavItem[]; util: NavItem[] } {
  const base = `/podcasts/${podcastId}`;
  return {
    main: [
      { label: "Overview",  icon: LayoutDashboard, href: base,              exact: true },
      { label: "Episodes",  icon: List,            href: `${base}/episodes` },
      { label: "Campaigns", icon: Megaphone,       href: `${base}/campaigns` },
      { label: "Audience",  icon: Users,           href: `${base}/audience` },
      { label: "Business",  icon: Briefcase,       href: `${base}/business` },
    ],
    util: [
      { label: "Identity",  icon: Fingerprint,     href: `${base}/identity` },
      { label: "Settings",  icon: Settings2,       href: `${base}/settings` },
    ],
  };
}

// ─── isActive helper ──────────────────────────────────────────────────────────

function isActive(location: string, href: string, exact?: boolean): boolean {
  if (exact) return location === href;
  return location.startsWith(href);
}

// ─── Page title lookup (top bar) ───────────────────────────────────────────────

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

function getPageTitle(location: string): string {
  const navItem = [...WORKSPACE_MAIN, ...WORKSPACE_UTIL].find((item) =>
    isActive(location, item.href, item.exact)
  );
  return navItem?.label ?? EXTRA_TITLES[location] ?? "Podlogix";
}

// ─── Command palette items ─────────────────────────────────────────────────────

const PALETTE_ITEMS: NavItem[] = [...WORKSPACE_MAIN, ...WORKSPACE_UTIL];

// ─── SidebarItem ─────────────────────────────────────────────────────────────

function SbItem({
  item,
  location,
  collapsed,
}: {
  item: NavItem;
  location: string;
  collapsed: boolean;
}) {
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
          gap: 10,
          padding: collapsed ? "0 14px" : "0 10px",
          height: 34,
          borderRadius: 7,
          cursor: "pointer",
          transition: "color 120ms",
          color: active ? SB_TEXT_ACT : hover ? SB_TEXT_H : SB_TEXT,
          margin: "1px 6px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          position: "relative",
        }}
      >
        {/* Sliding active/hover background — shares a layoutId so it glides
            between nav items instead of popping when the route changes. */}
        {active ? (
          <motion.span
            layoutId="sb-active-pill"
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.4 }}
            style={{ position: "absolute", inset: 0, borderRadius: 7, background: SB_ACTIVE }}
          />
        ) : hover ? (
          <span style={{ position: "absolute", inset: 0, borderRadius: 7, background: SB_HOVER }} />
        ) : null}

        {/* Active indicator bar */}
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
              background: GREEN,
              zIndex: 1,
            }}
          />
        )}
        <Icon
          size={15}
          style={{
            flexShrink: 0,
            color: active ? GREEN : "inherit",
            marginLeft: active && !collapsed ? 2 : 0,
            position: "relative",
            zIndex: 1,
            transition: "transform 150ms",
            transform: hover && !active ? "scale(1.08)" : "scale(1)",
          }}
        />
        {!collapsed && (
          <span
            style={{
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              letterSpacing: "-0.01em",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              position: "relative",
              zIndex: 1,
            }}
          >
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── SidebarDivider ───────────────────────────────────────────────────────────

function SbDivider() {
  return (
    <div style={{ height: 1, background: SB_BORDER, margin: "5px 6px" }} />
  );
}

// ─── AI Slide-out Panel ───────────────────────────────────────────────────────

function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.18)",
            zIndex: 40,
            opacity: open ? 1 : 0,
            transition: `opacity 200ms ${SPRING}`,
          }}
        />
      )}

      {/* Panel */}
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
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(14,165,233,0.03) 100%)",
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

        {/* Suggestions */}
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

        {/* Messages area */}
        <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center", marginTop: 40 }}>
            How can I help you today?
          </p>
        </div>

        {/* Input */}
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
              background: GREEN,
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
  const [collapsed, setCollapsed] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K opens the quick-nav palette from anywhere in the app.
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

  function goTo(href: string) {
    setPaletteOpen(false);
    setLocation(href);
  }

  // Detect show context from URL: /podcasts/:id or /podcasts/:id/*
  const showMatch = location.match(/^\/podcasts\/([^/]+)(?:\/|$)/);
  const podcastId = showMatch ? showMatch[1] : null;
  const isShowContext = !!podcastId;

  // Fetch podcast name when in show context
  const { data: podcast } = useQuery<{ title: string; id: string } | null>({
    queryKey: [`/api/podcasts/${podcastId}`],
    enabled: !!podcastId,
  });

  // Determine which nav to show
  const showNavItems = podcastId ? buildShowNav(podcastId) : null;

  // User initials for avatar
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const sbWidth = collapsed ? SB_W_MIN : SB_W;

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
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          width: sbWidth,
          flexShrink: 0,
          background: SB_BG,
          display: "flex",
          flexDirection: "column",
          transition: `width 220ms ${SPRING}`,
          overflow: "hidden",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Header / Logo */}
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            gap: 8,
            borderBottom: `1px solid ${SB_BORDER}`,
            flexShrink: 0,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              flexShrink: 0,
              background: "#ff6031",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mic size={13} style={{ color: "white" }} />
          </div>

          {!collapsed && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: SB_TEXT_ACT,
                letterSpacing: "-0.02em",
                flex: 1,
                overflow: "hidden",
              }}
            >
              Podlogix
            </span>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: SB_TEXT,
              flexShrink: 0,
              transition: "color 120ms, background 120ms",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = SB_TEXT_H;
              (e.currentTarget as HTMLElement).style.background = SB_HOVER;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = SB_TEXT;
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* ── Show context pill ─────────────────────────────────────────── */}
        {isShowContext && !collapsed && (
          <div style={{ padding: "8px 6px 0" }}>
            <Link href="/podcasts">
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.048)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  cursor: "pointer",
                  transition: "background 120ms",
                  border: `1px solid rgba(255,255,255,0.06)`,
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.08)")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.048)")
                }
              >
                {/* Show artwork placeholder */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "linear-gradient(135deg, #ff6031 0%, #ff9a62 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Headphones size={13} style={{ color: "white" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: SB_TEXT_ACT,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {podcast?.title ?? "My Podcast"}
                  </p>
                  <p style={{ fontSize: 10.5, color: SB_TEXT, marginTop: 1 }}>
                    ← All Podcasts
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Show context collapsed pill */}
        {isShowContext && collapsed && (
          <div style={{ padding: "8px 6px 0" }}>
            <Link href="/podcasts">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.048)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  margin: "0 auto",
                }}
              >
                <Headphones size={14} style={{ color: SB_TEXT_H }} />
              </div>
            </Link>
          </div>
        )}

        {/* ── Nav items ─────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto", overflowX: "hidden" }}>
          {isShowContext && showNavItems ? (
            <>
              {showNavItems.main.map((item) => (
                <SbItem
                  key={item.href}
                  item={item}
                  location={location}
                  collapsed={collapsed}
                />
              ))}
              <SbDivider />
              {showNavItems.util.map((item) => (
                <SbItem
                  key={item.href}
                  item={item}
                  location={location}
                  collapsed={collapsed}
                />
              ))}
            </>
          ) : (
            <>
              {/* Activity sits above the divider alone */}
              <SbItem
                item={WORKSPACE_MAIN[0]}
                location={location}
                collapsed={collapsed}
              />
              <SbDivider />
              {/* Podcasts through Library */}
              {WORKSPACE_MAIN.slice(1).map((item) => (
                <SbItem
                  key={item.href}
                  item={item}
                  location={location}
                  collapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>

        {/* ── Bottom utility row ─────────────────────────────────────────── */}
        <div
          style={{
            borderTop: `1px solid ${SB_BORDER}`,
            padding: "6px 0",
            flexShrink: 0,
          }}
        >
          {!isShowContext &&
            WORKSPACE_UTIL.map((item) => (
              <SbItem
                key={item.href}
                item={item}
                location={location}
                collapsed={collapsed}
              />
            ))}

          {/* User avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: collapsed ? "6px 8px" : "6px 10px",
                  margin: "4px 6px 2px",
                  borderRadius: 7,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.background = SB_HOVER)
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                <Avatar style={{ width: 24, height: 24, flexShrink: 0 }}>
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
                {!collapsed && (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: SB_TEXT_ACT,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {user?.firstName
                          ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                          : (user?.email ?? "Account")}
                      </p>
                    </div>
                    <ChevronDown size={12} style={{ color: SB_TEXT, flexShrink: 0 }} />
                  </>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
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
                <Link href="/podcasts">
                  <span
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.color = "#fff8ed")
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.color = "#9d817e")
                    }
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
              transition: "background 120ms, border-color 120ms",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#34181b";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#2a1417";
            }}
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
              border: "1px solid rgba(255,255,255,0.07)",
              background: aiOpen
                ? "rgba(16,185,129,0.06)"
                : "#2a1417",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: aiOpen ? GREEN : "#b99d98",
              fontFamily: "inherit",
              transition: "background 120ms, color 120ms, border-color 120ms",
              borderColor: aiOpen ? "rgba(255,96,49,0.35)" : "rgba(255,255,255,0.07)",
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
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#170b0d",
          }}
        >
          <motion.div key={location} variants={pageIn} initial="hidden" animate="show">
            {children}
          </motion.div>
        </div>
      </div>

      {/* ── AI Panel ─────────────────────────────────────────────────────── */}
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* ── Quick-nav command palette (⌘K) ──────────────────────────────────── */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {PALETTE_ITEMS.map((item) => {
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
