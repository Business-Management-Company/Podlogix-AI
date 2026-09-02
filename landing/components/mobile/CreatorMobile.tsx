"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { radial, STOPS_B } from "@/lib/gradient";
import type { Creator } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/useRem";

const cardGrad = radial(200, 420, [-15.47, 29.959, -23.343, -10.158, 200, -25.934], STOPS_B);
const HOLD = 3000;

export function CreatorMobile({ items }: { items: Creator[] }) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced || items.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), HOLD);
    return () => clearInterval(id);
  }, [reduced, items.length]);
  const current = items[index];

  return (
    <section className="flex flex-col gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow>Creator of the month</Eyebrow>
        <h2 className="display whitespace-pre-wrap text-center text-[32px] leading-[1.2] text-white">{"Behind Every Podcast \nis a Bold Voice."}</h2>
        <p className="w-[301px] max-w-full text-center text-[14px] leading-[1.4] text-white/80">
          Every month, we highlight creators sharing their journeys. You&apos;ll learn, laugh, and possibly find your next favorite show.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-[420px] w-full items-center justify-center gap-4">
          <span className="h-[102px] w-12 shrink-0 rounded-[16px] bg-white/5" />
          <span className="h-[172px] w-12 shrink-0 rounded-[16px] bg-white/5" />
          <span className="h-[240px] w-12 shrink-0 rounded-[16px] bg-white/10" />
          <div className="relative h-full w-[200px] shrink-0 overflow-hidden rounded-[32px]" style={{ backgroundImage: cardGrad, backgroundSize: "100% 100%" }}>
            {items.map((c, i) => (
              <Image
                key={c.id}
                src={c.photo}
                alt={i === index ? c.name : ""}
                fill
                sizes="200px"
                className="object-cover transition-opacity duration-700 ease-soft"
                style={{ objectPosition: c.photoPosition ?? "50% 20%", opacity: i === index ? 1 : 0 }}
                aria-hidden={i !== index}
              />
            ))}
          </div>
          <span className="h-[320px] w-12 shrink-0 rounded-[16px] bg-white/10" />
          <span className="h-[172px] w-12 shrink-0 rounded-[16px] bg-white/5" />
          <span className="h-[102px] w-12 shrink-0 rounded-[16px] bg-white/5" />
        </div>
        <div className="flex w-[220px] flex-col gap-1 px-1 text-center leading-[1.2]" aria-live="polite">
          <span className="display text-[20px] tracking-[-0.2px] text-paper">{current?.name}</span>
          <span className="text-[16px] text-white/80">{current?.listenersLabel}</span>
        </div>
      </div>
    </section>
  );
}
