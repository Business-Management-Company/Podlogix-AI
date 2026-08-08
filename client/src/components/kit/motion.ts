import type { Variants } from "framer-motion";
import { easing, duration } from "@/lib/design-tokens";

/** Page-level entrance: content settles in from a few px below, no bounce. */
export const pageIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.spring },
  },
};

/** Stagger container for lists (feed rows, stat tiles, nav groups). */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

/** Individual item inside a staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.spring },
  },
};

/** Subtle lift for interactive cards/rows on hover. */
export const hoverLift = {
  whileHover: { y: -1, transition: { duration: duration.fast, ease: easing.standard } },
  whileTap: { y: 0, scale: 0.99 },
};
