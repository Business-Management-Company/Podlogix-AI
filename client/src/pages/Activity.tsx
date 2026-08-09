import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Mic,
  Rss,
  Share2,
  Shield,
  Link2,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Radio,
  CheckCircle2,
  Circle,
  Plus,
  Zap,
  Headphones,
  ExternalLink,
  Mail,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  profile: {
    id: string;
    slug: string;
    displayName: string;
    isPublished: boolean;
  } | null;
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name?: string | null): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name}` : salutation;
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Setup steps ─────────────────────────────────────────────────────────────

interface SetupStep {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

function buildSetupSteps(data: DashboardData | undefined): SetupStep[] {
  return [
    {
      id: "profile",
      label: "Create your Link Page",
      hint: "Set up your public profile with links and social channels",
      href: "/dashboard/profile",
      done: !!data?.profile,
      icon: Link2,
    },
    {
      id: "rss",
      label: "Connect an RSS feed",
      hint: "Import episodes from your podcast host",
      href: "/dashboard/rss",
      done: !!data?.hasRssFeed,
      icon: Rss,
    },
    {
      id: "distribute",
      label: "Distribute to platforms",
      hint: "Submit to Spotify, Apple Podcasts, YouTube, and more",
      href: "/dashboard/distribution",
      done: Object.values(data?.distributionStatus || {}).some(
        (s) => s === "submitted" || s === "approved"
      ),
      icon: Share2,
    },
    {
      id: "voice",
      label: "Protect your voice",
      hint: "Certify your voice identity on the blockchain",
      href: "/dashboard/certify",
      done: false,
      icon: Shield,
    },
  ];
}

// ─── Design constants ─────────────────────────────────────────────────────────

const GREEN = "#10b981";
const CARD_BORDER = "1px solid #e4e4e7";
const CARD_RADIUS = 12;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#ffffff",
        border: CARD_BORDER,
        borderRadius: CARD_RADIUS,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#71717a", fontWeight: 500, letterSpacing: "-0.01em" }}>
          {label}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: accent ? "rgba(16,185,129,0.08)" : "#f4f4f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={13} style={{ color: accent ? GREEN : "#52525b" }} />
        </div>
      </div>
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#09090b",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#a1a1aa",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: CARD_BORDER,
        borderRadius: CARD_RADIUS,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Platform display map ─────────────────────────────────────────────────────

const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  spotify:      { label: "Spotify",         color: "#1DB954" },
  apple:        { label: "Apple Podcasts",  color: "#bc55e6" },
  youtube:      { label: "YouTube",         color: "#FF0000" },
  amazon:       { label: "Amazon Music",    color: "#00A8E1" },
  google:       { label: "Google",          color: "#4285F4" },
  iheartradio:  { label: "iHeartRadio",     color: "#CC0000" },
};

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Add a podcast",      icon: Mic,      href: "/dashboard/rss",            hint: "Connect via RSS" },
  { label: "Social Hub",         icon: Share2,   href: "/dashboard/social-hub",     hint: "Schedule posts" },
  { label: "Email Hub",          icon: Mail,     href: "/dashboard/email",          hint: "Newsletters" },
  { label: "Analytics",          icon: BarChart3, href: "/listener/analytics",      hint: "Downloads & growth" },
  { label: "Voice Identity",     icon: Shield,   href: "/identity",                 hint: "AI protection" },
];

// ─── Activity.tsx ─────────────────────────────────────────────────────────────

export default function Activity() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const steps = buildSetupSteps(data);
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pendingSteps = steps.filter((s) => !s.done);

  const showCount = data?.podcasts?.length ?? 0;
  const platformEntries = Object.entries(data?.distributionStatus || {});
  const liveCount = platformEntries.filter(([, s]) => s === "approved").length;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#09090b",
            letterSpacing: "-0.025em",
            margin: 0,
          }}
        >
          {getGreeting(user?.firstName)}
        </h1>
        <p style={{ fontSize: 13, color: "#71717a", marginTop: 3 }}>{getTodayString()}</p>
      </div>

      {/* ── Stat tiles row ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <StatCard label="Shows"      value={isLoading ? "—" : showCount}    icon={Mic}      accent={showCount > 0} />
        <StatCard label="Live on"    value={isLoading ? "—" : `${liveCount} platforms`} icon={Radio}  />
        <StatCard label="Setup"      value={isLoading ? "—" : `${doneCount} / ${steps.length}`} icon={CheckCircle2} accent={allDone} />
        <StatCard label="Listeners"  value="—"                               icon={Headphones} />
        <StatCard label="Downloads"  value="—"                               icon={TrendingUp} />
      </div>

      {/* ── Main two-column layout ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Setup checklist — only shown when incomplete */}
          {!allDone && (
            <div>
              <SectionLabel>Getting started — {doneCount} of {steps.length} complete</SectionLabel>
              <Card>
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === steps.length - 1;
                  return (
                    <div
                      key={step.id}
                      onClick={() => !step.done && navigate(step.href)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 18px",
                        borderBottom: isLast ? "none" : CARD_BORDER,
                        cursor: step.done ? "default" : "pointer",
                        background: step.done ? "#fafafa" : "#ffffff",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={e => {
                        if (!step.done) (e.currentTarget as HTMLElement).style.background = "#f9fafb";
                      }}
                      onMouseLeave={e => {
                        if (!step.done) (e.currentTarget as HTMLElement).style.background = "#ffffff";
                      }}
                    >
                      {step.done ? (
                        <CheckCircle2 size={16} style={{ color: GREEN, flexShrink: 0 }} />
                      ) : (
                        <Circle size={16} style={{ color: "#d4d4d8", flexShrink: 0 }} />
                      )}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          background: step.done ? "#f4f4f5" : "rgba(16,185,129,0.07)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={13} style={{ color: step.done ? "#a1a1aa" : GREEN }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: step.done ? 400 : 500,
                            color: step.done ? "#a1a1aa" : "#09090b",
                            textDecoration: step.done ? "line-through" : "none",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {step.label}
                        </p>
                        {!step.done && (
                          <p style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>{step.hint}</p>
                        )}
                      </div>
                      {!step.done && (
                        <ArrowRight size={14} style={{ color: "#d4d4d8", flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* My Shows */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <SectionLabel>My Shows</SectionLabel>
              <Link href="/podcasts">
                <span
                  style={{
                    fontSize: 12,
                    color: "#71717a",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#09090b")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#71717a")}
                >
                  All podcasts
                  <ArrowRight size={11} />
                </span>
              </Link>
            </div>

            {showCount > 0 ? (
              <Card>
                {(data?.podcasts || []).slice(0, 5).map((podcast, i, arr) => (
                  <Link key={podcast.id} href={`/podcasts/${podcast.id}`}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 18px",
                        borderBottom: i === arr.length - 1 ? "none" : CARD_BORDER,
                        cursor: "pointer",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f9fafb")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Mic size={14} style={{ color: "white" }} />
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#09090b",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {podcast.title}
                      </p>
                      <ArrowRight size={13} style={{ color: "#d4d4d8", flexShrink: 0 }} />
                    </div>
                  </Link>
                ))}
              </Card>
            ) : (
              <Card>
                <div
                  style={{
                    padding: "36px 24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(16,185,129,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mic size={20} style={{ color: GREEN }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#09090b" }}>No shows yet</p>
                    <p style={{ fontSize: 13, color: "#71717a", marginTop: 4 }}>
                      Connect your RSS feed to import episodes
                    </p>
                  </div>
                  <Link href="/dashboard/rss">
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: GREEN,
                        color: "white",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <Plus size={13} />
                      Add your first podcast
                    </div>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Recent activity placeholder */}
          <div>
            <SectionLabel>Recent activity</SectionLabel>
            <Card>
              <div
                style={{
                  padding: "28px 24px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={18} style={{ color: "#d4d4d8" }} />
                <p style={{ fontSize: 13, color: "#a1a1aa" }}>
                  Activity from your shows and campaigns will appear here.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick actions */}
          <div>
            <SectionLabel>Quick access</SectionLabel>
            <Card>
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderBottom: i === QUICK_ACTIONS.length - 1 ? "none" : CARD_BORDER,
                        cursor: "pointer",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f9fafb")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: "#f4f4f5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={13} style={{ color: "#52525b" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#09090b", letterSpacing: "-0.01em" }}>
                          {action.label}
                        </p>
                        <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 1 }}>{action.hint}</p>
                      </div>
                      <ArrowRight size={12} style={{ color: "#d4d4d8", flexShrink: 0 }} />
                    </div>
                  </Link>
                );
              })}
            </Card>
          </div>

          {/* Distribution status */}
          {platformEntries.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <SectionLabel>Distribution</SectionLabel>
                <Link href="/dashboard/distribution">
                  <span
                    style={{
                      fontSize: 12,
                      color: "#71717a",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#09090b")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#71717a")}
                  >
                    Manage
                    <ArrowRight size={11} />
                  </span>
                </Link>
              </div>
              <Card>
                {platformEntries.map(([platform, status], i) => {
                  const display = PLATFORM_DISPLAY[platform] || { label: platform, color: "#888" };
                  const isLive = status === "approved";
                  const label =
                    status === "approved" ? "Live"
                    : status === "submitted" ? "Pending"
                    : "Not submitted";
                  return (
                    <div
                      key={platform}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        borderBottom: i === platformEntries.length - 1 ? "none" : CARD_BORDER,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isLive ? display.color : "#d4d4d8",
                        }}
                      />
                      <p style={{ fontSize: 13, color: "#09090b", flex: 1, fontWeight: 500 }}>
                        {display.label}
                      </p>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: isLive ? "#10b981" : "#a1a1aa",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* Link page shortcut */}
          {data?.profile && (
            <div>
              <SectionLabel>Your Link Page</SectionLabel>
              <Card>
                <Link href={`/p/${data.profile.slug}`}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 16px",
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f9fafb")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <ExternalLink size={13} style={{ color: "#71717a", flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#09090b", flex: 1 }}>
                      podlogix.io/p/{data.profile.slug}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: data.profile.isPublished ? "#10b981" : "#a1a1aa",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {data.profile.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                </Link>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
