"use client";

import { useEffect, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { IconChevronsRight, IconMicrophone, IconPlus, IconScreencast, IconUsers, IconVideo } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { pipeline } from "@/lib/data";
import { usePrefersReducedMotion } from "@/lib/useRem";

const icons: Record<string, React.ReactNode> = {
  plus: <IconPlus size={16} />,
  screencast: <IconScreencast size={20} />,
  video: <IconVideo size={20} />,
  microphone: <IconMicrophone size={20} />,
  users: <IconUsers size={20} />,
};

const HOLD_MS = 2800;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const reduced = usePrefersReducedMotion();

  // The six state frames in Figma walk the highlight along the pipeline; it
  // does the same here on a timer, and rests wherever the pointer is.
  useEffect(() => {
    if (hovering || reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % pipeline.length), HOLD_MS);
    return () => clearInterval(id);
  }, [hovering, reduced]);

  return (
    <section className="mx-auto flex h-[610px] w-[1440px] flex-col items-start gap-10 px-10 py-16">
      <div className="flex w-full flex-col items-start gap-4">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle className="w-full">A show stopped being just a show.</SectionTitle>
        <p className="whitespace-nowrap text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">
          It&apos;s a pipeline and Podlogix runs every stage of it.
        </p>
      </div>

      <div
        className="relative flex w-full items-center gap-2"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {pipeline.map((step, i) => {
          const on = i === active;
          return (
            <article
              key={step.key}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              tabIndex={0}
              className="relative flex h-[320px] min-w-0 flex-1 flex-col items-start justify-between overflow-hidden rounded-[24px] p-6 outline-none"
              style={{
                backgroundColor: on ? "transparent" : "rgba(254,252,250,0.05)",
                transition: "background-color 620ms var(--ease-soft)",
              }}
            >
              <span
                className="pointer-events-none absolute inset-0"
                aria-hidden
                style={{
                  backgroundImage: grad.card220x320,
                  backgroundSize: "100% 100%",
                  opacity: on ? 1 : 0,
                  transition: "opacity 620ms var(--ease-soft)",
                }}
              />
              <span
                className="relative flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: on ? "#ffffff" : "rgba(254,252,250,0.05)",
                  transition: "background-color 620ms var(--ease-soft)",
                }}
              >
                <span className={on ? "[&_svg]:[fill:url(#pl-grad-tr)] [&_svg]:[stroke:url(#pl-grad-tr)]" : "text-cream"}>
                  {icons[step.icon]}
                </span>
              </span>
              {/* The file gives the first card a 12px gap and the rest 10px. */}
              <span className={`relative flex w-full flex-col ${i === 0 ? "gap-3" : "gap-[10px]"}`}>
                <span className="display w-full text-[24px] leading-[1.2] tracking-[-0.24px] text-cream">{step.title}</span>
                <span className="w-full text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-cream/60">{step.sub}</span>
              </span>
            </article>
          );
        })}

        {/* Chevron badges on the seams, at the file's own offsets from the row centre.
            The seam after the active card lights up. */}
        {[-452, -227, 0, 227, 456].map((offset, i) => {
          const lit = active === i;
          return (
            <span
              key={i}
              aria-hidden
              className="absolute z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                left: `calc(50% + ${(offset - 20) / 16}rem)`,
                top: i === 0 ? "50%" : "calc(50% - 1px)",
                backgroundColor: lit ? "#ffffff" : "#1f0a09",
                boxShadow: lit ? "none" : "inset 0 0 0 1px #2a1615",
                transition: "background-color 620ms var(--ease-soft), box-shadow 620ms var(--ease-soft)",
              }}
            >
              <IconChevronsRight size={16} className={lit ? "[fill:url(#pl-grad-tr)]" : "text-white"} />
            </span>
          );
        })}
      </div>
    </section>
  );
}
