import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * A single quiet, spacious beat — no cards, no icons. Rather than a one-shot
 * fade, this comes into focus as it enters the viewport and softens as it
 * leaves, tied continuously to scroll position — a cinematic "focus pull"
 * instead of a discrete reveal. Under prefers-reduced-motion it's simply
 * static at full clarity. The emotional turn of the page: podcasting grew
 * into a business, and the workspace should treat it like one.
 */
export function EditorialStatement() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    reduceMotion ? [1, 1, 1, 1] : [0.25, 1, 1, 0.25]
  );
  const blurPx = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    reduceMotion ? [0, 0, 0, 0] : [6, 0, 0, 6]
  );
  const filter = useTransform(blurPx, (v) => `blur(${v}px)`);

  return (
    <section ref={ref} className="border-y border-white/5 py-32 lg:py-44">
      <div className="container mx-auto px-6">
        <motion.div style={{ opacity, filter }} className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-3xl font-medium leading-[1.25] tracking-tight text-muted-foreground md:text-4xl lg:text-5xl">
              A show stopped being just a show.
            </p>
            <p className="mt-3 font-display text-3xl font-bold leading-[1.25] tracking-tight md:text-4xl lg:text-5xl">
              It's a pipeline — and Podlogix
              <br className="hidden md:block" />
              runs every stage of it.
            </p>
          </div>

          {/* The pipeline — a real sequence, so the numbering carries meaning */}
          <ol className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {([
              ["Create", "Studio, guests, recording"],
              ["Stream", "RTMP, destinations, live events"],
              ["Transform", "AI clips, newsletters, posts"],
              ["Distribute", "Podcast feeds, social, video"],
              ["Grow", "Subscribers, audience, analytics"],
              ["Monetize", "Ads, sponsors, tips, memberships"],
            ] as const).map(([word, sub], i) => (
              <li key={word} className="border-l-2 border-primary/40 pl-4">
                <p className="text-xs font-semibold tabular-nums text-primary/70">0{i + 1}</p>
                <p className="mt-1 font-display text-base font-bold uppercase tracking-[0.18em] text-foreground">
                  {word}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{sub}</p>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
