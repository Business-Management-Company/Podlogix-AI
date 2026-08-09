import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play, Mic, BarChart3, Shield, Headphones, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./Magnetic";
import { easing } from "@/lib/design-tokens";

// ─── Waveform bars ────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS = [40, 80, 55, 95, 45, 75, 60, 90, 50, 70, 35, 85];

function WaveformViz({
  reduceMotion,
  color = "rgba(255,255,255,0.9)",
  barCount = 12,
}: {
  reduceMotion: boolean | null;
  color?: string;
  barCount?: number;
}) {
  const heights = WAVEFORM_HEIGHTS.slice(0, barCount);
  return (
    <div className="flex items-end gap-[4px]" style={{ height: 56 }}>
      {heights.map((h, i) =>
        reduceMotion ? (
          <span
            key={i}
            className="w-[4px] rounded-full"
            style={{ height: `${h}%`, backgroundColor: color }}
          />
        ) : (
          <motion.span
            key={i}
            className="w-[4px] rounded-full"
            style={{ backgroundColor: color }}
            animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.3}%`] }}
            transition={{
              duration: 0.8 + (i % 4) * 0.18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.07,
            }}
          />
        )
      )}
    </div>
  );
}

// ─── Pulsing dot ─────────────────────────────────────────────────────────────

function LiveDot({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion)
    return <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" />;
  return (
    <motion.span
      className="relative inline-flex h-2 w-2 rounded-full bg-rose-400"
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────

function StatCounter({ target, suffix, reduceMotion }: { target: number; suffix: string; reduceMotion: boolean | null }) {
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion) { setValue(target); return; }
    let f: number;
    const t0 = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [target, reduceMotion]);
  return <>{value.toFixed(1)}{suffix}</>;
}

// ─── Mini episode card ────────────────────────────────────────────────────────

function EpisodeCard({
  color,
  icon: Icon,
  accent,
  category,
  duration,
  title,
  delay,
  reduceMotion,
}: {
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  category: string;
  duration: string;
  title: string;
  delay: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: color }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}22` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-white/50">{category} · {duration}</p>
      </div>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}22` }}
      >
        <Play className="h-3 w-3 ml-[2px]" style={{ color: accent }} />
      </div>
    </motion.div>
  );
}

// ─── Stagger variants ─────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easing.spring } },
};

const lineReveal = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: 0.34, ease: easing.spring } },
};

// ─── Hero ────────────────────────────────────────────────────────────────────

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-16 pt-24 lg:pb-24 lg:pt-36"
    >
      {/* ── Warm ambient glow ─────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Warm orange-amber spill from the right — lights the cards */}
        <div className="absolute right-[5%] top-[-5%] h-[700px] w-[700px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #D97706 0%, transparent 70%)", filter: "blur(100px)" }}
        />
        {/* Cool green tint for the left so headline pops */}
        <div className="absolute left-[-10%] top-[25%] h-[500px] w-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)", filter: "blur(120px)" }}
        />
        {/* Deep warm floor tint — the Whispr background warmth */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 70% 50%, rgba(120,53,15,0.18) 0%, transparent 70%)" }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14 xl:gap-20">

          {/* ── LEFT: text content ──────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={item}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now in public beta
            </motion.div>

            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4rem] xl:text-[4.6rem] lg:leading-[0.98]">
              {["Run your entire", "podcast business", "from one workspace."].map((line) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span variants={lineReveal} className="block">{line}</motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              variants={item}
              className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Episodes, audience, sponsors, distribution, and your team — connected in one place.{" "}
              <span className="font-semibold text-foreground">
                Hosting is included. It's just not the point.
              </span>
            </motion.p>

            <motion.div
              variants={item}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <Magnetic className="inline-block">
                <Button
                  size="lg"
                  className="h-13 rounded-full px-7 text-base shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow duration-300"
                  asChild
                  data-testid="button-hero-start"
                >
                  <Link href="/login">
                    Start free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic className="inline-block">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-full border-white/10 px-7 text-base hover:bg-white/5"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("workspace-showcase")
                      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
                  }}
                  data-testid="button-hero-workspace"
                >
                  See the workspace
                </Button>
              </Magnetic>
            </motion.div>

            <motion.p variants={item} className="mt-5 text-xs text-muted-foreground/50">
              No credit card required · Free during the beta
            </motion.p>
          </motion.div>

          {/* ── RIGHT: colorful podcast showcase ─────────────────────────── */}
          <div className="hidden lg:flex lg:gap-4">

            {/* ── Featured show card ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-1 flex-col overflow-hidden rounded-2xl p-6"
              style={{
                background: "linear-gradient(155deg, #7C2D12 0%, #C2410C 38%, #D97706 72%, #92400E 100%)",
                minHeight: 420,
              }}
            >
              {/*
                HERO HOST IMAGE — drop a photo at /images/hero-host.jpg (or .png/.webp)
                and it will appear on the right half of this card, blending into the
                gradient on the left. Remove the `hidden` class once the image is ready.
                Ideal specs: portrait orientation, 800×1000px min, subject facing left,
                warm studio or natural lighting. Try Unsplash, Pexels, or Midjourney.
              */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-[58%]"
                style={{
                  backgroundImage: "url('/images/hero-host.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                }}
              />
              {/* Left-side gradient overlay so text is always readable over the photo */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(to right, #7C2D12 30%, rgba(194,65,12,0.85) 55%, rgba(217,119,6,0.3) 80%, transparent 100%)",
                }}
              />

              {/* Decorative orb inside the card (shows when no photo is present) */}
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, #FDE68A 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
              />

              {/* Top: live indicator */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-white/80 backdrop-blur-sm">
                  <LiveDot reduceMotion={reduceMotion} />
                  Live Now
                </div>
                <span className="text-[11px] text-white/40 tabular-nums">1:22:47</span>
              </div>

              {/* Middle: waveform visualization */}
              <div className="flex flex-1 items-center justify-center py-8">
                <WaveformViz reduceMotion={reduceMotion} color="rgba(255,255,255,0.85)" barCount={12} />
              </div>

              {/* Bottom: show info */}
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-white/50">
                  Episode 47
                </p>
                <h3 className="mb-1 text-xl font-bold leading-tight text-white">
                  Veteran Benefits Podcast
                </h3>
                <p className="mb-4 text-sm text-white/60">
                  Navigating VA Claims in 2025
                </p>
                <div className="flex items-center gap-3">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30">
                    <Play className="ml-0.5 h-4 w-4 text-white" />
                  </button>
                  <div>
                    <p className="text-xs font-medium text-white">Now Playing</p>
                    <p className="text-[10px] text-white/50">38.4K listeners</p>
                  </div>
                </div>
              </div>

              {/* Stat chip — floats in bottom-right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.85 }}
                className="absolute bottom-5 right-5 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-right backdrop-blur-md"
              >
                <p className="font-display text-lg font-bold leading-none text-white">
                  <StatCounter target={38.4} suffix="K" reduceMotion={reduceMotion} />
                </p>
                <p className="text-[10px] text-white/50">↑ 22% this week</p>
              </motion.div>
            </motion.div>

            {/* ── Right stack: episode cards ── */}
            <div className="flex w-[200px] shrink-0 flex-col gap-3">

              {/* "Up next" label */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
              >
                Up next
              </motion.p>

              <EpisodeCard
                color="#0D2E1A"
                icon={Mic}
                accent="#34D399"
                category="Business"
                duration="38 min"
                title="Morning Briefing"
                delay={0.55}
                reduceMotion={reduceMotion}
              />
              <EpisodeCard
                color="#1A103A"
                icon={Radio}
                accent="#A78BFA"
                category="Tech"
                duration="52 min"
                title="Deep Dive Weekly"
                delay={0.65}
                reduceMotion={reduceMotion}
              />
              <EpisodeCard
                color="#1A0D2A"
                icon={BarChart3}
                accent="#F472B6"
                category="Growth"
                duration="44 min"
                title="Creator Economy"
                delay={0.75}
                reduceMotion={reduceMotion}
              />
              <EpisodeCard
                color="#0D1A2E"
                icon={Headphones}
                accent="#60A5FA"
                category="Culture"
                duration="1 hr"
                title="Future of Work"
                delay={0.85}
                reduceMotion={reduceMotion}
              />
              <EpisodeCard
                color="#1A1A0A"
                icon={Shield}
                accent="#FBBF24"
                category="Identity"
                duration="28 min"
                title="Voice Certified"
                delay={0.95}
                reduceMotion={reduceMotion}
              />

              {/* "Your library" link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.1 }}
                className="pt-1"
              >
                <Link href="/login">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground">
                    Your full library <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
