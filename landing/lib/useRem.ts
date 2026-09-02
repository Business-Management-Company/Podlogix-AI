"use client";

import { useEffect, useState } from "react";

/**
 * The root font-size relative to 16px. Layout values in the design are px at
 * 1440 and become rem in CSS; JS-driven motion needs the same factor.
 */
export function remScale(): number {
  if (typeof document === "undefined") return 1;
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(fs) && fs > 0 ? fs / 16 : 1;
}

export function useRemScale(): number {
  const [s, setS] = useState(1);
  useEffect(() => {
    const update = () => setS(remScale());
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return s;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
