"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { GradientRings } from "@/components/ui/GradientRings";
import { ROOM_W, STROKE_COLOR, rem, rooms } from "@/lib/workspace";
import { site } from "@/lib/site";
import { usePrefersReducedMotion } from "@/lib/useRem";

/** The one view that matters: the real dashboard, centered on the panel. */
const room = rooms[0];

export function Workspace() {
  const sectionRef = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  const reduced = usePrefersReducedMotion();

  // The dashboard rises into place once the section is on screen. Reduced
  // motion skips the transition, so the observer can fire for everyone.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto flex h-[800px] w-[1440px] items-start gap-4 px-10 py-16">
          <div className="flex h-full w-[414px] shrink-0 flex-col items-start justify-between">
            <div className="flex w-[414px] flex-col items-start gap-4">
              <Eyebrow>The workspace</Eyebrow>
              <SectionTitle className="whitespace-nowrap">Every room, one roof.</SectionTitle>
              <p className="w-full text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">
                One dashboard runs the whole operation: shows, episodes, live channels and the audience behind them. This is the real
                product, one signup away.
              </p>
            </div>

            <a
              href={site.workspace}
              className="display flex h-12 items-center gap-[10px] rounded-[57.6px] bg-white py-1 pl-4 pr-1 text-[16px] leading-4 text-ink transition-[scale] duration-200 ease-soft active:scale-[0.97]"
            >
              Step inside the workspace
              <Image src="/l/icons/arrow-pill-gradient.svg" alt="" width={48} height={40} unoptimized className="h-10 w-12" />
            </a>
          </div>

          <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[32px]">
            <GradientRings set="ws" />
            <div
              className="absolute overflow-hidden"
              style={{
                left: rem(room.x),
                top: rem(room.y),
                width: rem(ROOM_W),
                height: rem(room.h),
                borderRadius: rem(room.r),
                boxShadow: `0 0 0 ${rem(room.s)} ${STROKE_COLOR}`,
                opacity: on ? 1 : 0,
                transform: on ? "none" : "translateY(28px) scale(0.985)",
                transition: reduced ? "none" : "opacity 900ms var(--ease-soft), transform 900ms var(--ease-soft)",
              }}
            >
              <Image
                src={room.image}
                alt="The Podlogix dashboard: shows, episodes, live channels and audience in one view"
                width={ROOM_W}
                height={Math.round(room.imgH)}
                className="absolute left-0 top-0 block max-w-none"
                style={{ width: rem(ROOM_W), height: rem(room.imgH) }}
                priority
              />
            </div>
          </div>
    </section>
  );
}
