import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useReducedMotion, useInView } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./Magnetic";
import { easing } from "@/lib/design-tokens";
import heroPhoto from "@/assets/images/podlogix-hero-photo.jpg";

// ─── Stagger variants ─────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easing.spring } },
};

const lineReveal = {
  hidden: { y: "105%" },
  show: { y: "0%", transition: { duration: 0.55, ease: easing.spring } },
};

// ─── Podcast show avatar data (decorative) ────────────────────────────────────

const SHOW_AVATARS = [
  { bg: "#E85D26", initials: "TC" },
  { bg: "#7C3AED", initials: "MW" },
  { bg: "#0EA5E9", initials: "DP" },
  { bg: "#D97706", initials: "SH" },
];

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, shouldStart: boolean, reduceMotion: boolean) {
  const [count, setCount] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (!shouldStart || reduceMotion) {
      setCount(target);
      return;
    }
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shouldStart, target, duration, reduceMotion]);

  return count;
}

// ─── Floating stats card ──────────────────────────────────────────────────────

function StatsCard({ reduceMotion }: { reduceMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(100000, 2200, inView, !!reduceMotion);

  const formatted =
    count >= 100000
      ? "100K+"
      : count >= 1000
      ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`
      : count.toLocaleString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-[18%] right-8 z-20 w-56 sm:right-12 lg:right-[8%] xl:right-[12%]"
    >
      {/* Subtle drop shadow + glass card */}
      <div
        className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md"
        style={{ fontFamily: "inherit" }}
      >
        {/* Label */}
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
          Active Podcasters
        </p>

        {/* Stacked avatars */}
        <div className="mb-4 flex items-center">
          <div className="flex -space-x-2">
            {SHOW_AVATARS.map((av, i) => (
              <motion.div
                key={av.initials}
                initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1.3 + i * 0.07, ease: "easeOut" }}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm"
                style={{ background: av.bg, zIndex: SHOW_AVATARS.length - i }}
              >
                {av.initials}
              </motion.div>
            ))}
          </div>
          {/* +10k bubble */}
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 1.65, ease: "backOut" }}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-[9px] font-bold text-white shadow-sm"
          >
            +10k
          </motion.div>
        </div>

        {/* Count-up number */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[2rem] font-bold leading-none tracking-tight text-neutral-900">
              {formatted}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Monthly Listeners</p>
          </div>

          {/* Arrow button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.8, ease: "backOut" }}
            className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #ff6031 0%, #D97706 100%)",
            }}
          >
            <ArrowRight className="h-4 w-4 text-white" style={{ transform: "rotate(-45deg)" }} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Subtle parallax on the photo as you scroll down
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, 100]
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen flex-col overflow-hidden"
    >
      {/* ── Full-bleed photo ──────────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        style={{ y: photoY }}
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        <img
          src={heroPhoto}
          alt=""
          className="h-full w-full object-cover object-[center_15%] select-none"
          draggable={false}
        />
      </motion.div>

      {/* ── Gradient overlays ─────────────────────────────────────────────── */}
      {/* Dark left panel so text pops */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(10,4,2,0.95) 0%, rgba(10,4,2,0.88) 38%, rgba(10,4,2,0.55) 62%, rgba(10,4,2,0.10) 100%)",
        }}
      />
      {/* Bottom fade into page background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      {/* Warm orange ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10%] top-[30%] h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #ff6031 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="container relative z-10 mx-auto flex flex-1 flex-col justify-center px-6 pb-28 pt-36 lg:px-10 lg:pt-44">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-xl"
        >
          {/* Beta pill */}
          <motion.div
            variants={item}
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Now in public beta
          </motion.div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.6rem] lg:leading-[0.97]">
            {[
              "Run your entire",
              "podcast business",
              "from one workspace.",
            ].map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span variants={lineReveal} className="block">
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Subheadline */}
          <motion.p
            variants={item}
            className="mt-7 text-lg leading-relaxed text-white/60"
          >
            Episodes, audience, sponsors, distribution, and your team —
            connected in one place.{" "}
            <span className="font-semibold text-white/90">
              Hosting is included. It's just not the point.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic className="inline-block">
              <Button
                size="lg"
                className="h-13 rounded-full px-8 text-base shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow duration-300"
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
                className="h-13 rounded-full border-white/15 bg-white/[0.06] px-8 text-base text-white backdrop-blur-sm hover:bg-white/10"
                onClick={() =>
                  document
                    .getElementById("workspace-showcase")
                    ?.scrollIntoView({
                      behavior: reduceMotion ? "auto" : "smooth",
                      block: "start",
                    })
                }
                data-testid="button-hero-workspace"
              >
                See the workspace
              </Button>
            </Magnetic>
          </motion.div>

          <motion.p variants={item} className="mt-5 text-xs text-white/30">
            No credit card required · Free during the beta
          </motion.p>
        </motion.div>
      </div>

      {/* ── Floating stats card (right side, over the photo) ─────────────── */}
      <StatsCard reduceMotion={reduceMotion} />

      {/* ── Scroll cue ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={reduceMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6 text-white/25" />
        </motion.div>
      </motion.div>
    </section>
  );
}
