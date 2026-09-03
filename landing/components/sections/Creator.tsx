"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { grad } from "@/lib/gradient";
import type { Creator as CreatorT } from "@/lib/types";
import { remScale } from "@/lib/useRem";

/**
 * Ten creators cycle through ten places: four bars, three cards, three bars,
 * plus an eleventh bar that only ever decorates. The same element is a bar at
 * the edge and a card in the middle, so each move is one box growing or
 * shrinking rather than anything fading over anything else.
 */
type Place = { x: number; y: number; w: number; h: number; r: number; card: boolean; fill?: string; grad?: string };

const BAR_05 = "rgba(255,255,255,0.05)";
const BAR_07 = "rgba(255,255,255,0.07)";
const BAR_10 = "rgba(255,255,255,0.10)";
const BAR_12 = "rgba(255,255,255,0.12)";

const PLACES: Place[] = [
  { x: 0, y: 250, w: 48, h: 102, r: 16, card: false, fill: BAR_05 },
  { x: 64, y: 215, w: 48, h: 172, r: 16, card: false, fill: BAR_07 },
  { x: 128, y: 122, w: 48, h: 358, r: 16, card: false, fill: BAR_10 },
  { x: 192, y: 158, w: 48, h: 286, r: 16, card: false, fill: BAR_12 },
  { x: 256, y: 63.5, w: 220, h: 400, r: 32, card: true, grad: grad.creatorLeft },
  { x: 492, y: 0, w: 220, h: 527, r: 32, card: true, grad: grad.creatorMid },
  { x: 728, y: 103.5, w: 220, h: 320, r: 32, card: true, grad: grad.creatorRight },
  { x: 964, y: 158, w: 48, h: 286, r: 16, card: false, fill: BAR_12 },
  { x: 1028, y: 122, w: 48, h: 358, r: 16, card: false, fill: BAR_10 },
  { x: 1092, y: 215, w: 48, h: 172, r: 16, card: false, fill: BAR_07 },
];
const STATIC_BAR = { x: 1156, y: 250, h: 102, fill: BAR_05 };

const HOLD = 3000;
const MOVE = 900;
const BEAT = 65;
const FADE = 160;
const EASE = "cubic-bezier(0.22,0.61,0.36,1)";

/**
 * Where creator i stands at tick t. Creators 1, 2 and 3 start in the three
 * cards as the frame draws them, and on every tick the whole row steps one
 * place to the left, so the next creator enters the right-hand card in order
 * and the one leaving the far left comes round to the far right.
 */
const placeIndex = (i: number, t: number, n: number) => (((i + 4 - t) % n) + n) % n;

