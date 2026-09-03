"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { GradientRings } from "@/components/ui/GradientRings";
import { remScale } from "@/lib/useRem";
import { ROOM_W, STROKE_COLOR, rem, rooms } from "@/lib/workspace";
import { site } from "@/lib/site";

/* The browser window is 311px wide on the 345px panel; stroke and radius scale with it. */
const SCALE = 311 / ROOM_W;

/* The phone composition is drawn 345 wide; wider cards scale it. */
const CARD_W = 345;
const CARD_H = 280;

const room = rooms[0];

export function WorkspaceMobile() {
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
          One dashboard runs the whole operation: shows, episodes, live channels and the audience behind them. This is the real product,
          one signup away.
        </p>
      </div>
      <div ref={cardRef} className="relative w-full overflow-hidden rounded-[32px]" style={{ height: `${(CARD_H * Math.min(k, 1.7)) / 16}rem` }}>
        <div className="absolute bottom-0 left-0" style={{ width: rem(CARD_W), height: rem(CARD_H), transformOrigin: "0 100%", transform: `scale(${k.toFixed(4)})` }}>
          <GradientRings set="wsMobile" />
        </div>
        <div
          className="absolute left-1/2 top-1/2 overflow-hidden"
          style={{
            width: rem(ROOM_W * SCALE),
            height: rem(room.h * SCALE),
            borderRadius: rem(room.r * SCALE),
            boxShadow: `0 0 0 ${rem(room.s * SCALE)} ${STROKE_COLOR}`,
            transform: `translate(-50%, -50%) scale(${mock.toFixed(4)})`,
          }}
        >
          <Image
            src={room.image}
            alt="The Podlogix dashboard: shows, episodes, live channels and audience in one view"
            width={ROOM_W}
            height={Math.round(room.imgH)}
            className="absolute left-0 top-0 block max-w-none"
            style={{ width: rem(ROOM_W * SCALE), height: rem(room.imgH * SCALE) }}
          />
        </div>
      </div>
      <a href={site.workspace} className="display flex h-10 w-max items-center gap-[10px] rounded-[57.6px] bg-white py-1 pl-4 pr-1 text-[14px] leading-4 text-ink">
        Step inside the workspace
        <Image src="/l/icons/arrow-pill-sm-gradient.svg" alt="" width={40} height={32} unoptimized className="h-8 w-10" />
      </a>
    </section>
  );
}
