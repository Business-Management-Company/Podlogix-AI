import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Mic,
  Calendar,
  TrendingUp,
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttentionItem {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

interface FeedEvent {
  id: string;
  category: "episode" | "audience" | "revenue" | "campaign" | "system";
  title: string;
  time: string;
  href?: string;
}

interface UpcomingItem {
  id: string;
  type: "episode" | "campaign" | "task";
  title: string;
  date: string;
  show?: string;
}

interface ActivityData {
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Attention card ───────────────────────────────────────────────────────────

const ATTENTION_COLORS = {
  error:   { border: "#ef4444", bg: "#fff5f5", icon: "#ef4444", text: "#7f1d1d" },
  warning: { border: "#f59e0b", bg: "#fffbeb", icon: "#d97706", text: "#78350f" },
  info:    { border: "#3b82f6", bg: "#eff6ff", icon: "#3b82f6", text: "#1e3a5f" },
};

const ATTENTION_ICONS = {
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

function AttentionCard({ item }: { item: AttentionItem }) {
  const c = ATTENTION_COLORS[item.type];
  const Icon = ATTENTION_ICONS[item.type];

  return (
    <div
      style={{
        background: c.bg,
        borderRadius: 10,
        padding: "12px 14px",
        borderLeft: `3px solid ${c.border}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Icon size={15} style={{ color: c.icon, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#09090b" }}>{item.title}</p>
        <p style={{ fontSize: 12, color: "#52525b", marginTop: 2, lineHeight: 1.4 }}>
          {item.description}
        </p>
        {item.action && (
          <Link href={item.action.href}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#09090b",
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {item.action.label}
              <ArrowRight size={11} />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Feed event dot color ─────────────────────────────────────────────────────

const FEED_COLORS: Record<string, string> = {
  episode:  "#10b981",
  audience: "#8b5cf6",
  revenue:  "#f59e0b",
  campaign: "#3b82f6",
  system:   "#a1a1aa",
};

// ─── Stub data builders (replace with real API data) ─────────────────────────

function buildAttentionItems(data: ActivityData | undefined): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (!data?.hasRssFeed) {
    items.push({
      id: "no-rss",
      type: "warning",
      title: "No podcast connected",
      description: "Connect your podcast host to start managing episodes, audience, and distribution.",
      action: { label: "Connect your podcast", href: "/podcasts" },
    });
  }

  if ((data?.podcasts?.length ?? 0) === 0 && data?.hasRssFeed) {
    items.push({
      id: "no-shows",
      type: "info",
      title: "Import your episodes",
      description: "Your RSS feed is connected. Import episodes to see them in Podlogix.",
      action: { label: "Go to Podcasts", href: "/podcasts" },
    });
  }

  return items;
}

const STUB_FEED: FeedEvent[] = [
  { id: "1", category: "episode",  title: "Episode 48 published to all platforms",         time: "2 hours ago" },
  { id: "2", category: "audience", title: "+312 new downloads this week",                  time: "6 hours ago" },
  { id: "3", category: "campaign", title: "LinkedIn post scheduled for tomorrow at 9am",   time: "Yesterday" },
  { id: "4", category: "revenue",  title: "Sponsor invoice sent — Acme Co. ($1,200)",      time: "2 days ago" },
  { id: "5", category: "episode",  title: "Episode 47 reached 1,000 downloads",            time: "3 days ago" },
  { id: "6", category: "system",   title: "Spotify connection refreshed",                  time: "4 days ago" },
];

const STUB_UPCOMING: UpcomingItem[] = [
  { id: "1", type: "episode",  title: "Ep 49 — The Delegation Trap", date: "Tomorrow, 9am",    show: "Build in Public" },
  { id: "2", type: "campaign", title: "Newsletter — August recap",    date: "Aug 14, 10am",     show: "Build in Public" },
  { id: "3", type: "task",     title: "Record Episode 50 intro",      date: "Aug 16" },
];

const UPCOMING_ICONS = {
  episode:  Radio,
  campaign: Megaphone,
  task:     CheckCircle2,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Activity() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<ActivityData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-8 pt-10 pb-16 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const attentionItems = buildAttentionItems(data);
  const hasShows = (data?.podcasts?.length ?? 0) > 0;

  const firstName = user?.firstName ?? "Podcaster";

  return (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "40px 32px 64px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px 24px",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(14,165,233,0.02) 100%)",
          border: "1px solid rgba(16,185,129,0.1)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#09090b",
            lineHeight: 1.2,
          }}
        >
          {getGreeting()}, {firstName}
        </h1>
        <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>
          {getTodayString()}
        </p>

        {/* Quick stats */}
        {hasShows && (
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(16,185,129,0.1)",
            }}
          >
            {[
              { label: "Downloads this week", value: "4,312", icon: TrendingUp, color: "#10b981" },
              { label: "Active podcasts",     value: String(data?.podcasts?.length ?? 0), icon: Mic,       color: "#8b5cf6" },
              { label: "Audience growth",     value: "+8.2%", icon: Users,      color: "#3b82f6" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: `${stat.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Icon size={13} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 600, color: "#09090b", letterSpacing: "-0.02em", lineHeight: 1 }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Attention items ─────────────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attentionItems.map((item) => (
              <AttentionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── My Podcasts ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#a1a1aa",
            }}
          >
            Podcasts
          </h2>
          <Link href="/podcasts">
            <span
              style={{
                fontSize: 12,
                color: "#a1a1aa",
                display: "flex",
                alignItems: "center",
                gap: 3,
                cursor: "pointer",
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLElement).style.color = "#52525b")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")
              }
            >
              View all <ArrowRight size={11} />
            </span>
          </Link>
        </div>

        {hasShows ? (
          <div
            style={{
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {(data?.podcasts ?? []).slice(0, 3).map((podcast, idx, arr) => (
              <Link key={podcast.id} href={`/podcasts/${podcast.id}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: "#ffffff",
                    borderBottom:
                      idx < arr.length - 1 ? "1px solid #f0f0f0" : "none",
                    cursor: "pointer",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.background = "#fafafa")
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.background = "#ffffff")
                  }
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid #e4e4e7",
                      background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(14,165,233,0.12) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Mic size={15} style={{ color: "#10b981" }} />
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
                    }}
                  >
                    {podcast.title}
                  </p>
                  <ArrowRight size={13} style={{ color: "#d4d4d8", flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              border: "1px dashed #e4e4e7",
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
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
                margin: "0 auto 12px",
              }}
            >
              <Mic size={20} style={{ color: "#10b981" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#09090b", marginBottom: 4 }}>
              No podcasts yet
            </p>
            <p style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 16 }}>
              Connect your podcast host or create a new show to get started.
            </p>
            <Link href="/podcasts">
              <button
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#09090b",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Add your first podcast
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* ── Upcoming ────────────────────────────────────────────────────────── */}
      {hasShows && (
        <section style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#a1a1aa",
              marginBottom: 10,
            }}
          >
            Upcoming
          </h2>
          <div
            style={{
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {STUB_UPCOMING.map((item, idx, arr) => {
              const Icon = UPCOMING_ICONS[item.type];
              const dotColor =
                item.type === "episode"
                  ? "#10b981"
                  : item.type === "campaign"
                  ? "#3b82f6"
                  : "#a1a1aa";
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 16px",
                    background: "#ffffff",
                    borderBottom:
                      idx < arr.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      background: `${dotColor}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={13} style={{ color: dotColor }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#09090b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </p>
                    {item.show && (
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 1 }}>
                        {item.show}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={11} style={{ color: "#d4d4d8" }} />
                    <span style={{ fontSize: 11, color: "#a1a1aa" }}>{item.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent activity feed ─────────────────────────────────────────────── */}
      {hasShows && (
        <section>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#a1a1aa",
              marginBottom: 10,
            }}
          >
            Recent
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {STUB_FEED.map((event) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 0",
                  borderBottom: "1px solid #f4f4f5",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: FEED_COLORS[event.category] ?? "#a1a1aa",
                    flexShrink: 0,
                    marginLeft: 4,
                  }}
                />
                <p
                  style={{
                    fontSize: 13,
                    color: "#09090b",
                    flex: 1,
                  }}
                >
                  {event.title}
                </p>
                <span style={{ fontSize: 11, color: "#a1a1aa", flexShrink: 0 }}>
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
