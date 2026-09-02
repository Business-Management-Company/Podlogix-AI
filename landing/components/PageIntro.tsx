"use client";

import { useEffect, useState } from "react";
import { IntroContext } from "./IntroContext";

/**
 * The hero entrance starts as soon as the fonts and the visible hero portrait
 * are ready, capped so a slow image never holds the page, and plays on every
 * load. Visitors who ask for reduced motion, and any URL carrying `?intro=0`,
 * land straight on the finished hero.
 */
export function PageIntro({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"idle" | "done" | "skip">("idle");

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const settle = (next: "done" | "skip") => {
      frame = requestAnimationFrame(() => {
        if (!cancelled) setPhase(next);
      });
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skipped = new URLSearchParams(window.location.search).get("intro") === "0";
    if (reduced || skipped) {
      settle("skip");
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
      };
    }
    const portrait = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-hero-portrait]")).find(
      (img) => img.getBoundingClientRect().width > 0,
    );
    const image = portrait && !portrait.complete ? portrait.decode().catch(() => undefined) : Promise.resolve();
    const cap = new Promise<void>((resolve) => setTimeout(resolve, 1800));
    Promise.race([Promise.all([document.fonts.ready, image]), cap]).then(() => settle("done"));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  const cls = phase === "done" ? "hero-ready" : phase === "skip" ? "hero-static" : "hero-idle";
  return (
    <IntroContext.Provider value={phase === "done"}>
      <div className={cls} data-intro={phase === "idle" ? "idle" : "ready"}>
        {children}
      </div>
    </IntroContext.Provider>
  );
}
