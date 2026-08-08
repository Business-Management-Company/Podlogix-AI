import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Zap,
  Mic,
  Megaphone,
  Users,
  Briefcase,
  Library,
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
  X,
  Send,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ─── Design tokens ────────────────────────────────────────────────────────────

const SB_BG        = "#111111";
const SB_W         = 220;
const SB_W_MIN     = 52;
const SB_TEXT      = "rgba(255,255,255,0.46)";
const SB_TEXT_H    = "rgba(255,255,255,0.84)";
const SB_TEXT_ACT  = "#ffffff";
const SB_HOVER     = "rgba(255,255,255,0.055)";
const SB_ACTIVE    = "rgba(255,255,255,0.10)";
const SB_BORDER    = "rgba(255,255,255,0.072)";
const GREEN        = "#10b981";
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
  { label: "Activity",  icon: Zap,       href: "/activity",  exact: true },
  { label: "Podcasts",  icon: Mic,       href: "/podcasts" },
  { label: "Campaigns", icon: Megaphone, href: "/campaigns" },
  { label: "Audience",  icon: Users,     href: "/audience" },
  { label: "Business",  icon: Briefcase, href: "/business" },
  { label: "Library",   icon: Library,   href: "/library" },
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
          transition: `background 120ms, color 120ms`,
          background: active ? SB_ACTIVE : hover && !active ? SB_HOVER : "transparent",
          color: active ? SB_TEXT_ACT : hover ? SB_TEXT_H : SB_TEXT,
          margin: "1px 6px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          position: "relative",
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
              background: GREEN,
            }}
          />
        )}
        <Icon
          size={15}
          style={{
            flexShrink: 0,
            color: active ? GREEN : "inherit",
            marginLeft: active && !collapsed ? 2 : 0,
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
  const [location] = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

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
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
              background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
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
                    background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
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
                  background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
                  color: "white",
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
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
            )}
          </div>
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
            padding: "0 20px",
            borderBottom: "1px solid #e4e4e7",
            flexShrink: 0,
            gap: 8,
            background: "#ffffff",
          }}
        >
          {/* Breadcrumb / context label */}
          <div style={{ flex: 1 }}>
            {isShowContext && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#a1a1aa",
                }}
              >
                <Link href="/podcasts">
                  <span
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.color = "#52525b")
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")
                    }
                  >
                    Podcasts
                  </span>
                </Link>
                <span style={{ color: "#d4d4d8" }}>/</span>
                <span style={{ color: "#09090b", fontWeight: 500 }}>
                  {podcast?.title ?? "My Podcast"}
                </span>
              </div>
            )}
          </div>

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
              border: "1px solid #e4e4e7",
              background: aiOpen
                ? "rgba(16,185,129,0.06)"
                : "#fafafa",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: aiOpen ? GREEN : "#52525b",
              fontFamily: "inherit",
              transition: "background 120ms, color 120ms, border-color 120ms",
              borderColor: aiOpen ? "rgba(16,185,129,0.3)" : "#e4e4e7",
            }}
            onMouseEnter={e => {
              if (!aiOpen) {
                (e.currentTarget as HTMLElement).style.background = "#f4f4f5";
                (e.currentTarget as HTMLElement).style.color = "#09090b";
              }
            }}
            onMouseLeave={e => {
              if (!aiOpen) {
                (e.currentTarget as HTMLElement).style.background = "#fafafa";
                (e.currentTarget as HTMLElement).style.color = "#52525b";
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
            background: "#ffffff",
          }}
        >
          {children}
        </div>
      </div>

      {/* ── AI Panel ─────────────────────────────────────────────────────── */}
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

export default AppLayout;
