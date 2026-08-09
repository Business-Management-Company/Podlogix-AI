import { motion } from "framer-motion";
import { Mic2, Sparkles, Fingerprint, Globe2, type LucideIcon } from "lucide-react";
import { SpotlightCard } from "./SpotlightCard";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, stagger, staggerItem, viewportOnce } from "./motion";

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Mic2,
    title: "Podcast Management",
    body: "Episodes, RSS, and every show detail — organized, not scattered across five tools.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    body: "Show notes, titles, and clip ideas drafted for you. You approve, you ship.",
  },
  {
    icon: Fingerprint,
    title: "Voice Identity",
    body: "Certify your voice. Get alerted the moment an AI clone of you shows up anywhere.",
  },
  {
    icon: Globe2,
    title: "Distribution",
    body: "One Apple-spec feed, syndicated everywhere your audience already listens.",
  },
];

export function WorkspacePillars() {
  return (
    <section id="workspace-pillars" className="relative overflow-hidden py-28 lg:py-36">
      {/* Faint connecting dot-grid — visually reinforces "everything's linked" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 55% 50% at 50% 35%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 50% at 50% 35%, black, transparent 75%)",
        }}
      />

      <div className="container relative mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <SectionKicker>The workspace</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Every part of the business, in one place.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PILLARS.map((p, i) => (
            <motion.div key={p.title} variants={staggerItem}>
              <SpotlightCard className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors duration-300 hover:border-white/10 hover:bg-white/[0.035]">
                <span className="absolute right-7 top-6 font-display text-xs text-muted-foreground/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <p.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
