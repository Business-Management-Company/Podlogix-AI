import type { Variants } from "framer-motion";
import { easing } from "@/lib/design-tokens";

/** Default scroll-reveal for a block of content. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easing.spring } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.9, ease: easing.spring } },
};

/** Masked line reveal for headlines — pair with an `overflow-hidden` wrapper per line. */
export const lineReveal: Variants = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: 0.8, ease: easing.spring } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easing.spring } },
};

/** Standard viewport trigger for scroll-linked reveals — fires once, slightly before entering view. */
export const viewportOnce = { once: true, margin: "-100px" } as const;

/**
 * The one spring config for every cursor-follow interaction (Magnetic, the
 * Hero glow parallax, the WorkspaceShowcase tilt). Previously each of these
 * had its own ad-hoc stiffness/damping — this is the single timing language
 * for that whole category of motion.
 */
export const cursorSpring = { stiffness: 260, damping: 24, mass: 0.5 } as const;
