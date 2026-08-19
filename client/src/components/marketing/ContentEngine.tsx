import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Mic2, Radio, Presentation, Trophy, Scissors, Star, Share2, Mail, Handshake,
  Megaphone, FileText, Users, BarChart3,
} from "lucide-react";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, viewportOnce } from "./motion";

/**
 * The Content Engine — a simulated session showing the product's core idea:
 * one stream in → Podlogix → everything else out. This is a proof-of-concept
 * section (a designer will reskin the homepage): data lives in the arrays
 * below so labels/outputs/events can change without touching the rendering,
 * and all styling leans on existing tokens. The activity feed is an
 * illustrative loop, clearly framed as an example session — no fake user
 * claims, no latency promises.
 */

// ── Data ─────────────────────────────────────────────────────────────────────

type OutputId =
  | "clips" | "highlights" | "social" | "newsletter" | "sponsors"
  | "advertising" | "shownotes" | "audience" | "analytics";

interface ActivityEvent {
  at: string;        // simulated session clock
  trigger: string;   // what the engine noticed
  output: OutputId;  // which card lights up
  result: string;    // what came out
  status: string;    // engine status line while working
}

interface SourceType {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  streamLabel: string;
  outputPriority: OutputId[]; // first six become cards, rest become chips
  events: ActivityEvent[];
}

const OUTPUT_TYPES: Record<OutputId, { label: string; sub: string; Icon: React.ComponentType<{ className?: string }> }> = {
  clips:       { label: "Clips",       sub: "Short-form vertical content",        Icon: Scissors },
  highlights:  { label: "Highlights",  sub: "Important moments, found for you",   Icon: Star },
  social:      { label: "Social",      sub: "Posts prepared for your channels",   Icon: Share2 },
  newsletter:  { label: "Newsletter",  sub: "Your broadcast, ready to send",      Icon: Mail },
  sponsors:    { label: "Sponsors",    sub: "Opportunities and integrations",     Icon: Handshake },
  advertising: { label: "Advertising", sub: "Monetizable inventory",              Icon: Megaphone },
  shownotes:   { label: "Show Notes",  sub: "Long-form written content",          Icon: FileText },
  audience:    { label: "Audience",    sub: "Subscribers and engagement",         Icon: Users },
  analytics:   { label: "Analytics",   sub: "Performance, tied to the source",    Icon: BarChart3 },
};

const INTEGRATION_SOURCES = ["Podlogix Studio", "Zoom", "OBS", "RTMP"];

