import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BookOpen, FolderOpen, Gem, Headphones, Loader2, Mic, Radio, Search, UserPlus,
} from "lucide-react";

/**
 * Site-wide search in the top bar. Two sources merged live: static pages
 * (matched in the bundle) and the /api/search route (the user's own shows,
 * episodes, media, studios, and guest contacts). ⌘K focuses it from
 * anywhere; Enter opens the first hit.
 */

const PAGES: Array<{ label: string; href: string; keywords: string }> = [
  { label: "Dashboard", href: "/today", keywords: "home today command center" },
  { label: "Live Studio", href: "/studio/live", keywords: "record go live stream broadcast studio" },
  { label: "Facet", href: "/studio/facet", keywords: "refiner refine polish cut gaps fillers video audio clip copy" },
  { label: "Media Storage", href: "/media-library", keywords: "media library files uploads storage videos audio" },
  { label: "Shows", href: "/shows", keywords: "podcast shows hosting" },
  { label: "Episodes", href: "/episodes", keywords: "podcast episodes drafts publish" },
  { label: "Listen", href: "/listener", keywords: "player listen playback" },
  { label: "Guests", href: "/guests", keywords: "guest pipeline crm booking" },
  { label: "Contacts", href: "/contacts", keywords: "master contacts people relationships crm" },
  { label: "Email", href: "/email", keywords: "email campaigns newsletter compose outreach" },
  { label: "Discover", href: "/social/discover", keywords: "find creators influencers research" },
  { label: "Directory", href: "/social/directory", keywords: "saved creators directory" },
  { label: "Social Hub", href: "/dashboard/social-hub", keywords: "social accounts connect analytics" },
  { label: "Posts", href: "/social/posts", keywords: "create post composer campaign cadence schedule" },
  { label: "Engagement", href: "/social/engagement", keywords: "comments dms inbox replies" },
  { label: "Bio Page", href: "/dashboard/profile", keywords: "link page bio profile links" },
  { label: "Connectors", href: "/connectors", keywords: "integrations calendar youtube buzzsprout connect apps" },
  { label: "Workspace Settings", href: "/settings", keywords: "settings account preferences" },
  { label: "Help Center", href: "/help", keywords: "help docs knowledge base how to" },
];

interface SearchResults {
  shows: Array<{ id: string; title: string }>;
  episodes: Array<{ id: string; title: string; podcastId: string; status: string }>;
  media: Array<{ id: string; caption: string | null; mediaType: string | null; platform: string }>;
  studios: Array<{ id: string; name: string }>;
  guests: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>;
}

export function GlobalSearch({ dark }: { dark: boolean }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults(null);
      setBusy(false);
      return;
    }
    const id = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (seq.current === id) setResults(res.ok && data ? (data as SearchResults) : null);
      } finally {
        if (seq.current === id) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = q.trim().toLowerCase();
  const pages =
    query.length >= 2
      ? PAGES.filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(query)).slice(0, 4)
      : [];

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    navigate(href);
  };

  const guestName = (g: SearchResults["guests"][number]) =>
    [g.firstName, g.lastName].filter(Boolean).join(" ") || g.email || "Unnamed contact";

  const firstHref =
    pages[0]?.href ??
    (results?.shows[0] && "/shows") ??
    (results?.episodes[0] && `/episodes/${results.episodes[0].id}`) ??
    (results?.media[0] && "/media-library") ??
    (results?.studios[0] && "/studio/live") ??
    (results?.guests[0] && "/guests") ??
    null;

  const hasAnything =
    pages.length > 0 ||
    !!(results && (results.shows.length || results.episodes.length || results.media.length || results.studios.length || results.guests.length));

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="py-1">
      <p className={`px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{title}</p>
      {children}
    </div>
  );

  const Row = ({ icon: Icon, label, sub, href }: { icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string; sub?: string; href: string }) => (
    <button
      onClick={() => go(href)}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${dark ? "text-zinc-200 hover:bg-zinc-800" : "text-zinc-800 hover:bg-zinc-100"}`}
    >
      <Icon size={14} className={dark ? "text-zinc-500" : "text-zinc-400"} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {sub && <span className={`shrink-0 text-[11px] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{sub}</span>}
    </button>
  );

  return (
    <div ref={boxRef} className="relative flex-1 max-w-lg">
      <div className="relative">
        <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-zinc-400" : "text-zinc-500"}`} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && firstHref) go(firstHref); }}
          placeholder="Search your whole workspace…"
          className={`h-10 w-full rounded-xl pl-9 pr-16 text-sm outline-none transition-shadow ${
            dark
              ? "border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_4px_16px_rgba(0,0,0,0.35)] focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)]"
              : "border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]"
          }`}
        />
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${dark ? "border-zinc-700 text-zinc-500" : "border-zinc-200 text-zinc-400"}`}>⌘K</span>
      </div>

      {open && query.length >= 2 && (
        <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border shadow-2xl ${dark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"}`}>
          {busy && !hasAnything && (
            <p className={`flex items-center gap-2 px-3 py-3 text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </p>
          )}
          {!busy && !hasAnything && (
            <p className={`px-3 py-3 text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>Nothing matches "{q.trim()}" yet.</p>
          )}
          {pages.length > 0 && (
            <Group title="Pages">
              {pages.map((p) => <Row key={p.href} icon={BookOpen} label={p.label} href={p.href} />)}
            </Group>
          )}
          {!!results?.shows.length && (
            <Group title="Shows">
              {results.shows.map((s) => <Row key={s.id} icon={Mic} label={s.title} href="/shows" />)}
            </Group>
          )}
          {!!results?.episodes.length && (
            <Group title="Episodes">
              {results.episodes.map((e) => <Row key={e.id} icon={Headphones} label={e.title} sub={e.status} href={`/episodes/${e.id}`} />)}
            </Group>
          )}
          {!!results?.media.length && (
            <Group title="Media">
              {results.media.map((m) => <Row key={m.id} icon={FolderOpen} label={m.caption || m.platform} sub={m.mediaType ?? undefined} href="/media-library" />)}
            </Group>
          )}
          {!!results?.studios.length && (
            <Group title="Studios">
              {results.studios.map((s) => <Row key={s.id} icon={Radio} label={s.name} href="/studio/live" />)}
            </Group>
          )}
          {!!results?.guests.length && (
            <Group title="Guests & contacts">
              {results.guests.map((g) => <Row key={g.id} icon={UserPlus} label={guestName(g)} sub={g.email ?? "Master Contact"} href="/contacts" />)}
            </Group>
          )}
          {hasAnything && (
            <Row icon={Gem} label={`Ask the Help Center about "${q.trim()}"`} href="/help" />
          )}
        </div>
      )}
    </div>
  );
}
