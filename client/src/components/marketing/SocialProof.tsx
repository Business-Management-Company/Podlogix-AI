import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { SpotlightCard } from "./SpotlightCard";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, stagger, staggerItem, viewportOnce } from "./motion";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

// TODO: replace with real testimonials. Names are deliberately generic
// (first name + last initial) so they can't be mistaken for real people.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We went from three separate tools to one workspace. Sponsors get a media kit in minutes instead of a week.",
    name: "Sarah M.",
    role: "Host, The Daily Grind Podcast",
    initials: "SM",
  },
  {
    quote:
      "The AI assistant drafts show notes I'd normally push off for days. I just review and publish now.",
    name: "James O.",
    role: "Host, Founder Notes",
    initials: "JO",
  },
  {
    quote:
      "Voice certification was the reason we switched. Knowing we'd be alerted to an AI clone changed how safe this feels.",
    name: "Priya K.",
    role: "Producer, Culture Shift Weekly",
    initials: "PK",
  },
];

export function SocialProof() {
  return (
    <section className="relative overflow-hidden py-28 lg:py-36">
      <div className="container relative mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <SectionKicker className="text-center">Social proof</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Trusted by shows that treat podcasting like a business.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid gap-5 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={staggerItem}>
              <SpotlightCard className="flex h-full flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors duration-300 hover:border-white/10 hover:bg-white/[0.035]">
                <Quote className="mb-5 h-6 w-6 text-primary/50" strokeWidth={1.75} />
                <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)" }}
                  >
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