export function Creator({ items }: { items: CreatorT[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const ten = items.slice(0, PLACES.length);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || ten.length < PLACES.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = PLACES.length;
    let s = remScale();

    const stand = (el: HTMLElement, p: Place, idx: number, scale = 1) => {
      const frame = el.querySelector<HTMLElement>("[data-frame]")!;
      const photo = el.querySelector<HTMLElement>("[data-photo]")!;
      const meta = el.querySelector<HTMLElement>("[data-meta]")!;
      // The wave runs from the left: every element moves into the place its
      // left neighbour is vacating, so the leftmost sets off first.
      const delay = idx * BEAT;
      el.style.setProperty("--d", `${delay}ms`);
      el.style.transformOrigin = `50% ${(p.h * s) / 2}px`;
      el.style.transform = `translate3d(${p.x * s}px, ${p.y * s}px, 0)${scale === 1 ? "" : ` scale(${scale})`}`;
      el.style.width = `${p.w * s}px`;
      el.style.zIndex = String(idx + 1);
      frame.style.height = `${p.h * s}px`;
      frame.style.borderRadius = `${p.r * s}px`;
      frame.style.backgroundColor = p.card ? "transparent" : p.fill!;
      frame.style.backgroundImage = p.card ? p.grad! : "none";
      const on = p.card ? 1 : 0;
      const fade = `opacity ${FADE}ms ${EASE} ${on ? delay + MOVE - FADE : delay}ms`;
      meta.style.transition = fade;
      photo.style.transition = fade;
      meta.style.opacity = String(on);
      // Bars keep a dimmed sliver of their portrait, so every shape carries an image.
      photo.style.opacity = String(p.card ? 1 : 0.35);
      el.setAttribute("aria-hidden", p.card ? "false" : "true");
      return delay;
    };

    let wrapTimer = 0;
    const paint = (t: number, wrapping: number) => {
      window.clearTimeout(wrapTimer);
      cards.current.forEach((el, i) => {
        if (!el || i === wrapping) return;
        el.style.transition = "";
        const idx = placeIndex(i, t, n);
        stand(el, PLACES[idx], idx, 1);
      });
      if (wrapping < 0) return;
      // The one coming off the left end shrinks away where it stands, then
      // grows back at the far right once that place has been vacated. Its old
      // occupant is last in the wave, so it lands at (n-1) beats plus a move.
      const el = cards.current[wrapping];
      if (!el) return;
      el.style.transition = `transform 320ms ${EASE}`;
      stand(el, PLACES[0], 0, 0);
      wrapTimer = window.setTimeout(() => {
        el.style.transition = "none";
        stand(el, PLACES[n - 1], n - 1, 0);
        void el.offsetWidth;
        el.style.transition = `transform 420ms ${EASE}`;
        stand(el, PLACES[n - 1], n - 1, 1);
      }, (n - 1) * BEAT + MOVE + 60);
    };

    let tick = 0;
    // First paint is a snap.
    cards.current.forEach((el) => el && (el.style.transition = "none"));
    paint(0, -1);
    void stage.offsetWidth;
    cards.current.forEach((el) => el && (el.style.transition = ""));

    const advance = () => {
      // Whoever stands at the far left now is the one that wraps on this tick.
      const wrapping = ten.findIndex((_, i) => placeIndex(i, tick, n) === 0);
      paint(++tick, wrapping);
    };

    let timer = 0;
    const start = () => {
      if (timer || reduced) return;
      timer = window.setInterval(advance, HOLD);
    };
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
      window.clearTimeout(wrapTimer);
    };
    start();
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.15 });
    io.observe(stage);
    const onResize = () => {
      s = remScale();
      cards.current.forEach((el) => el && (el.style.transition = "none"));
      paint(tick, -1);
      void stage.offsetWidth;
      cards.current.forEach((el) => el && (el.style.transition = ""));
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [ten]);

  return (
    <section className="mx-auto flex h-[900px] w-[1440px] flex-col items-center justify-center gap-12 px-10 py-16">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow>Creator of the month</Eyebrow>
        <SectionTitle className="w-[992px] text-center tracking-normal text-white">Behind Every Podcast is a Bold Voice.</SectionTitle>
        <p className="w-[946px] text-center text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">
          Every month, we highlight creators sharing their journeys. You&apos;ll learn, laugh, and possibly find your next favorite show.
        </p>
      </div>

      <div ref={stageRef} className="relative h-[602px] w-[1204px] shrink-0" aria-label="Creators of the month">
        <div
          className="absolute w-12 rounded-[16px]"
          style={{ left: rem(STATIC_BAR.x), top: rem(STATIC_BAR.y), height: rem(STATIC_BAR.h), background: STATIC_BAR.fill }}
          aria-hidden
        />
        {ten.map((c, i) => (
          <article
            key={c.id}
            ref={(el) => {
              cards.current[i] = el;
            }}
            className="absolute left-0 top-0 flex flex-col gap-4 overflow-hidden will-change-[transform,width]"
            style={{ transition: `transform ${MOVE}ms ${EASE} var(--d,0ms), width ${MOVE}ms ${EASE} var(--d,0ms)` }}
          >
            <div
              data-frame
              className="relative w-full overflow-hidden"
              style={{
                backgroundSize: "100% 100%",
                transition: `height ${MOVE}ms ${EASE} var(--d,0ms), border-radius ${MOVE}ms ${EASE} var(--d,0ms), background-color ${MOVE}ms ${EASE} var(--d,0ms)`,
              }}
            >
              <div data-photo className="absolute inset-0 opacity-0">
                <Image src={c.photo} alt={c.name} fill sizes="220px" className="object-cover" style={{ objectPosition: c.photoPosition ?? "50% 20%" }} />
              </div>
            </div>
            <div data-meta className="flex w-[220px] flex-col gap-2 px-1 opacity-0">
              <span className="display text-[24px] leading-[1.2] tracking-[-0.24px] text-paper">{c.name}</span>
              <span className="whitespace-nowrap text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">{c.listenersLabel}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const rem = (n: number) => `${n / 16}rem`;
