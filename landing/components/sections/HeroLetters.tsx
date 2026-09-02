"use client";

import { useEffect, useRef } from "react";
import { useIntroReady } from "@/components/IntroContext";

const WORD = "pod".split("");
const GHOSTS = 4;
const GHOST_ALPHA = [1, 0.6, 0.4, 0.24];
const GHOST_STAGGER = 75;
/* Each letter's train finishes before the next letter sets off. */
const LETTER_STAGGER = GHOSTS * GHOST_STAGGER;
const FLIGHT = 1250;
const START = 250;
/* A run of small dots draws the arc ahead of the first letter. */
const DOTS = 10;
const DOT_STAGGER = 45;
const DOT_START = 40;

/**
 * The letter cascade from the Whispr reference: a few letters fly from the
 * bottom-left corner to the top-right along one arc, rotating with the curve,
 * each followed by fading copies of itself on the same path so it reads as a
 * chain of echoes. A dotted leader traces the arc first. Sizes come from the
 * stage's real box so the arc scales with the page.
 */
export function HeroLetters({ size = 120 }: { size?: number }) {
  const ready = useIntroReady();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!ready || !stage) return;
    const { width: W, height: H } = stage.getBoundingClientRect();
    if (W < 10 || H < 10) return; // the hidden layout variant
    const P0 = { x: 0.04 * W, y: 0.9 * H };
    const C = { x: 0.6 * W, y: 1.08 * H };
    const P1 = { x: 0.96 * W, y: -0.02 * H };
    const point = (t: number) => ({
      x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * C.x + t * t * P1.x,
      y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * C.y + t * t * P1.y,
    });
    const angle = (t: number) => {
      const a = point(Math.max(0, t - 0.01));
      const b = point(Math.min(1, t + 0.01));
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    };
    const steps = 16;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const p = point(t);
      const fade = t < 0.12 ? t / 0.12 : t > 0.82 ? (1 - t) / 0.18 : 1;
      return { transform: `translate(${p.x}px, ${p.y}px) rotate(${angle(t)}deg)`, alpha: fade, offset: t };
    });
    const easing = "cubic-bezier(0.3, 0, 0.25, 1)";
    const animations: Animation[] = [];
    stage.querySelectorAll<HTMLElement>("[data-letter]").forEach((el) => {
      const i = Number(el.dataset.letter);
      const g = Number(el.dataset.ghost);
      const alpha = GHOST_ALPHA[g];
      const kf = frames.map((f) => ({ transform: f.transform, opacity: f.alpha * alpha, offset: f.offset }));
      animations.push(el.animate(kf, { duration: FLIGHT, delay: START + i * LETTER_STAGGER + g * GHOST_STAGGER, easing, fill: "both" }));
    });
    stage.querySelectorAll<HTMLElement>("[data-dot]").forEach((el) => {
      const i = Number(el.dataset.dot);
      const kf = frames.map((f) => ({ transform: f.transform, opacity: f.alpha * 0.7, offset: f.offset }));
      animations.push(el.animate(kf, { duration: FLIGHT * 0.9, delay: DOT_START + i * DOT_STAGGER, easing, fill: "both" }));
    });
    return () => animations.forEach((a) => a.cancel());
  }, [ready]);

  const fontSize = `${size / 16}rem`;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {Array.from({ length: DOTS }, (_, i) => (
        <span
          key={`dot-${i}`}
          data-dot={i}
          className="absolute left-0 top-0 block rounded-full bg-cream opacity-0 will-change-transform"
          style={{ width: `${size / 14 / 16}rem`, height: `${size / 14 / 16}rem`, marginLeft: `-${size / 28 / 16}rem`, marginTop: `-${size / 28 / 16}rem` }}
        />
      ))}
      {WORD.map((ch, i) =>
        Array.from({ length: GHOSTS }, (_, g) => (
          <span
            key={`${i}-${g}`}
            data-letter={i}
            data-ghost={g}
            className="display absolute left-0 top-0 normal-case leading-none text-cream opacity-0 will-change-transform"
            style={{ fontSize, marginLeft: `-${size * 0.3 / 16}rem`, marginTop: `-${size * 0.58 / 16}rem` }}
          >
            {ch}
          </span>
        )),
      )}
    </div>
  );
}
