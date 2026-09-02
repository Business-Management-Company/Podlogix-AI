"use client";

import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import {
  IconAtom,
  IconFlask,
  IconFootball,
  IconGraduationCap,
  IconJetFighter,
  IconMap,
  IconMusic,
  IconNewspaper,
  IconPalette,
  IconRocket,
  IconSmile,
  IconSuitcase,
  IconSuitcaseMedical,
  IconUsers,
  IconWarning,
} from "@/components/icons";
import { grad } from "@/lib/gradient";
import type { Category as CategoryT } from "@/lib/types";
import { remScale, usePrefersReducedMotion } from "@/lib/useRem";

const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "suitcase-medical": IconSuitcaseMedical,
  suitcase: IconSuitcase,
  rocket: IconRocket,
  flask: IconFlask,
  "graduation-cap": IconGraduationCap,
  atom: IconAtom,
  smile: IconSmile,
  newspaper: IconNewspaper,
  football: IconFootball,
  warning: IconWarning,
  music: IconMusic,
  map: IconMap,
  palette: IconPalette,
  users: IconUsers,
  "jet-fighter": IconJetFighter,
};

const CARD_W = 220;
const GAP = 16;
const PITCH = CARD_W + GAP;
const ACTIVE_EXTRA = 40;
/** The rail moves one card at a time on its own while it is on screen. */
const BEAT = 2200;

export function Category({ items }: { items: CategoryT[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const reduced = usePrefersReducedMotion();

  // Keep the active card in the middle of the rail, at any page scale.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const place = () => {
      const s = remScale();
      const vw = viewport.clientWidth;
      const pitch = PITCH * s;
      const trackWidth = items.length * pitch - GAP * s;
      const hold = Math.max(0, Math.round((vw / 2 - (CARD_W * s) / 2) / pitch));
      const wanted = Math.max(0, active - hold) * pitch;
      const limit = Math.max(0, trackWidth - vw);
      setOffset(-Math.min(wanted, limit));
    };
    place();
    window.addEventListener("resize", place, { passive: true });
    return () => window.removeEventListener("resize", place);
  }, [active, items.length]);

  // Advance while the section is on screen; rest when it is not.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;
    let timer = 0;
    let visible = false;
    const tick = () => {
      setActive((a) => (a + 1) % items.length);
      timer = window.setTimeout(tick, BEAT);
    };
    const io = new IntersectionObserver(
      (entries) => {
        const now = entries.some((e) => e.isIntersecting);
        if (now && !visible) {
          visible = true;
          timer = window.setTimeout(tick, BEAT);
        } else if (!now && visible) {
          visible = false;
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [items.length, reduced]);

  const transition = reduced ? "none" : "620ms var(--ease-soft)";

  return (
    <section ref={sectionRef} className="relative mx-auto flex h-[640px] w-[1440px] flex-col gap-12 px-10 pt-[94px]">
      <div className="flex flex-col gap-4">
        <Eyebrow tone="90">Our category</Eyebrow>
        <SectionTitle>15+ podcast &amp; show category</SectionTitle>
      </div>

      <div ref={viewportRef} className="-mt-5 w-full overflow-hidden">
        <div
          className="flex h-[360px] w-max items-center gap-4"
          style={{ transform: `translate3d(${offset}px,0,0)`, transition: `transform ${transition}`, willChange: "transform" }}
        >
              {items.map((c, i) => {
                const Icon = icons[c.icon] ?? IconRocket;
                const isActive = i === active;
                const h = isActive ? c.height + ACTIVE_EXTRA : c.height;
                return (
                  <article
                    key={c.slug}
                    className="relative flex w-[220px] shrink-0 flex-col justify-between overflow-hidden rounded-[24px] p-4"
                    style={{
                      height: `${h / 16}rem`,
                      backgroundColor: isActive ? "transparent" : "rgba(255,255,255,0.05)",
                      transition: `height ${transition}, background-color ${transition}`,
                    }}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 rounded-[24px]"
                      style={{
                        backgroundImage: grad.card220x320,
                        backgroundSize: "100% 100%",
                        opacity: isActive ? 1 : 0,
                        transition: `opacity ${transition}`,
                      }}
                      aria-hidden
                    />
                    <span
                      className="relative flex h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        backgroundImage: isActive ? "none" : grad.icon40,
                        backgroundSize: "100% 100%",
                        backgroundColor: isActive ? "#ffffff" : "transparent",
                        transition: `background-color ${transition}`,
                      }}
                    >
                      <Icon size={16} className={isActive ? "[fill:url(#pl-grad)]" : "text-white"} />
                    </span>
                    <span className="relative flex flex-col gap-2">
                      <span className="display whitespace-nowrap text-[20px] leading-[1.2] tracking-[-0.2px] text-white">{c.name}</span>
                      <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-white/80">{c.showsLabel}</span>
                    </span>
                  </article>
                );
              })}
        </div>
      </div>
    </section>
  );
}
