import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { easing } from "@/lib/design-tokens";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, viewportOnce } from "./motion";

/**
 * Section 2 — "See the workspace" moment.
 * Shows the real Podlogix dashboard in a 3-D browser mockup that
 * parallax-scrolls upward as the user enters the section.
 */
export function WorkspaceShowcase() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Mockup drifts up gently as you scroll into view — gives it weight
  const mockupY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [40, -40]
  );

  return (
    <section
      id="workspace-showcase"
      ref={ref}
      className="relative overflow-hidden py-24 lg:py-36"
    >
      {/* Warm ambient glow behind the mockup */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #D97706 0%, transparent 65%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        {/* ── Section header ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-16 max-w-xl text-center"
        >
          <SectionKicker className="text-center">The workspace</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Everything in one place.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Episodes, distribution, audience, campaigns — one dashboard,
            no tab-switching.
          </p>
        </motion.div>

        {/* ── Browser mockup ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          style={{ y: mockupY }}
          className="mx-auto max-w-5xl"
        >
          {/* Outer glow halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-30"
            style={{
              background: "radial-gradient(ellipse at center, #D97706 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/*
            3-D perspective wrapper — same tilt as the original hero mockup
            so the dashboard feels like a physical screen floating in space.
          */}
          <div style={{ perspective: "1600px", perspectiveOrigin: "50% 40%" }}>
            <motion.div
              initial={{ rotateX: reduceMotion ? 6 : 14, opacity: 0 }}
              whileInView={{ rotateX: 6, opacity: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Drop shadow beneath the tilted screen */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-16 -bottom-10 h-20 rounded-full bg-black/60 blur-3xl"
              />

              {/* Browser frame */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_60px_120px_rgba(0,0,0,0.8)]">

                {/* Browser chrome / title bar */}
                <div className="flex h-10 items-center gap-3 border-b border-white/[0.06] bg-[#141414] px-5">
                  <div className="flex items-center gap-[6px] shrink-0">
                    <span className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
                    <span className="h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
                    <span className="h-[10px] w-[10px] rounded-full bg-[#28C840]" />
                  </div>
                  <div className="mx-auto max-w-[200px] flex-1 rounded-md bg-white/[0.06] px-3 py-[3px] text-center text-[10px] text-muted-foreground/40">
                    podlogix.io/activity
                  </div>
                  {/* Fake right-side browser controls */}
                  <div className="flex items-center gap-2 shrink-0 opacity-30">
                    <span className="h-3 w-3 rounded-sm border border-white/20" />
                    <span className="h-3 w-3 rounded-sm border border-white/20" />
                  </div>
                </div>

                {/* Dashboard screenshot */}
                <img
                  src="/images/dashboard-preview.jpg"
                  alt="Podlogix Activity dashboard — stat tiles, setup checklist, show list, and quick access panel"
                  className="block w-full select-none"
                  draggable={false}
                />

                {/* Top gloss — catches ambient light */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-10 h-24 bg-gradient-to-b from-white/[0.03] to-transparent"
                />

                {/* Bottom fog — blends into page bg */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 to-transparent"
                />
              </div>
            </motion.div>
          </div>

          {/* Feature bullets below the mockup */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: "Shows", value: "All in one feed" },
              { label: "Distribution", value: "6+ platforms" },
              { label: "Analytics", value: "Real-time stats" },
              { label: "Voice Identity", value: "Blockchain certified" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
