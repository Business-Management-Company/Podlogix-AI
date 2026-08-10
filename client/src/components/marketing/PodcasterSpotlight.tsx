import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { fadeUp, viewportOnce } from "./motion";

// ─── Podcaster data ───────────────────────────────────────────────────────────

const PODCASTERS = [
  {
    id: 1,
    name: "Sarah Lauravioza",
    show: "Vioza Talks",
    photo: "https://i.pravatar.cc/400?img=25",
    gradient: "linear-gradient(160deg, #5eead4 0%, #38bdf8 100%)",
  },
  {
    id: 2,
    name: "Josephyne Alexandria",
    show: "Alexandria Show",
    photo: "https://i.pravatar.cc/400?img=47",
    gradient: "linear-gradient(160deg, #bef264 0%, #86efac 100%)",
  },
  {
    id: 3,
    name: "Marcus Webb",
    show: "Beat & Culture",
    photo: "https://i.pravatar.cc/400?img=68",
    gradient: "linear-gradient(160deg, #fb923c 0%, #fcd34d 100%)",
  },
  {
    id: 4,
    name: "Alexana Jessica",
    show: "Random Michi",
    photo: "https://i.pravatar.cc/400?img=31",
    gradient: "linear-gradient(160deg, #67e8f9 0%, #a5f3fc 100%)",
  },
  {
    id: 5,
    name: "George Liebert",
    show: "George Comedy",
    photo: "https://i.pravatar.cc/400?img=12",
    gradient: "linear-gradient(160deg, #f9a8d4 0%, #fb7185 100%)",
  },
];

// ─── Waveform background ──────────────────────────────────────────────────────

// Heights in px — mimics an audio waveform envelope
const WAVE_BARS = [60, 100, 160, 220, 300, 360, 310, 240, 170, 110, 70, 110, 170, 240, 310, 360, 300, 220, 160, 100, 60];

function WaveformBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div className="flex items-center gap-3">
        {WAVE_BARS.map((h, i) => (
          <div
            key={i}
            className="shrink-0 rounded-full"
            style={{
              width: 28,
              height: h,
              background: "rgba(255,255,255,0.05)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Podcaster card ───────────────────────────────────────────────────────────

interface CardProps {
  podcaster: (typeof PODCASTERS)[0];
  position: number; // -2, -1, 0, 1, 2 (center = 0)
}

function PodcasterCard({ podcaster, position }: CardProps) {
  const isCenter = position === 0;
  const isNear = Math.abs(position) === 1;
  const isFar = Math.abs(position) >= 2;

  const scale = isCenter ? 1 : isNear ? 0.88 : 0.76;
  const translateX = position * 200;
  const translateY = isCenter ? 0 : isNear ? 24 : 40;
  const zIndex = isCenter ? 30 : isNear ? 20 : 10;
  const opacity = isFar ? 0.5 : 1;

  return (
    <motion.div
      layout
      animate={{
        x: translateX,
        y: translateY,
        scale,
        opacity,
        zIndex,
      }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-1/2 top-0"
      style={{
        width: 220,
        marginLeft: -110,
        zIndex,
      }}
    >
      {/* Card */}
      <div
        className="overflow-hidden rounded-[28px] shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
        style={{ background: podcaster.gradient }}
      >
        {/* Photo area */}
        <div className="relative" style={{ height: 280 }}>
          <img
            src={podcaster.photo}
            alt={podcaster.name}
            className="h-full w-full object-cover object-top"
          />
          {/* Bottom gradient to blend into card footer */}
          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Card footer — white */}
        <div className="bg-white px-5 py-4">
          <p className="font-display text-base font-black leading-tight text-neutral-900">
            {podcaster.name}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
            <Mic size={10} />
            {podcaster.show}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── PodcasterSpotlight ───────────────────────────────────────────────────────

export function PodcasterSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = PODCASTERS.length;

  const advance = useCallback(() => {
    setActiveIndex((i) => (i + 1) % total);
  }, [total]);

  // Auto-rotate every 3.2 seconds
  useEffect(() => {
    const timer = setInterval(advance, 3200);
    return () => clearInterval(timer);
  }, [advance]);

  // Map each podcaster to a relative position from the active one
  function getPosition(index: number): number {
    let rel = index - activeIndex;
    // Wrap so we keep -2..+2 range
    if (rel > Math.floor(total / 2)) rel -= total;
    if (rel < -Math.floor(total / 2)) rel += total;
    return rel;
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#170a0d", paddingTop: "96px", paddingBottom: "80px" }}
    >
      {/* Waveform bars in background */}
      <WaveformBg />

      <div className="relative z-10 container mx-auto px-6">
        {/* Section header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-16 text-center"
        >
          <h2
            className="font-display font-black leading-tight"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
          >
            <span className="text-white">Behind Every Podcast</span>
            <br />
            <span style={{ color: "#E85D26" }}>is a Bold Voice.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
            Every month, we highlight creators sharing their journeys.
            You'll learn, laugh, and possibly find your next favorite show.
          </p>
        </motion.div>

        {/* ── Carousel ── */}
        <div
          className="relative mx-auto"
          style={{ height: 380, maxWidth: 900 }}
        >
          {PODCASTERS.map((podcaster, index) => {
            const pos = getPosition(index);
            // Only render the 5 visible slots
            if (Math.abs(pos) > 2) return null;
            return (
              <PodcasterCard
                key={podcaster.id}
                podcaster={podcaster}
                position={pos}
              />
            );
          })}
        </div>

        {/* ── Dots + CTA ── */}
        <div className="mt-10 flex flex-col items-center gap-6">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {PODCASTERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="transition-all duration-300"
                style={{
                  width: i === activeIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === activeIndex ? "#E85D26" : "rgba(255,255,255,0.2)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* CTA button */}
          <Link href="/login">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Join the creators now
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #E85D26 0%, #D97706 100%)" }}
              >
                <ArrowRight size={12} />
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    </section>
  );
}
