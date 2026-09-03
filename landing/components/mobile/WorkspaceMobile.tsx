"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { GradientRings } from "@/components/ui/GradientRings";
import { remScale } from "@/lib/useRem";
import { IconCompass, IconHome, IconMicrophone, IconSignalStream } from "@/components/icons";
import { ROOM_W, STROKE_COLOR, rem, rooms } from "@/lib/workspace";
import { site } from "@/lib/site";

const icons = {
  dashboard: <IconHome size={14} />,
  live: <IconSignalStream size={16} />,
  podcast: <IconMicrophone size={14} />,
  discovery: <IconCompass size={14} />,
};

/* The browser window is 311px wide on the 345px panel; stroke and radius scale with it. */
const SCALE = 311 / ROOM_W;

/* The phone composition is drawn 345 wide; wider cards scale it. */
const CARD_W = 345;
const CARD_H = 280;

export function WorkspaceMobile() {
  const [active, setActive] = useState(0);
  const dragX = useRef<number | null>(null);
  const flip = (delta: number) => setActive((a) => (((a + delta) % rooms.length) + rooms.length) % rooms.length);
  const cardRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setK(Math.max(1, el.clientWidth / (CARD_W * remScale())));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  const mock = Math.min(k, 1.5);
  return (
    <section className="flex flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-4">
        <Eyebrow>The workspace</Eyebrow>
        <h2 className="display whitespace-nowrap text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">Every room, one roof.</h2>
        <p className="text-[14px] leading-[1.4] text-white/80">
          Flip through the rooms: dashboard, studio, podcast and Discovery. These are real product screens, one signup away.
        </p>
      </div>
      <div role="tablist" aria-label="Workspace rooms" className="no-scrollbar -mx-6 flex items-start overflow-x-auto px-6 text-[14px]">
        {rooms.map((r, i) => {
          const on = i === active;
          return (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`flex h-8 shrink-0 items-center gap-1 rounded-[30px] pl-2 pr-3 transition-colors ${on ? "bg-white/5 text-white" : "text-white/60"}`}
            >
              <span className="flex h-6 w-6 items-center justify-center">{icons[r.key]}</span>
              <span className="whitespace-nowrap font-medium leading-[1.4]">{r.label}</span>
            </button>
          );
        })}
      </div>
      <div
        ref={cardRef}
        className="relative w-full touch-pan-y select-none overflow-hidden rounded-[32px]"
        style={{ height: `${(CARD_H * Math.min(k, 1.7)) / 16}rem` }}
        onPointerDown={(e) => (dragX.current = e.clientX)}
        onPointerUp={(e) => {
          if (dragX.current === null) return;
          const dx = e.clientX - dragX.current;
          dragX.current = null;
          if (Math.abs(dx) > 40) flip(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => (dragX.current = null)}
        onPointerLeave={() => (dragX.current = null)}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="absolute bottom-0 left-0" style={{ width: rem(CARD_W), height: rem(CARD_H), transformOrigin: "0 100%", transform: `scale(${k.toFixed(4)})` }}>
          <GradientRings set="wsMobile" />
        </div>
        {rooms.map((r, i) => (
          <div
            key={r.key}
            className="absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-500 ease-soft"
            style={{
              opacity: i === active ? 1 : 0,
              width: rem(ROOM_W * SCALE),
              height: rem(r.h * SCALE),
              borderRadius: rem(r.r * SCALE),
              boxShadow: `0 0 0 ${rem(r.s * SCALE)} ${STROKE_COLOR}`,
              transform: `translate(-50%, -50%) scale(${mock.toFixed(4)})`,
            }}
            aria-hidden={i !== active}
          >
            <Image
              src={r.image}
              alt={`${r.label} room of the Podlogix workspace`}
              width={ROOM_W}
              height={Math.round(r.imgH)}
              className="absolute left-0 top-0 block max-w-none"
              style={{ width: rem(ROOM_W * SCALE), height: rem(r.imgH * SCALE) }}
            />
          </div>
        ))}
      </div>
      <a href={site.workspace} className="display flex h-10 w-max items-center gap-[10px] rounded-[57.6px] bg-white py-1 pl-4 pr-1 text-[14px] leading-4 text-ink">
        Step inside the workspace
        <Image src="/l/icons/arrow-pill-sm-gradient.svg" alt="" width={40} height={32} unoptimized className="h-8 w-10" />
      </a>
    </section>
  );
}
