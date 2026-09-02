"use client";

import { useEffect, useRef, useState } from "react";
import { remScale } from "@/lib/useRem";

/**
 * A design-sized box that scales to fill its parent's width, anchored at the
 * bottom-left where the ring sets radiate from. The phone compositions are
 * drawn at a fixed width; between phone and desktop the card is wider, so the
 * composition grows with it instead of leaving the card half empty.
 */
export function FitBox({ width, height, max = 4, children }: { width: number; height: number; max?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setK(Math.min(max, el.clientWidth / (width * remScale())));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [width, max]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute bottom-0 left-0" style={{ width: `${width / 16}rem`, height: `${height / 16}rem`, transformOrigin: "0 100%", transform: `scale(${k.toFixed(4)})` }}>
        {children}
      </div>
    </div>
  );
}
