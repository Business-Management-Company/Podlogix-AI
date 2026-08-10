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

// ─── Real face photos (via pravatar — consistent per seed number) ─────────────

const AVATARS = [
  { src: "https://i.pravatar.cc/120?img=47", alt: "Podcaster" },
  { src: "https://i.pravatar.cc/120?img=12", alt: "Podcaster" },
  { src: "https://i.pravatar.cc/120?img=32", alt: "Podcaster" },
];

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(
  target: number,
  duration: number,
  shouldStart: boolean,
  reduceMotion: boolean
) {
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
      // ease-out cubic — fast start, slow finish so you can read the number
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
  const inView = useInView(ref, { once: true, margin: "-60px" });
  // 3.5 second count-up
  const count = useCountUp(100000, 3500, inView, !!reduceMotion);

  const formatted =
    count >= 100000
      ? "100K+"
      : count >= 1000
      ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`
      : count.toLocaleString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 30, scale: reduceMotion ? 1 : 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-[14%] right-6 z-20 sm:right-10 lg:right-[7%] xl:right-[11%]"
    >
      {/* Card — wider, squarer, more breathing room (matches reference) */}
      <div
        className="overflow-hidden rounded-3xl border border-white/25 bg-white/92 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
        style={{
          width: 280,
          padding: "28px 28px 26px",
          fontFamily: "inherit",
        }}
      >
        {/* Label */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            color: "#9b8b84",
            marginBottom: 18,
          }}
        >
          Our Members
        </p>

        {/* Stacked face avatars */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {AVATARS.map((av, i) => (
              <motion.div
                key={av.src}
                initial={{ opacity: 0, x: reduceMotion ? 0 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1.35 + i * 0.08, ease: "easeOut" }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "3px solid white",
                  overflow: "hidden",
                  marginLeft: i === 0 ? 0 : -14,
                  zIndex: AVATARS.length - i,
                  position: "relative",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={av.src}
                  alt={av.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </motion.div>
            ))}
          </div>

          {/* +10k bubble */}
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.38, delay: 1.62, ease: "backOut" }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3px solid white",
              marginLeft: -14,
              background: "linear-gradient(135deg, #ff6031 0%, #D97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            +10k
          </motion.div>
        </div>

        {/* Count-up number + arrow */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p
              style={{
                fontSize: 46,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "#1a0d10",
              }}
            >
              {formatted}
            </p>
            <p
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "#9b8b84",
                fontWeight: 400,
              }}
            >
              Monthly Listeners
            </p>
          </div>

          {/* Arrow button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.85, ease: "backOut" }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff6031 0%, #D97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginBottom: 2,
              boxShadow: "0 4px 16px rgba(255,96,49,0.35)",
            }}
          >
            <ArrowRight
              size={18}
              color="white"
              style={{ transform: "rotate(-45deg)" }}
            />
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(10,4,2,0.95) 0%, rgba(10,4,2,0.88) 38%, rgba(10,4,2,0.55) 62%, rgba(10,4,2,0.10) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
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
          className="max-w-2xl"
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

          {/* Headline — 2 lines */}
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.6rem] lg:leading-[0.97]">
            {[
              "Run your entire podcast business",
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
            className="mt-7 max-w-lg text-lg leading-relaxed text-white/60"
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

      {/* ── Floating stats card ───────────────────────────────────────────── */}
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
