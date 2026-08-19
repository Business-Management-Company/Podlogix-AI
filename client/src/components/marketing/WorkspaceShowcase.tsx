import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Radio, Mic, Wand2, CheckCircle2, Circle, ArrowRight, Share2, Users2,
} from "lucide-react";
import { Link } from "wouter";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, viewportOnce } from "./motion";

/**
 * Section 2 — click-through product tour. Four hand-built demo views (demo
 * data, clearly a product preview) inside the 3-D browser frame, switched by
 * CTA tabs: Dashboard, Live Studio, Podcast, The Refinery. Views are drawn in
 * JSX rather than screenshots so they never go stale and always match the
 * marketing theme.
 */

// ── Tour data ────────────────────────────────────────────────────────────────

const TOUR = [
  {
    id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, url: "podlogix.io/today",
    captions: [
      { label: "Shows", value: "All in one feed" },
      { label: "Distribution", value: "Everywhere at once" },
      { label: "Guests", value: "CRM built in" },
      { label: "Analytics", value: "Numbers you can trust" },
    ],
  },
  {
    id: "studio", label: "Live Studio", Icon: Radio, url: "podlogix.io/studio/live",
    captions: [
      { label: "Scenes", value: "One-click stage presets" },
      { label: "Guests", value: "Green room, no accounts" },
      { label: "Media", value: "Play anything on stage" },
      { label: "Recording", value: "What you see is the file" },
    ],
  },
  {
    id: "podcast", label: "Podcast", Icon: Mic, url: "podlogix.io/shows",
    captions: [
      { label: "Hosting", value: "Included, not the point" },
      { label: "Feeds", value: "Your RSS, everywhere" },
      { label: "Episodes", value: "Synced or uploaded" },
      { label: "Promotion", value: "Episode to posts" },
    ],
  },
  {
    id: "refinery", label: "Refiner", Icon: Wand2, url: "podlogix.io/studio/refine",
    captions: [
      { label: "Pipeline", value: "Real transformations" },
      { label: "Minutes saved", value: "Measured, not invented" },
      { label: "Clips", value: "16:9 and 9:16" },
      { label: "Captions", value: "SRT & VTT ready" },
    ],
  },
] as const;

type TourId = (typeof TOUR)[number]["id"];

// ── Demo views (all demo data — a preview, not a live account) ──────────────

