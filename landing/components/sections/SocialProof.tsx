"use client";

import Image from "next/image";
import { useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { IconQuote } from "@/components/icons";
import type { Testimonial } from "@/lib/types";

const CARD_W = 930;
const GAP = 16;

export function SocialProof({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const n = items.length;
  const prev = () => setIndex((i) => (i - 1 + n) % n);
  const next = () => setIndex((i) => (i + 1) % n);
  // Render the list twice so the last card always has a neighbour on its right.
  const track = [...items, ...items];

  return (
    <section className="mx-auto flex h-[720px] w-[1440px] flex-col items-start justify-center gap-12 px-10 py-16">
      <div className="flex w-full flex-col items-start justify-center gap-4">
        <Eyebrow>Social proof</Eyebrow>
        <div className="flex w-full items-center justify-center gap-4">
          <SectionTitle className="min-w-0 flex-1 whitespace-pre-wrap">{"Trusted by shows that treat \npodcasting like a business."}</SectionTitle>
          <div className="flex items-center gap-2">
            <button type="button" onClick={prev} aria-label="Previous testimonial" className="h-10 w-10 transition-[scale] duration-200 ease-soft hover:scale-105 active:scale-95">
              <Image src="/l/icons/arrow-left-circle.svg" alt="" width={40} height={40} unoptimized className="h-10 w-10" />
            </button>
            <button type="button" onClick={next} aria-label="Next testimonial" className="h-10 w-10 transition-[scale] duration-200 ease-soft hover:scale-105 active:scale-95">
              <Image src="/l/icons/arrow-right-circle.svg" alt="" width={40} height={40} unoptimized className="h-10 w-10" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <div
          className="flex w-max items-start gap-4 transition-transform duration-700 ease-soft motion-reduce:transition-none"
          style={{ transform: `translate3d(${(-(CARD_W + GAP) * index) / 16}rem, 0, 0)` }}
        >
          {track.map((t, i) => (
            <article
              key={`${t.id}-${i}`}
              aria-hidden={i % n !== index}
              className="flex h-[400px] w-[930px] shrink-0 items-start justify-center overflow-hidden rounded-[24px] bg-card shadow-[5px_5px_15px_0_rgba(0,0,0,0.03)]"
            >
              <div className="relative h-full w-[328px] shrink-0 overflow-hidden bg-[#ddd]">
                <Image src={t.photo} alt="" fill sizes="328px" className="object-cover" style={{ objectPosition: t.photoPosition ?? "50% 50%" }} />
              </div>
              <div className="flex h-full min-w-0 flex-1 flex-col items-start justify-between py-6 pl-8 pr-6">
                <span className="flex h-12 w-12 items-center justify-center text-white/10" aria-hidden>
                  <IconQuote size={44} />
                </span>
                <blockquote className="w-full text-[32px] font-medium leading-[1.2] tracking-[-0.32px] text-cream">{t.quote}</blockquote>
                <div className="flex flex-col items-start gap-1 leading-[1.4]">
                  <span className="whitespace-nowrap text-[20px] font-medium tracking-[-0.2px] text-white">{t.name}</span>
                  <span className="whitespace-nowrap text-[16px] tracking-[-0.16px] text-white/70">{t.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