const SOURCE_TYPES: SourceType[] = [
  {
    id: "podcast", label: "Podcast", Icon: Mic2, streamLabel: "Recording in session",
    outputPriority: ["clips", "highlights", "social", "newsletter", "sponsors", "audience", "shownotes", "advertising", "analytics"],
    events: [
      { at: "00:04:12", trigger: "Strong moment detected",  output: "clips",      result: "Clip created — 42 sec",          status: "Finding moments…" },
      { at: "00:07:34", trigger: "Key insight detected",    output: "highlights", result: "Highlight saved",                status: "Listening…" },
      { at: "00:11:08", trigger: "Topic developed",         output: "newsletter", result: "Newsletter section drafted",     status: "Building newsletter…" },
      { at: "00:14:21", trigger: "Sponsor opportunity",     output: "sponsors",   result: "Sponsor opportunity identified", status: "Matching sponsor…" },
      { at: "00:18:46", trigger: "Shareable quote",         output: "social",     result: "3 social posts prepared",        status: "Preparing social…" },
    ],
  },
  {
    id: "livestream", label: "Livestream", Icon: Radio, streamLabel: "Live on air",
    outputPriority: ["clips", "social", "highlights", "audience", "sponsors", "newsletter", "shownotes", "advertising", "analytics"],
    events: [
      { at: "00:03:02", trigger: "Strong moment detected",  output: "clips",      result: "Clip created — 38 sec",       status: "Finding moments…" },
      { at: "00:06:41", trigger: "Shareable quote",         output: "social",     result: "2 social posts prepared",     status: "Preparing social…" },
      { at: "00:09:15", trigger: "Audience surge",          output: "audience",   result: "New subscribers captured",    status: "Listening…" },
      { at: "00:12:30", trigger: "Sponsor opportunity",     output: "sponsors",   result: "Sponsor slot flagged",        status: "Matching sponsor…" },
      { at: "00:16:05", trigger: "Key insight detected",    output: "highlights", result: "Highlight saved",             status: "Creating highlight…" },
    ],
  },
  {
    id: "conference", label: "Conference", Icon: Presentation, streamLabel: "Sessions underway",
    outputPriority: ["highlights", "clips", "social", "sponsors", "shownotes", "audience", "newsletter", "advertising", "analytics"],
    events: [
      { at: "00:05:20", trigger: "New speaker on stage",    output: "highlights", result: "Speaker highlight started",   status: "Creating highlight…" },
      { at: "00:09:47", trigger: "Quotable moment",         output: "clips",      result: "Clip created — 51 sec",       status: "Finding moments…" },
      { at: "00:13:12", trigger: "Session wrapped",         output: "shownotes",  result: "Session recap drafted",       status: "Writing recap…" },
      { at: "00:16:58", trigger: "Sponsor opportunity",     output: "sponsors",   result: "Sponsor mention packaged",    status: "Matching sponsor…" },
      { at: "00:21:33", trigger: "Panel takeaway",          output: "social",     result: "4 social posts prepared",     status: "Preparing social…" },
    ],
  },
  {
    id: "event", label: "Live Event", Icon: Trophy, streamLabel: "Event in progress",
    outputPriority: ["highlights", "social", "audience", "advertising", "clips", "analytics", "sponsors", "newsletter", "shownotes"],
    events: [
      { at: "00:02:55", trigger: "Big moment on the field", output: "highlights",  result: "Highlight saved",            status: "Creating highlight…" },
      { at: "00:06:18", trigger: "Crowd reaction",          output: "clips",       result: "Clip created — 24 sec",      status: "Finding moments…" },
      { at: "00:10:02", trigger: "Attendance building",     output: "audience",    result: "Audience growth logged",     status: "Listening…" },
      { at: "00:13:40", trigger: "Break coming up",         output: "advertising", result: "Ad slot flagged",            status: "Flagging inventory…" },
      { at: "00:17:26", trigger: "Shareable moment",        output: "social",      result: "3 social posts prepared",    status: "Preparing social…" },
    ],
  },
];

const EVENT_MS = 3400;

// ── Component ────────────────────────────────────────────────────────────────

