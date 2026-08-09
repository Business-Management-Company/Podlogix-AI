import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./Magnetic";
import { cursorSpring } from "./motion";
import { easing } from "@/lib/design-tokens";

const HEADLINE = ["Run your entire", "podcast business", "from one workspace."];

const WAVEFORM_HEIGHTS = [45, 85, 55, 70, 40, 65];

function WaveformBars({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {WAVEFORM_HEIGHTS.map((h, i) =>
        reduceMotion ? (
          <span key={i} className="w-[3px] rounded-full bg-primary" style={{ height: `${h}%` }} />
        ) : (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-primary"
            animate={{ height: [`${h * 0.35}%`, `${h}%`, `${h * 0.35}%`] }}
            transition={{
              duration: 0.9 + (i % 3) * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.09,
            }}
          />
        )
      )}
    </div>
  );
}

function PulsingDot({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion) {
    return <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />;
  }
  return (
    <motion.span
      className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"
      animate={{
        opacity: [1, 0.55, 1],
        boxShadow: [
          "0 0 0px 0px hsl(var(--primary) / 0.6)",
          "0 0 8px 3px hsl(var(--primary) / 0.5)",
          "0 0 0px 0px hsl(var(--primary) / 0.6)",
        ],
      }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function FloatWrapper({
  reduceMotion,
  duration,
  delay,
  children,
}: {
  reduceMotion: boolean | null;
  duration: number;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={reduceMotion ? undefined : { duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function StatCounter({ target, suffix, reduceMotion }: { target: number; suffix: string; reduceMotion: boolean | null }) {
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) { setValue(target); return; }
    let frame: number;
    const start = performance.now();
    const dur = 1200;
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion]);

  return <>{value.toFixed(1)}{suffix}</>;
}

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easing.spring } },
};

const heroLineReveal = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: 0.34, ease: easing.spring } },
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.15]);
  const glowY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 100]);
  // Parallax — mockup drifts up slightly slower than the page scroll
  const mockupY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 60]);

  const glowX = useMotionValue(0);
  const springGlowX = useSpring(glowX, cursorSpring);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(((e.clientX - rect.left) / rect.width - 0.5) * 30);
  }

  function scrollToWorkspace(e: React.MouseEvent) {
    e.preventDefault();
    document
      .getElementById("workspace-showcase")
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pb-16 pt-28 lg:pb-24 lg:pt-36"
    >
      {/* ── Ambient glow ─────────────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        style={{ opacity: glowOpacity, y: glowY, x: springGlowX }}
        className="pointer-events-none absolute inset-0"
      >
        {/* Primary glow — sits behind and to the right to light the mockup */}
        <div className="absolute right-[8%] top-[-8%] h-[650px] w-[750px] rounded-full bg-primary/[0.15] blur-[180px]" />
        {/* Secondary cool fill on the left so the text isn't too dark */}
        <div className="absolute left-[-5%] top-[20%] h-[500px] w-[600px] rounded-full bg-primary/[0.05] blur-[130px]" />
      </motion.div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.25fr] lg:gap-10 xl:gap-16">

          {/* ── LEFT: headline + CTAs ─────────────────────────────────────── */}
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="show"
          >
            {/* Beta badge */}
            <motion.div
              variants={heroItem}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now in public beta
            </motion.div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4rem] xl:text-[4.6rem] lg:leading-[0.98]">
              {HEADLINE.map((line) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span variants={heroLineReveal} className="block">
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            {/* Sub */}
            <motion.p
              variants={heroItem}
              className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Episodes, audience, sponsors, distribution, and your team — connected in one place.{" "}
              <span className="font-semibold text-foreground">
                Hosting is included. It's just not the point.
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={heroItem}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <Magnetic className="inline-block">
                <Button
                  size="lg"
                  className="h-13 rounded-full px-7 text-base shadow-xl shadow-primary/25 transition-shadow duration-300 hover:shadow-primary/40"
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
                  onClick={scrollToWorkspace}
                  data-testid="button-hero-workspace"
                >
                  See the workspace
                </Button>
              </Magnetic>
            </motion.div>

            <motion.p variants={heroItem} className="mt-5 text-xs text-muted-foreground/50">
              No credit card required · Free during the beta
            </motion.p>
          </motion.div>

          {/* ── RIGHT: 3D perspective product mockup ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: mockupY }}
            className="relative hidden lg:block"
          >
            {/*
              Perspective wrapper — gives the 3-D tilt effect.
              rotateY(-14deg): left edge comes toward viewer, right recedes.
              rotateX(4deg):  top tilts very slightly back for a "looking up at it" feel.
              This mirrors the Whispr editorial product-on-a-pedestal treatment.
            */}
            <div
              style={{
                perspective: "1400px",
                perspectiveOrigin: "60% 50%",
              }}
            >
              <motion.div
                initial={{ rotateY: reduceMotion ? -14 : -22, rotateX: reduceMotion ? 4 : 8 }}
                animate={{ rotateY: -14, rotateX: 4 }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Drop shadow beneath the tilted screen */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-8 -bottom-8 h-16 rounded-full bg-black/50 blur-2xl"
                />

                {/* Glow halo behind the screen */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-primary/[0.1] blur-3xl"
                />

                {/* Browser mockup frame */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_40px_100px_rgba(0,0,0,0.7)]">
                  {/* Title bar */}
                  <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] bg-[#141414] px-4">
                    <div className="flex items-center gap-[6px] shrink-0">
                      <span className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
                      <span className="h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
                      <span className="h-[10px] w-[10px] rounded-full bg-[#28C840]" />
                    </div>
                    <div className="mx-auto max-w-[180px] flex-1 rounded-md bg-white/[0.06] px-3 py-[3px] text-center text-[10px] text-muted-foreground/40">
                      podlogix.io/activity
                    </div>
                  </div>

                  {/* Dashboard screenshot */}
                  <img
                    src="/images/dashboard-preview.jpg"
                    alt="Podlogix dashboard — Activity view"
                    className="block w-full select-none"
                    draggable={false}
                  />

                  {/* Subtle reflection: a gentle white gloss at the top */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-9 h-32 bg-gradient-to-b from-white/[0.04] to-transparent"
                  />

                  {/* Bottom fade so it bleeds into the page background */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/70 to-transparent"
                  />
                </div>
              </motion.div>
            </div>

            {/* Floating card — "Recording" — top-right, outside the tilted frame */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -right-10 top-6 w-[196px] rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-md"
            >
              <FloatWrapper reduceMotion={reduceMotion} duration={3.6} delay={0}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <PulsingDot reduceMotion={reduceMotion} />
                    Recording
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/50">04:12</span>
                </div>
                <p className="mb-3 text-sm font-semibold leading-snug">Ep. 42 — Scaling a Solo Show</p>
                <WaveformBars reduceMotion={reduceMotion} />
              </FloatWrapper>
            </motion.div>

            {/* Floating card — weekly plays — bottom-left */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -left-10 bottom-20 w-[168px] rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-md"
            >
              <FloatWrapper reduceMotion={reduceMotion} duration={3.6} delay={1.8}>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  This week
                </p>
                <p className="mt-1.5 font-display text-[1.6rem] font-bold leading-none">
                  <StatCounter target={12.4} suffix="K" reduceMotion={reduceMotion} />
                  <span className="ml-1 text-sm font-semibold text-primary">plays</span>
                </p>
                <p className="mt-1.5 text-[10px] text-muted-foreground/60">↑ 18% vs last week</p>
              </FloatWrapper>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
