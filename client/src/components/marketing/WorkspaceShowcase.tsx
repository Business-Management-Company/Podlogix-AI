import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Radio, Mic, Wand2, CheckCircle2, Circle, ArrowRight,
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
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-5 w-5 rounded-md ${i === 0 ? "bg-white/25" : "bg-white/10"}`} />
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden p-4">
        <p className="text-sm font-bold">Good evening, Andrew</p>
        <p className="text-[9px] text-zinc-400">Tuesday · 2 shows on the calendar</p>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {[["Shows", "2"], ["Episodes", "24"], ["Live channels", "4"], ["Followers", "12.4K"]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
              <p className="text-sm font-bold tabular-nums">{v}</p>
              <p className="text-[8px] font-medium text-zinc-400">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {["Instagram", "YouTube", "Facebook", "X"].map((p) => (
            <span key={p} className="flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[8px] font-medium text-white">
              <span className="h-1 w-1 rounded-full bg-emerald-400" /> {p}
            </span>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">Guest pipeline</p>
            {[["Sarah Chen", "Invited"], ["Mike Torres", "Confirmed"]].map(([n, s]) => (
              <div key={n} className="mt-1 flex items-center justify-between">
                <span className="text-[9px] font-medium">{n}</span>
                <span className={`rounded-full px-1.5 text-[7px] font-semibold ${s === "Confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">This week</p>
            {[["Tue 7 PM", "The OCS Boot Review — live"], ["Thu 12 PM", "Guest prep · Sarah Chen"]].map(([t, e]) => (
              <div key={t} className="mt-1 flex items-center gap-1.5">
                <span className="rounded bg-red-50 px-1 text-[7px] font-bold text-red-600">{t}</span>
                <span className="truncate text-[9px]">{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioView() {
  return (
    <div className="flex h-full gap-2 bg-[#0b0b0d] p-3 text-zinc-100">
      <div className="hidden w-20 shrink-0 flex-col gap-1.5 sm:flex">
        {["Countdown", "Welcome", "Outro"].map((s, i) => (
          <div key={s} className={`overflow-hidden rounded-md border ${i === 1 ? "border-red-500" : "border-zinc-800"}`}>
            <div className="h-7" style={{ background: ["linear-gradient(135deg,#2a1a3e,#0f2740)", "linear-gradient(135deg,#3e1a1a,#402a0f)", "linear-gradient(135deg,#1a3e2e,#0f2440)"][i] }} />
            <p className="bg-zinc-900 px-1 py-0.5 text-[7px] font-medium">{s}</p>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="relative flex flex-1 gap-1 overflow-hidden rounded-lg bg-zinc-900 p-1">
          <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-bold">LIVE 00:42:18</span>
          <div className="flex flex-1 items-end rounded bg-gradient-to-br from-zinc-700 to-zinc-800 p-1.5">
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold">Andrew</span>
          </div>
          <div className="flex flex-1 items-end rounded bg-gradient-to-br from-[#2a3548] to-zinc-800 p-1.5">
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold">Sarah Chen · Guest</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 rounded-md bg-zinc-900 py-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-3.5 w-6 rounded-sm ${i === 5 ? "ring-1 ring-red-500 bg-zinc-600" : "bg-zinc-800"}`} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${i === 0 ? "bg-emerald-500/30 ring-1 ring-emerald-500" : "bg-zinc-700"}`} />
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
      </div>
    </div>
  );
}

function PodcastView() {
  return (
    <div className="h-full overflow-hidden bg-[#f6f6f7] p-4 text-zinc-900">
      <p className="text-sm font-bold">Shows</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[
          { name: "Veteran Benefits Podcast", meta: "10 episodes", chip: "Hosted on Podlogix", g: "linear-gradient(135deg,#1a3e2e,#0f2440)" },
          { name: "The Warrior Mindset", meta: "42 episodes", chip: "Synced from Buzzsprout", g: "linear-gradient(135deg,#3e1a1a,#402a0f)" },
        ].map((s) => (
          <div key={s.name} className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2">
            <span className="h-10 w-10 shrink-0 rounded-md" style={{ background: s.g }} />
            <span className="min-w-0">
              <p className="truncate text-[10px] font-bold">{s.name}</p>
              <p className="text-[8px] text-zinc-400">{s.meta}</p>
              <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-1.5 text-[7px] font-semibold text-zinc-600">{s.chip}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[8px] font-bold uppercase tracking-wide text-zinc-400">Recent episodes</p>
      <div className="mt-1 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {[
          ["EP 24 · Transition timelines that actually work", "Published · Aug 12"],
          ["EP 23 · Sarah Chen on the GI Bill's fine print", "Published · Aug 5"],
          ["EP 22 · Live from the veteran founders meetup", "Draft"],
        ].map(([t, s]) => (
          <div key={t} className="flex items-center justify-between px-2 py-1">
            <span className="truncate text-[9px] font-medium">{t}</span>
            <span className={`ml-2 shrink-0 rounded-full px-1.5 text-[7px] font-semibold ${s === "Draft" ? "bg-zinc-100 text-zinc-500" : "bg-emerald-100 text-emerald-700"}`}>{s}</span>
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
        <p className="text-sm font-bold">Refiner</p>
        <div className="mt-2 flex aspect-video items-center justify-center rounded-lg bg-zinc-950">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <span className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="truncate text-[9px] font-semibold">The OCS Boot Review — Aug 12 show</p>
          <span className="rounded bg-red-600 px-2 py-0.5 text-[8px] font-bold text-white">Refine my show</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[["6.4", "Minutes saved"], ["69", "Fillers heard"], ["4", "Clips ready"]].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-zinc-200 bg-white py-1 text-center">
              <p className="text-xs font-bold tabular-nums">{v}</p>
              <p className="text-[7px] font-medium text-zinc-400">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-32 shrink-0">
        <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400">Pipeline</p>
        <div className="mt-1 space-y-1">
          {[["Transcription", true], ["Remove gaps", true], ["Audio cleanup", true], ["Remove fillers", false]].map(([l, done]) => (
            <div key={String(l)} className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-1.5 py-1">
              {done ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500" /> : <Circle className="h-2.5 w-2.5 shrink-0 text-zinc-300" />}
              <span className="text-[8px] font-medium">{l}</span>
              {done ? <span className="ml-auto text-[7px] font-semibold text-emerald-600">Done</span> : <span className="ml-auto rounded-full bg-zinc-100 px-1 text-[6px] font-semibold text-zinc-400">Soon</span>}
            </div>
          ))}
        </div>
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