export function ContentEngine() {
  const reduceMotion = useReducedMotion();
  const [sourceId, setSourceId] = useState(SOURCE_TYPES[0].id);
  const [eventIdx, setEventIdx] = useState(0);

  const source = SOURCE_TYPES.find((s) => s.id === sourceId)!;
  const event = source.events[eventIdx % source.events.length];
  const primaryOutputs = source.outputPriority.slice(0, 6);
  const extraOutputs = source.outputPriority.slice(6);

  useEffect(() => {
    if (reduceMotion) return; // static worked example instead of a loop
    const t = setInterval(() => setEventIdx((i) => i + 1), EVENT_MS);
    return () => clearInterval(t);
  }, [reduceMotion, sourceId]);

  const pickSource = (id: string) => {
    setSourceId(id);
    setEventIdx(0);
  };

  return (
    <section id="content-engine" className="border-y border-white/5 py-28 lg:py-36">
      <style>{`
        @keyframes ce-pulse-x { 0% { transform: translateX(0); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateX(var(--ce-travel, 140px)); opacity: 0; } }
        @keyframes ce-pulse-y { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(44px); opacity: 0; } }
      `}</style>
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mx-auto mb-6 max-w-2xl text-center">
          <SectionKicker className="text-center">The Content Engine</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            One stream in. Everything else out.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Podcast, livestream, conference, or event — Podlogix turns your broadcast into clips, highlights,
            social content, newsletters, sponsor opportunities, and more as it happens.
          </p>
        </motion.div>

        {/* Source switcher */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mb-10 flex flex-wrap items-center justify-center gap-2">
          {SOURCE_TYPES.map((s) => (
            <button
              key={s.id}
              onClick={() => pickSource(s.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                s.id === sourceId
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.16] hover:text-foreground"
              }`}
            >
              <s.Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* ── The flow ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:gap-0">

            {/* 1 · Source */}
            <div className="mx-auto w-full max-w-[240px] shrink-0 lg:mx-0">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                  <source.Icon className="h-5 w-5 text-foreground/80" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{source.label}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full bg-red-500 ${reduceMotion ? "" : "animate-pulse"}`} />
                  {source.streamLabel}
                </p>
                {/* Simulated session clock — makes the "example session" framing explicit */}
                <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground/60">{event.at}</p>
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/60">
                Use Podlogix Studio or bring your existing stream.
                <span className="mt-0.5 block text-muted-foreground/40">{INTEGRATION_SOURCES.join(" · ")}</span>
              </p>
            </div>

            {/* Stream: source → engine */}
            <div className="relative mx-auto h-11 w-px shrink-0 bg-gradient-to-b from-white/5 via-white/20 to-white/5 lg:mx-4 lg:h-px lg:flex-1 lg:bg-gradient-to-r" aria-hidden>
              {!reduceMotion && (
                <>
                  <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(216,75,45,0.5)] lg:left-0 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0" style={{ animation: "ce-pulse-y 1.7s linear infinite" }} />
                  <span className="hidden lg:block absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary/70 shadow-[0_0_8px_2px_rgba(216,75,45,0.4)]" style={{ animation: "ce-pulse-x 1.7s linear infinite", animationDelay: "0.85s", ["--ce-travel" as string]: "100%" }} />
                </>
              )}
            </div>

            {/* 2 · Podlogix engine */}
            <div className="mx-auto w-full max-w-[280px] shrink-0 lg:mx-0">
              <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-white/[0.03] p-6 text-center shadow-[0_0_60px_-20px_rgba(216,75,45,0.45)]">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 0%, rgba(216,75,45,0.25), transparent 65%)" }} />
                <p className="relative font-display text-xl font-bold tracking-wide text-foreground">PODLOGIX</p>
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Content Engine</p>
                {/* Status — fixed height so the loop never shifts layout */}
                <div className="relative mt-4 flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${sourceId}-${eventIdx}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p className="text-xs font-medium text-primary">{event.status}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{event.trigger}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40">
                Example session
              </p>
            </div>

            {/* Branch: engine → outputs */}
            <div className="relative mx-auto h-11 w-px shrink-0 bg-gradient-to-b from-white/5 via-white/20 to-white/5 lg:mx-4 lg:h-px lg:flex-1 lg:bg-gradient-to-r" aria-hidden>
              {!reduceMotion && (
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(216,75,45,0.5)] lg:left-0 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0" style={{ animation: "ce-pulse-y 1.7s linear infinite", animationDelay: "0.4s", ["--ce-travel" as string]: "100%" }} />
              )}
            </div>

            {/* 3 · Outputs — expansive on purpose: one thing in, many out */}
            <div className="w-full lg:max-w-[46%]">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {primaryOutputs.map((id) => {
                  const o = OUTPUT_TYPES[id];
                  const active = event.output === id;
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border p-3 transition-all duration-500 ${
                        active
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_0_24px_-8px_rgba(216,75,45,0.5)]"
                          : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <o.Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/70"}`} />
                        <p className={`text-xs font-semibold ${active ? "text-foreground" : "text-foreground/80"}`}>{o.label}</p>
                      </div>
                      {/* Fixed-height caption zone: result when active, sub otherwise */}
                      <p className={`mt-1.5 min-h-[2rem] text-[10px] leading-snug ${active ? "font-medium text-primary/90" : "text-muted-foreground/60"}`}>
                        {active ? event.result : o.sub}
                      </p>
                    </div>
                  );
                })}
              </div>
              {extraOutputs.length > 0 && (
                <p className="mt-3 text-[11px] text-muted-foreground/50">
                  Also flowing:{" "}
                  {extraOutputs.map((id, i) => (
                    <span key={id} className={event.output === id ? "font-semibold text-primary/80" : ""}>
                      {OUTPUT_TYPES[id].label}
                      {i < extraOutputs.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footnote */}
        <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mt-10 text-center text-xs text-muted-foreground/40">
          Different source, same engine — the stream is the input; everything else is what Podlogix makes of it.
        </motion.p>
      </div>
    </section>
  );
}
