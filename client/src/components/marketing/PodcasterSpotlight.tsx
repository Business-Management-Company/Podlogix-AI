import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { fadeUp, viewportOnce } from "./motion";

// ─── Podcaster data — 4 vibrant cards, no names needed ───────────────────────

const PODCASTERS = [
  {
    id: 1,
    photo: "https://i.pravatar.cc/600?img=25",
    // Deep purple-to-fuchsia
    gradient: "linear-gradient(175deg, #7c3aed 0%, #db2777 100%)",
  },
  {
    id: 2,
    photo: "https://i.pravatar.cc/600?img=47",
    // Fiery orange-to-red
    gradient: "linear-gradient(175deg, #ea580c 0%, #dc2626 100%)",
  },
  {
    id: 3,
    photo: "https://i.pravatar.cc/600?img=68",
    // Electric cyan-to-indigo
    gradient: "linear-gradient(175deg, #0891b2 0%, #4f46e5 100%)",
  },
  {
    id: 4,
    photo: "https://i.pravatar.cc/600?img=31",
    // Lime-to-emerald
    gradient: "linear-gradient(175deg, #65a30d 0%, #059669 100%)",
  },
];

// ─── Waveform background ──────────────────────────────────────────────────────

const WAVE_BARS = [40, 70, 110, 160, 220, 290, 350, 310, 250, 180, 120, 80, 50,
                   80, 120, 180, 250, 310, 350, 290, 220, 160, 110, 70, 40];

function WaveformBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div className="flex items-center gap-2.5">
        {WAVE_BARS.map((h, i) => (
          <div
            key={i}
            className="shrink-0 rounded-full"
            style={{
              width: 22,
              height: h,
              background: "rgba(255,255,255,0.04)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Podcaster card ───────────────────────────────────────────────────────────

// Card is tall and skinny — image-only, no footer
const CARD_W = 148;
const CARD_H = 420;
const CARD_GAP = 172; // horizontal distance between card centers

interface CardProps {
  podcaster: (typeof PODCASTERS)[0];
  position: number; // -1, 0, 1, 2  (center = 0)
}

function PodcasterCard({ podcaster, position }: CardProps) {
  const isCenter = position === 0;
  const isNear = Math.abs(position) === 1;
  const isHidden = Math.abs(position) >= 2;

  const scale = isCenter ? 1 : isNear ? 0.86 : 0.74;
  const translateX = position * CARD_GAP;
  const translateY = isCenter ? 0 : isNear ? 20 : 36;
  const zIndex = isCenter ? 30 : isNear ? 20 : 10;
  const opacity = isHidden ? 0 : isNear ? 0.85 : 1;

  return (
    <motion.div
      animate={{
        x: translateX,
        y: translateY,
        scale,
        opacity,
        zIndex,
      }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0"
      style={{
        width: CARD_W,
        left: "50%",
        marginLeft: -(CARD_W / 2),
        zIndex,
        pointerEvents: isHidden ? "none" : "auto",
      }}
    >
      {/* Full-bleed photo card — no footer */}
      <div
        className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        style={{
          height: CARD_H,
          borderRadius: 24,
          background: podcaster.gradient,
        }}
      >
        <img
          src={podcaster.photo}
          alt=""
          className="h-full w-full object-cover object-top"
          style={{
            // Blend the photo slightly with the gradient for vibrancy
            mixBlendMode: "luminosity",
            opacity: 0.85,
          }}
        />
        {/* Subtle inner vignette at bottom */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "40%",
            background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)",
          }}
        />
        {/* Subtle inner vignette at top */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "20%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)",
          }}
        />
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

  // Auto-rotate every 2.8 seconds — always running, never stops
  useEffect(() => {
    const timer = setInterval(advance, 2800);
    return () => clearInterval(timer);
  }, [advance]);

  // Map each podcaster to a relative position from the active one
  function getPosition(index: number): number {
    let rel = index - activeIndex;
    const half = Math.floor(total / 2);
    if (rel > half) rel -= total;
    if (rel < -half) rel += total;
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
          style={{ height: CARD_H + 40, maxWidth: 700 }}
        >
          {PODCASTERS.map((podcaster, index) => {
            const pos = getPosition(index);
            return (
              <PodcasterCard
                key={podcaster.id}
                podcaster={podcaster}
                position={pos}
              />
            );
          })}
        </div>

        {/* ── Minimal dot indicators — shows rotation state ── */}
        <div className="mt-8 flex justify-center gap-2">
          {PODCASTERS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === activeIndex ? 18 : 5,
                height: 5,
                background: i === activeIndex ? "#E85D26" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
