"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/useRem";

/**
 * Marks its box `wait` until a share of it is on screen, then `live` once,
 * so CSS can hold an entrance in its start state and play it exactly when
 * the visitor arrives. Reduced motion gets `static`, the finished frame.
 */
export function Reveal({ threshold = 0.4, className = "", children }: { threshold?: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, reduced]);
  return (
    <div ref={ref} className={className} data-reveal={reduced ? "static" : live ? "live" : "wait"}>
      {children}
    </div>
  );
}
