"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { WhitePill } from "@/components/ui/Buttons";
import { IconClock, IconHeadphones, IconPlay, IconSearch } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { site } from "@/lib/site";
import type { Podcast } from "@/lib/types";
import { remScale } from "@/lib/useRem";

const CARD_W = 844;
const CARD_H = 296;
const STEP_W = 32; // each layer back is 32px narrower
const STEP_Y = 24; // and sits 24px higher
const ENTER_Y = 420; // cards start this far below their resting spot
/** Milliseconds each card takes to arrive once the section is on screen. */
const DEAL = 520;
const PUSH_END = 0.85;
const ENTER_START = 0.15;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The stack deals itself once the section comes into view: each card rises
 * from below and pushes the earlier ones back, one after another, then the
 * section rests in the drawn state. No pinning, the page keeps scrolling.
 */
export function Trending({ items }: { items: Podcast[] }) {
  const wrapRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const count = items.length;
  /** Which card sits in front once the stack is dealt; -1 while dealing. */
  const front = useRef(-1);
  const busy = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = 0;

    const apply = (el: HTMLElement, scale: number, ty: number, op: number) => {
      const s = remScale();
      el.style.transform = `translate(-50%, ${(ty * s).toFixed(2)}px) scale(${scale.toFixed(5)})`;
      el.style.opacity = op.toFixed(3);
    };
    const draw = (u: number) => {
      const k = Math.min(Math.floor(u), count - 1);
      const t = clamp(u - k, 0, 1);
      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        if (i > k) apply(el, 1, ENTER_Y, 0);
        else if (i === k) {
          const raw = k === 0 ? t : clamp((t - ENTER_START) / (1 - ENTER_START), 0, 1);
          apply(el, 1, (1 - ease(raw)) * ENTER_Y, clamp(raw / 0.25, 0, 1));
        } else {
          const d = Math.min(k - 1 - i + ease(clamp(t / PUSH_END, 0, 1)), count - 1);
          const scale = (CARD_W - STEP_W * d) / CARD_W;
          apply(el, scale, -STEP_Y * d - ((1 - scale) * CARD_H) / 2, 1);
        }
      }
    };
    const tick = (now: number) => {
      if (!start) start = now;
      const u = Math.min(count, (now - start) / DEAL);
      draw(u);
      if (u < count) frame = requestAnimationFrame(tick);
      else front.current = count - 1;
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (reduced) {
          draw(count);
          front.current = count - 1;
        } else frame = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    draw(0);
    io.observe(wrap);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [count]);

  /** Where a card rests at a given depth in the stack (0 is the front). */
  const restAt = (el: HTMLElement, depth: number) => {
    const s = remScale();
    const scale = (CARD_W - STEP_W * depth) / CARD_W;
    const ty = (-STEP_Y * depth - ((1 - scale) * CARD_H) / 2) * s;
    el.style.transform = `translate(-50%, ${ty.toFixed(2)}px) scale(${scale.toFixed(5)})`;
    el.style.zIndex = String(count - depth);
  };

  /**
   * The arrows rotate the dealt stack: next sends the front card to the back
   * and the row steps forward; previous deals the back card up to the front
   * again. Both reuse the deal's own motion, so nothing new is invented.
   */
  const rotate = (dir: 1 | -1) => {
    if (front.current < 0 || busy.current || count < 2) return;
    busy.current = true;
    const soft = "var(--ease-soft)";
    const f = front.current;
    const next = (((f - dir) % count) + count) % count;
    const mover = cardRefs.current[dir === 1 ? f : next];
    front.current = next;
    force((v) => v + 1);
    cardRefs.current.forEach((el, i) => {
      if (!el || el === mover) return;
      const depth = (((next - i) % count) + count) % count;
      el.style.transition = `transform 620ms ${soft}`;
      restAt(el, depth);
    });
    if (!mover) {
      busy.current = false;
      return;
    }
    const s = remScale();
    if (dir === 1) {
      // Front card slides down and away, then reappears at the back of the stack.
      mover.style.transition = `transform 460ms ${soft}, opacity 320ms ${soft} 80ms`;
      mover.style.transform = `translate(-50%, ${(ENTER_Y * s).toFixed(2)}px) scale(1)`;
      mover.style.opacity = "0";
      window.setTimeout(() => {
        mover.style.transition = "none";
        restAt(mover, count - 1);
        void mover.offsetWidth;
        mover.style.transition = `opacity 260ms ${soft}`;
        mover.style.opacity = "1";
        busy.current = false;
      }, 470);
    } else {
      // The back card dives under the stack and deals itself up to the front.
      mover.style.transition = "none";
      mover.style.opacity = "0";
      mover.style.transform = `translate(-50%, ${(ENTER_Y * s).toFixed(2)}px) scale(1)`;
      mover.style.zIndex = String(count);
      void mover.offsetWidth;
      mover.style.transition = `transform 620ms ${soft}, opacity 260ms ${soft}`;
      restAt(mover, 0);
      mover.style.opacity = "1";
      window.setTimeout(() => {
        busy.current = false;
      }, 640);
    }
  };

  return (
    <section ref={wrapRef} className="relative mx-auto h-[800px] w-[1440px] overflow-hidden">
          <div className="absolute left-10 top-[102px] flex w-[1360px] flex-col items-center gap-6">
            <div className="flex w-full flex-col items-center gap-4">
              <Eyebrow tone="90">Trending podcast</Eyebrow>
              <SectionTitle className="w-full text-center">Most Listened This Week</SectionTitle>
            </div>
            <form
              action={site.search}
              method="get"
              role="search"
              className="flex w-[440px] items-center gap-2 overflow-hidden rounded-[60px] bg-paper py-1 pl-4 pr-1 shadow-[0_0_30px_0_rgba(0,0,0,0.1)]"
            >
              <label htmlFor="trending-search" className="sr-only">
                Search shows, episodes, or guests
              </label>
              <input
                id="trending-search"
                name="q"
                type="search"
                placeholder="Search shows, episodes, or guests"
                className="min-w-0 flex-1 bg-transparent text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-[#0f0603] outline-none placeholder:text-[#0f0603]/60"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-white transition-[scale] duration-200 ease-soft active:scale-95"
                style={{ backgroundImage: grad.search40, backgroundSize: "100% 100%" }}
              >
                <IconSearch size={14} />
              </button>
            </form>
          </div>

          <div className="absolute right-10 top-[102px] flex items-center gap-2" role="group" aria-label="Browse trending shows">
            {[
              { label: "Previous show", dir: -1 as const, src: "/l/icons/arrow-left-circle.svg" },
              { label: "Next show", dir: 1 as const, src: "/l/icons/arrow-right-circle.svg" },
            ].map(({ label, dir, src }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => rotate(dir)}
                className="h-10 w-10 transition-[scale] duration-200 ease-soft hover:scale-105 active:scale-95"
              >
                <Image src={src} alt="" width={40} height={40} unoptimized className="h-10 w-10" />
              </button>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0">
            {items.map((p, i) => (
              <article
                key={p.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="stroke-3 pointer-events-auto absolute left-1/2 top-[402px] flex h-[296px] w-[844px] items-center gap-4 rounded-[24px] bg-card py-2 pl-2 pr-6 opacity-0 will-change-[transform,opacity] [backface-visibility:hidden]"
                style={{
                  zIndex: i + 1,
                  transform: `translate(-50%, ${ENTER_Y / 16}rem) scale(1)`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03), 0 -10px 15px rgba(31,10,9,0.3)",
                }}
              >
                <div className="relative h-[280px] w-[320px] shrink-0 overflow-hidden rounded-[16px] bg-white/[0.04]">
                  <Image
                    src={p.artwork}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover"
                    style={{ objectPosition: p.artworkPosition ?? "50% 50%" }}
                  />
                </div>
                <div className="flex h-full min-w-0 flex-1 flex-col items-start justify-between py-4">
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-center gap-2">
                      <span className="stroke-10 flex h-7 items-center whitespace-nowrap rounded-[40px] px-[10px] text-[16px] leading-[1.4] tracking-[-0.16px] text-white">
                        {p.category}
                      </span>
                      <span className="stroke-10 flex h-7 items-center whitespace-nowrap rounded-[40px] px-[10px] text-[16px] leading-[1.4] tracking-[-0.16px] text-white">
                        {p.episodeLabel}
                      </span>
                    </div>
                    <h3 className="display w-full text-[32px] leading-[1.2] tracking-[-0.32px] text-white">{p.title}</h3>
                    <p className="w-full text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">{p.description}</p>
                  </div>
                  <div className="flex w-full items-center gap-[55px]">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex items-center gap-[6px]">
                        <span className="flex h-5 w-5 items-center justify-center text-white">
                          <IconClock size={14} />
                        </span>
                        <span className="whitespace-nowrap text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">{p.durationLabel}</span>
                      </span>
                      <span className="flex items-center gap-[6px]">
                        <span className="flex h-5 w-5 items-center justify-center text-white">
                          <IconHeadphones size={14} />
                        </span>
                        <span className="whitespace-nowrap text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">{p.listenersLabel}</span>
                      </span>
                    </div>
                    <WhitePill href={p.url ?? site.signup}>
                      Listen now
                      <span
                        className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
                        style={{ backgroundImage: grad.play28, backgroundSize: "100% 100%" }}
                      >
                        <IconPlay size={12} className="translate-x-px" />
                      </span>
                    </WhitePill>
                  </div>
                </div>
              </article>
            ))}
          </div>
    </section>
  );
}
