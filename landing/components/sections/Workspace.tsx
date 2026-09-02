"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { GradientRings } from "@/components/ui/GradientRings";
import { IconHome, IconMicrophone, IconSignalStream, IconSparkles } from "@/components/icons";
import { ROOM_W, STROKE_COLOR, rem, rooms } from "@/lib/workspace";
import { site } from "@/lib/site";
import { usePrefersReducedMotion } from "@/lib/useRem";

const icons = {
  dashboard: <IconHome size={16} />,
  live: <IconSignalStream size={18} />,
  podcast: <IconMicrophone size={16} />,
  refiner: <IconSparkles size={18} />,
};

/** The rooms cycle on their own while the section is on screen; a click
    picks a room and holds it for a while before the cycle resumes. */
const HOLD = 3200;
const PAUSE = 8000;

export function Workspace() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();
  const paused = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;
    let timer = 0;
    let visible = false;
    const tick = () => {
      if (!paused.current) setActive((a) => (a + 1) % rooms.length);
      timer = window.setTimeout(tick, HOLD);
    };
    const io = new IntersectionObserver(
      (entries) => {
        const now = entries.some((e) => e.isIntersecting);
        if (now && !visible) {
          visible = true;
          timer = window.setTimeout(tick, HOLD);
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
  }, [reduced]);

  const go = (index: number) => {
    paused.current = true;
    window.setTimeout(() => {
      paused.current = false;
    }, PAUSE);
    setActive(index);
  };

  const transition = reduced ? "none" : "620ms var(--ease-soft)";

  return (
    <section ref={sectionRef} className="mx-auto flex h-[800px] w-[1440px] items-start gap-4 px-10 py-16">
          <div className="flex h-full w-[414px] shrink-0 flex-col items-start justify-between">
            <div className="flex flex-col items-start gap-8">
              <div className="flex w-[414px] flex-col items-start gap-4">
                <Eyebrow>The workspace</Eyebrow>
                <SectionTitle className="whitespace-nowrap">Every room, one roof.</SectionTitle>
                <p className="w-full text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">
                  Click through the rooms dashboard, studio, podcast, Refiner. Demo data the real thing is one signup away.
                </p>
              </div>

              <div role="tablist" aria-label="Workspace rooms" className="flex w-[242px] flex-col rounded-[24px] bg-white/5 p-1">
                {rooms.map((r, i) => {
                  const on = i === active;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-controls={`room-${r.key}`}
                      onClick={() => go(i)}
                      className={`flex h-10 w-full items-center gap-1 rounded-[30px] pl-2 pr-3 text-left ${on ? "text-white" : "text-white/60"}`}
                      style={{
                        backgroundColor: on ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0)",
                        transition: `background-color ${transition}, color ${transition}`,
                      }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center">{icons[r.key]}</span>
                      <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] tracking-[-0.16px]">{r.label}</span>
                    </button>
                  );
                })}
              </div>
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
            <div className="absolute inset-0">
              {rooms.map((r, i) => (
                <div
                  key={r.key}
                  id={`room-${r.key}`}
                  role="tabpanel"
                  aria-hidden={i !== active}
                  className="absolute origin-center overflow-hidden"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: `scale(${i === active ? 1 : 0.985})`,
                    transition: `opacity ${transition}, transform ${transition}`,
                    left: rem(r.x),
                    top: rem(r.y),
                    width: rem(ROOM_W),
                    height: rem(r.h),
                    borderRadius: rem(r.r),
                    boxShadow: `0 0 0 ${rem(r.s)} ${STROKE_COLOR}`,
                  }}
                >
                  <Image
                    src={r.image}
                    alt={`${r.label} room of the Podlogix workspace`}
                    width={ROOM_W}
                    height={Math.round(r.imgH)}
                    className="absolute left-0 top-0 block max-w-none"
                    style={{ width: rem(ROOM_W), height: rem(r.imgH) }}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>
    </section>
  );
}