function DashboardView() {
  return (
    <div className="flex h-full bg-[#f6f6f7] text-zinc-900">
      <div className="hidden w-11 shrink-0 flex-col items-center gap-3 bg-[#0D1B2A] py-3 sm:flex">
        {[LayoutDashboard, Mic, Users2, Share2, Wand2].map((I, i) => (
          <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-md ${i === 0 ? "bg-white/20" : ""}`}>
            <I className={`h-3.5 w-3.5 ${i === 0 ? "text-white" : "text-white/40"}`} />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden p-4">
        <p className="text-sm font-bold">Good evening, Aljex</p>
        <p className="text-[9px] text-zinc-400">Tuesday · 2 shows on the calendar</p>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
            <p className="text-sm font-bold tabular-nums">75</p>
            <p className="text-[8px] font-medium text-zinc-400">Shows</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
            <p className="text-sm font-bold tabular-nums">324</p>
            <p className="text-[8px] font-medium text-zinc-400">Episodes</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
            <p className="text-sm font-bold tabular-nums">5</p>
            <p className="flex items-center gap-0.5 text-[8px] font-medium text-zinc-400">
              Live channels
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#FF0000]" title="YouTube" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#E1306C]" title="Instagram" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#1877F2]" title="Facebook" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9146FF]" title="Twitch" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-800" title="X" />
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
            <p className="text-sm font-bold tabular-nums">12.4K</p>
            <p className="text-[8px] font-medium text-zinc-400">Followers</p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">Guest pipeline</p>
            {[["Johnny Rocket", "Confirmed"], ["Dana Cole", "Invited"], ["Priya Patel", "Prospect"]].map(([n, s]) => (
              <div key={n} className="mt-1 flex items-center justify-between">
                <span className="truncate text-[9px] font-medium">{n}</span>
                <span className={`ml-1 shrink-0 rounded-full px-1.5 text-[7px] font-semibold ${
                  s === "Confirmed" ? "bg-emerald-100 text-emerald-700" : s === "Invited" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
                }`}>{s}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">This week</p>
            {[["Tue 9 AM", "Prep — guest Johnny Rocket"], ["Wed 7 PM", "Live — Streaming Conference"], ["Fri 12 PM", "Clips & social — Ep. 324"]].map(([t, e]) => (
              <div key={t} className="mt-1 flex items-center gap-1.5">
                <span className="shrink-0 rounded bg-red-50 px-1 text-[7px] font-bold text-red-600">{t}</span>
                <span className="truncate text-[8.5px]">{e}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">Downloads · 30d</p>
            <div className="mt-1.5 flex h-8 items-end gap-[2px]">
              {[35, 48, 42, 60, 55, 72, 64, 80, 74, 92, 85, 100].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm bg-emerald-500/70" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-1 text-[8px] font-semibold text-emerald-600">▲ 18% vs last month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stylized on-air portrait — in-house vector, no stock photos. */
function Bust({ skin, shirt, hair, bg }: { skin: string; shirt: string; hair: string; bg: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" style={{ background: bg }} preserveAspectRatio="xMidYMax slice">
      <ellipse cx="50" cy="108" rx="34" ry="38" fill={shirt} />
      <rect x="43" y="62" width="14" height="16" rx="6" fill={skin} />
      <circle cx="50" cy="48" r="19" fill={skin} />
      <path d="M31 46 a19 19 0 0 1 38 0 l0 -6 a19 15 0 0 0 -38 0 z" fill={hair} />
      <rect x="27" y="42" width="5" height="14" rx="2.5" fill="#18181b" />
      <rect x="68" y="42" width="5" height="14" rx="2.5" fill="#18181b" />
      <path d="M29 44 a21 21 0 0 1 42 0" stroke="#18181b" strokeWidth="3.5" fill="none" />
    </svg>
  );
}

function StudioView() {
  return (
    <div className="flex h-full gap-2 bg-[#0b0b0d] p-3 text-zinc-100">
      <div className="hidden w-20 shrink-0 flex-col gap-1.5 sm:flex">
        {["Countdown", "Welcome", "Interview", "Outro"].map((s, i) => (
          <div key={s} className={`overflow-hidden rounded-md border ${i === 2 ? "border-red-500" : "border-zinc-800"}`}>
            <div className="h-6" style={{ background: ["linear-gradient(135deg,#2a1a3e,#0f2740)", "linear-gradient(135deg,#3e1a1a,#402a0f)", "linear-gradient(135deg,#1a3e2e,#0f2440)", "linear-gradient(135deg,#1f2937,#0b0b0d)"][i] }} />
            <p className="bg-zinc-900 px-1 py-0.5 text-[7px] font-medium">{s}</p>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="relative flex flex-1 gap-1 overflow-hidden rounded-lg bg-zinc-900 p-1">
          <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-bold">LIVE 00:42:18</span>
          <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-1.5 py-0.5 text-[7px] font-semibold text-zinc-300">1.2K watching</span>
          <div className="relative flex-1 overflow-hidden rounded">
            <Bust skin="#c98d67" shirt="#1f2937" hair="#2b2320" bg="linear-gradient(160deg,#3b3b46,#17171c)" />
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-semibold">Aljex</span>
          </div>
          <div className="relative flex-1 overflow-hidden rounded">
            <Bust skin="#8d5a3b" shirt="#7c2d3e" hair="#111114" bg="linear-gradient(160deg,#2a3548,#141821)" />
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-semibold">Sarah Chen · Guest</span>
          </div>
          <span className="absolute bottom-1.5 right-2 z-10 flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-400">
            ✂ Moment marked · 00:41:57
          </span>
        </div>
        <div className="flex h-4 items-end gap-[2px] rounded-md bg-zinc-900 px-2 py-0.5">
          {[3, 7, 5, 9, 6, 10, 8, 5, 9, 7, 11, 6, 8, 10, 7, 4, 8, 6, 9, 5, 7, 10, 6, 8, 5, 9, 7, 6, 8, 4].map((h, i) => (
            <span key={i} className="w-[2px] flex-1 rounded-full bg-emerald-500/60" style={{ height: `${h * 9}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${i < 2 ? "bg-emerald-500/30 ring-1 ring-emerald-500" : "bg-zinc-700"}`} />
          ))}
          <span className="flex-1" />
          <span className="rounded bg-zinc-700 px-2 py-0.5 text-[8px] font-semibold">Mark moment · space</span>
          <span className="rounded bg-red-600 px-2 py-0.5 text-[8px] font-bold">End show</span>
        </div>
      </div>
      <div className="hidden w-24 shrink-0 flex-col gap-1 lg:flex">
        <p className="text-[7px] font-bold uppercase tracking-wide text-zinc-500">Media</p>
        {["Intro sting", "Sponsor card", "Outro reel"].map((m) => (
          <div key={m} className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[8px]">{m}</div>
        ))}
        <p className="mt-1 text-[7px] font-bold uppercase tracking-wide text-zinc-500">Channels</p>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[#FF0000]" />
          <span className="h-2 w-2 rounded-full bg-[#E1306C]" />
          <span className="h-2 w-2 rounded-full bg-[#9146FF]" />
        </div>
      </div>
    </div>
  );
}

function PodcastView() {
  return (
    <div className="h-full overflow-hidden bg-[#f6f6f7] p-4 text-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Shows</p>
        <span className="rounded-md bg-zinc-900 px-2 py-1 text-[8px] font-semibold text-white">+ Add a show</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md p-1 text-center" style={{ background: "linear-gradient(150deg,#14532d,#0c4a6e)" }}>
            <span className="text-[6px] font-black uppercase leading-tight tracking-wide text-white">Veteran<br/>Benefits<br/>Podcast</span>
            <span className="mt-0.5 text-[6px] text-emerald-300">★★★★★</span>
          </span>
          <span className="min-w-0">
            <p className="truncate text-[10px] font-bold">Veteran Benefits Podcast</p>
            <p className="text-[8px] text-zinc-400">10 episodes</p>
            <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-1.5 text-[7px] font-semibold text-emerald-700">Hosted on Podlogix</span>
          </span>
        </div>
        <div className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md p-1 text-center" style={{ background: "linear-gradient(150deg,#450a0a,#1c1917)" }}>
            <span className="text-[6px] font-black uppercase leading-tight tracking-wide text-amber-300">The<br/>Warrior<br/>Mindset</span>
            <span className="mt-0.5 text-[5px] font-bold uppercase text-white/60">MCDP Audio</span>
          </span>
          <span className="min-w-0">
            <p className="truncate text-[10px] font-bold">The Warrior Mindset</p>
            <p className="text-[8px] text-zinc-400">42 episodes</p>
            <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-1.5 text-[7px] font-semibold text-zinc-600">Synced from Buzzsprout</span>
          </span>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 p-2 text-center">
          <span>
            <p className="text-lg font-light text-zinc-300">+</p>
            <p className="text-[8px] font-medium text-zinc-500">Host here, or sync your feed</p>
            <p className="text-[7px] text-zinc-400">RSS · Buzzsprout · upload</p>
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-[8px] font-bold uppercase tracking-wide text-zinc-400">Recent episodes</p>
      <div className="mt-1 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {[
          ["MCDP-1 Warfighting — Chapter 1", "The Warrior Mindset", "Published · Aug 12", false],
          ["The GI Bill's fine print, with Sarah Chen", "Veteran Benefits Podcast", "Published · Aug 5", false],
          ["Live from the veteran founders meetup", "Veteran Benefits Podcast", "Draft", true],
        ].map(([t, show, s, draft]) => (
          <div key={String(t)} className="flex items-center gap-2 px-2 py-1">
            <span className="h-5 w-5 shrink-0 rounded" style={{ background: show === "The Warrior Mindset" ? "linear-gradient(150deg,#450a0a,#1c1917)" : "linear-gradient(150deg,#14532d,#0c4a6e)" }} />
            <span className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium">{t}</p>
              <p className="text-[7px] text-zinc-400">{show}</p>
            </span>
            <span className={`shrink-0 rounded-full px-1.5 text-[7px] font-semibold ${draft ? "bg-zinc-100 text-zinc-500" : "bg-emerald-100 text-emerald-700"}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefineryView() {
  return (
    <div className="flex h-full gap-2.5 overflow-hidden bg-[#f6f6f7] p-4 text-zinc-900">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Refiner</p>
          <span className="rounded bg-red-600 px-2 py-0.5 text-[8px] font-bold text-white">Refining\u2026</span>
        </div>
        <div className="relative mt-1.5 overflow-hidden rounded-lg bg-zinc-950 p-2">
          <p className="truncate text-[8px] font-semibold text-zinc-400">The OCS Boot Review \u2014 Aug 12 show \u00b7 01:12:40</p>
          <div className="mt-1.5 flex h-9 items-end gap-[2px]">
            {[4, 7, 5, 9, 3, 8, 6, 10, 7, 4, 8, 5, 9, 6, 3, 7, 10, 5, 8, 4, 6, 9, 7, 5, 8, 3, 6, 9, 4, 7, 5, 8, 10, 6, 4, 7].map((h, i) => (
              <span key={i} className={`flex-1 rounded-sm ${i < 23 ? "bg-emerald-500/80" : "bg-zinc-700"}`} style={{ height: `${h * 10}%` }} />
            ))}
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
            <span className="block h-full w-[64%] rounded-full bg-red-500" />
          </div>
          <p className="mt-1 text-[7px] font-medium text-zinc-500">Removing gaps \u2014 64% \u00b7 2.1 min of dead air cut so far</p>
        </div>
        <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-zinc-400">Clips made so far</p>
        <div className="mt-1 flex gap-1.5">
          {[["16:9", "Clip \u00b7 42s"], ["16:9", "Clip \u00b7 38s"], ["9:16", "Vertical \u00b7 24s"]].map(([ratio, label]) => (
            <div key={label} className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <div className={`flex items-center justify-center bg-zinc-950 ${ratio === "9:16" ? "h-11 w-7" : "h-8 w-14"}`}>
                <span className="ml-0.5 border-y-[3px] border-l-[5px] border-y-transparent border-l-white/80" />
              </div>
              <p className="px-1 py-0.5 text-[6.5px] font-semibold text-zinc-600">{label}</p>
            </div>
          ))}
          <div className="flex items-center rounded-md border border-dashed border-zinc-300 px-1.5 text-[7px] text-zinc-400">+ more as it listens</div>
        </div>
      </div>
      <div className="w-32 shrink-0">
        <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">Pipeline</p>
        <div className="mt-1 space-y-1">
          {[["Transcription", "done"], ["Find moments", "done"], ["Remove gaps", "now"], ["Audio cleanup", "next"], ["Remove fillers", "soon"]].map(([l, s]) => (
            <div key={String(l)} className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 ${s === "now" ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"}`}>
              {s === "done" ? (
                <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
              ) : s === "now" ? (
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              ) : (
                <Circle className="h-2.5 w-2.5 shrink-0 text-zinc-300" />
              )}
              <span className="text-[8px] font-medium">{l}</span>
              {s === "done" && <span className="ml-auto text-[7px] font-semibold text-emerald-600">Done</span>}
              {s === "now" && <span className="ml-auto text-[7px] font-semibold text-red-600">64%</span>}
              {s === "soon" && <span className="ml-auto rounded-full bg-zinc-100 px-1 text-[6px] font-semibold text-zinc-400">Soon</span>}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {[["3.4", "min saved"], ["69", "fillers"]].map(([v, l]) => (
            <div key={l} className="rounded-md border border-zinc-200 bg-white py-0.5 text-center">
              <p className="text-[10px] font-bold tabular-nums">{v}</p>
              <p className="text-[6.5px] text-zinc-400">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[7px] leading-snug text-zinc-400">Everything lands in Media Storage \u2014 badged Refined.</p>
      </div>
    </div>
  );
}

const VIEWS: Record<TourId, () => JSX.Element> = {
  dashboard: DashboardView,
  studio: StudioView,
  podcast: PodcastView,
  refinery: RefineryView,
};

// ── Section ──────────────────────────────────────────────────────────────────

export function WorkspaceShowcase() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [tourId, setTourId] = useState<TourId>("dashboard");
  const tour = TOUR.find((t) => t.id === tourId)!;
  const View = VIEWS[tourId];

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const mockupY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [40, -40]);

  return (
    <section id="workspace-showcase" ref={ref} className="relative overflow-hidden py-24 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #D97706 0%, transparent 65%)", filter: "blur(100px)" }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mx-auto mb-10 max-w-xl text-center">
          <SectionKicker className="text-center">The workspace</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            <span className="block">Every room, one roof.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Click through the rooms — dashboard, studio, podcast, Refiner. Demo data; the real thing is one signup away.
          </p>
        </motion.div>

        {/* Tour tabs */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {TOUR.map((t) => (
            <button
              key={t.id}
              onClick={() => setTourId(t.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                t.id === tourId
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.16] hover:text-foreground"
              }`}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} style={{ y: mockupY }} className="mx-auto max-w-5xl">
          <div style={{ perspective: "1600px", perspectiveOrigin: "50% 40%" }}>
            <motion.div
              initial={{ rotateX: reduceMotion ? 6 : 14, opacity: 0 }}
              whileInView={{ rotateX: 6, opacity: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-x-16 -bottom-10 h-20 rounded-full bg-black/60 blur-3xl" />

              {/* Browser frame */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_60px_120px_rgba(0,0,0,0.8)]">
                <div className="flex h-10 items-center gap-3 border-b border-white/[0.06] bg-[#141414] px-5">
                  <div className="flex shrink-0 items-center gap-[6px]">
                    <span className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
                    <span className="h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
                    <span className="h-[10px] w-[10px] rounded-full bg-[#28C840]" />
                  </div>
                  <div className="mx-auto max-w-[220px] flex-1 rounded-md bg-white/[0.06] px-3 py-[3px] text-center text-[10px] text-muted-foreground/40">
                    {tour.url}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 opacity-30">
                    <span className="h-3 w-3 rounded-sm border border-white/20" />
                    <span className="h-3 w-3 rounded-sm border border-white/20" />
                  </div>
                </div>

                {/* Demo view */}
                <div className="aspect-[16/9] w-full sm:aspect-[16/8]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tourId}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="h-full"
                    >
                      <View />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 h-24 bg-gradient-to-b from-white/[0.03] to-transparent" />
              </div>
            </motion.div>
          </div>

          {/* Captions follow the selected room */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {tour.captions.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
            <Link href="/login">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-shadow hover:shadow-primary/50">
                Step inside the workspace <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
