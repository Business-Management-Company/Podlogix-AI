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
        <motion.div style={{ opacity, filter }} className="mx-auto max-w-4xl text-center">
          <p className="font-display text-3xl font-medium leading-[1.25] tracking-tight text-muted-foreground md:text-4xl lg:text-5xl">
            Podcasting stopped being just a show.
          </p>
          <p className="mt-3 font-display text-3xl font-bold leading-[1.25] tracking-tight md:text-4xl lg:text-5xl">
            It became a business — sponsors, a team,
            <br className="hidden md:block" />
            an audience worth protecting.
          </p>
          <p className="mt-8 text-lg text-muted-foreground">Podlogix is where you run all of it.</p>
        </motion.div>
      </div>
    </section>
  );
}
