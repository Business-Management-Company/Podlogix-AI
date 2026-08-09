import { useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./Magnetic";
import { stagger, staggerItem, lineReveal, cursorSpring } from "./motion";

const HEADLINE = ["Run your entire", "podcast business", "from one workspace."];

const WAVEFORM_HEIGHTS = [40, 70, 45, 90, 55, 75, 35, 60, 80, 50, 65, 30];

/** Small animated waveform used inside the hero's floating "recording" card. */
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
              duration: 1.1 + (i % 3) * 0.15,
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

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const glowScrollOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);
  const glowScrollY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 140]);

  // A very light cursor-parallax on the background glow — the section reacts
  // to you without ever moving the actual content. Horizontal only, so it
  // never fights with the scroll-driven vertical drift below. Disabled under
  // prefers-reduced-motion.
  const glowX = useMotionValue(0);
  const springGlowX = useSpring(glowX, cursorSpring);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(((e.clientX - rect.left) / rect.width - 0.5) * 50);
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
      className="relative overflow-hidden pb-24 pt-40 lg:pb-32 lg:pt-52"
    >
      <motion.div
        aria-hidden
        style={{ opacity: glowScrollOpacity, y: glowScrollY, x: springGlowX }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.14] blur-[150px]" />
      </motion.div>

      {/* Floating "recording" card — decorative editorial detail, not a
          real screenshot or a live stat. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transform: "rotate(3deg)" }}
        className="pointer-events-none absolute right-[6%] top-[16%] hidden w-[220px] rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-sm lg:block"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Recording
          </span>
          <span className="text-[11px] text-muted-foreground/60">04:12</span>
        </div>
        <p className="mb-3 text-sm font-semibold leading-tight">Ep. 42 — Scaling a Solo Show</p>
        <WaveformBars reduceMotion={reduceMotion} />
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{ transform: "rotate(-2deg)" }}
        className="pointer-events-none absolute bottom-[12%] left-[7%] hidden w-[190px] rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-sm lg:block"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          This week
        </p>
        <p className="mt-1.5 font-display text-2xl font-bold">
          12.4K <span className="text-sm font-medium text-primary">plays</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">↑ 18% vs last week</p>
      </motion.div>

      <div className="container relative z-10 mx-auto px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            variants={staggerItem}
            className="mx-auto mb-9 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Now in public beta
          </motion.div>

          <h1 className="font-display text-[11vw] font-bold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem] lg:leading-[0.98]">
            {HEADLINE.map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span variants={lineReveal} className="block">
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            variants={staggerItem}
            className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            Episodes, audience, sponsors, distribution, and your team — connected in
            one place.{" "}
            <span className="font-semibold text-foreground">
              Hosting is included. It's just not the point.
            </span>
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Magnetic className="inline-block">
              <Button
                size="lg"
                className="h-14 rounded-full px-8 text-base shadow-xl shadow-primary/20 transition-shadow duration-300 hover:shadow-primary/35"
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
                className="h-14 rounded-full border-white/10 px-8 text-base hover:bg-white/5"
                onClick={scrollToWorkspace}
                data-testid="button-hero-workspace"
              >
                See the workspace
              </Button>
            </Magnetic>
          </motion.div>

          <motion.p variants={staggerItem} className="mt-6 text-xs text-muted-foreground/60">
            No credit card required · Free during the beta
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
