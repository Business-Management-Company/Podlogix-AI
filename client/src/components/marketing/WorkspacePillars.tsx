import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fadeUp, viewportOnce } from "./motion";

// ─── Feature rows ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    num: "01",
    title: "Production without the pileup",
    body: "Send us the raw conversation. Get back a polished episode, clips, artwork, and notes.",
  },
  {
    num: "02",
    title: "Publish once. Show up everywhere.",
    body: "Apple, Spotify, YouTube, Buzzsprout, RSS—and whatever comes next.",
  },
  {
    num: "03",
    title: "Know what is actually working",
    body: "See every episode's performance in one view and get AI insight into your next move.",
  },
  {
    num: "04",
    title: "Real people behind the platform",
    body: "A creator team that uses Podlogix daily. We build what we need—and share where you fit.",
  },
];

// ─── Floating podcast cover card ──────────────────────────────────────────────

function PodcastCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 3 }}
      viewport={viewportOnce}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-8 right-8 z-10 w-52 overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
    >
      {/* Podcast artwork */}
      <div
        className="relative flex h-52 w-52 items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #c026d3 0%, #7c3aed 40%, #db2777 100%)",
        }}
      >
        {/* Decorative neon rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full border-4 border-pink-400/30" />
          <div className="absolute h-28 w-28 rounded-full border-2 border-purple-300/40" />
        </div>
        {/* Title text */}
        <div className="relative z-10 text-center">
          <p className="font-display text-2xl font-black leading-none tracking-wider text-white drop-shadow-lg">
            BEAT
          </p>
          <p className="font-display text-2xl font-black leading-none tracking-wider text-yellow-300 drop-shadow-lg">
            DROP
          </p>
          <p className="mt-1 text-[8px] font-semibold uppercase tracking-widest text-white/70">
            The Vibrant Music Podcast
          </p>
          <p className="text-[7px] text-white/50">Hosted by Jess &amp; Marcus</p>
        </div>
        {/* Vinyl circle */}
        <div className="absolute bottom-3 right-3 h-12 w-12 rounded-full bg-black/60 ring-2 ring-white/20">
          <div className="absolute inset-[5px] rounded-full bg-gradient-to-br from-gray-700 to-gray-900">
            <div className="absolute inset-[6px] rounded-full bg-purple-900/50" />
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-4 py-3">
        <p className="text-sm font-bold text-neutral-900">The Creator's Cut</p>
        <p className="text-xs text-neutral-500">Managed with Podlogix</p>
      </div>
    </motion.div>
  );
}

// ─── WorkspacePillars ─────────────────────────────────────────────────────────

export function WorkspacePillars() {
  const [hovered, setHovered] = useState<number | null>(1); // 01-indexed, 1 = "02" highlighted by default

  return (
    <section
      id="workspace-pillars"
      className="relative overflow-hidden"
      style={{ background: "#170a0d", paddingTop: "80px", paddingBottom: "100px" }}
    >
      {/* Subtle top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />

      <div className="container relative mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">

          {/* ── LEFT: big headline ──────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="flex flex-col justify-center"
          >
            <h2
              className="font-display font-black leading-[0.9] tracking-tight"
              style={{ fontSize: "clamp(3.5rem, 6vw, 5.5rem)" }}
            >
              <span className="block text-white">YOUR SHOW.</span>
              <span className="block" style={{ color: "#E85D26" }}>NO CHAOS.</span>
            </h2>
          </motion.div>

          {/* ── RIGHT: numbered feature list ────────────────────────────── */}
          <div className="relative">
            <div className="divide-y divide-white/[0.06]">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.num}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                  transition={{ delay: i * 0.05 }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(1)}
                  className="group relative cursor-default transition-all duration-200"
                  style={{
                    background:
                      hovered === i
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    padding: "24px 20px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    borderRadius: 12,
                  }}
                >
                  {/* Left accent bar on hover */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-200"
                    style={{
                      width: 3,
                      height: hovered === i ? 32 : 0,
                      background: "#E85D26",
                      marginLeft: 0,
                    }}
                  />

                  <div className="flex items-start gap-5">
                    {/* Number */}
                    <span
                      className="mt-0.5 shrink-0 font-mono text-xs font-medium"
                      style={{ color: hovered === i ? "#E85D26" : "rgba(255,255,255,0.2)" }}
                    >
                      {f.num}
                    </span>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display font-bold leading-snug transition-colors duration-200"
                        style={{
                          fontSize: "1.05rem",
                          color: hovered === i ? "#ffffff" : "rgba(255,255,255,0.75)",
                        }}
                      >
                        {f.title}
                      </h3>
                      <p
                        className="mt-1.5 text-sm leading-relaxed transition-colors duration-200"
                        style={{
                          color: hovered === i ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {f.body}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowUpRight
                      size={16}
                      className="mt-1 shrink-0 transition-all duration-200"
                      style={{
                        color: hovered === i ? "#E85D26" : "rgba(255,255,255,0.2)",
                        transform: hovered === i ? "translate(2px,-2px)" : "none",
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating podcast cover card */}
            <PodcastCard />
          </div>

        </div>
      </div>
    </section>
  );
}
