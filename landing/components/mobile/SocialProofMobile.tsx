"use client";

import Image from "next/image";
import { useState } from "react";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { IconQuote } from "@/components/icons";
import type { Testimonial } from "@/lib/types";

export function SocialProofMobile({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const n = items.length;
  const t = items[index];
  return (
    <section className="flex flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-4">
        <Eyebrow>Social proof</Eyebrow>
        <h2 className="display text-[32px] leading-[1.2] text-white">Trusted by shows that treat podcasting like a business.</h2>
      </div>
      <article className="flex w-full flex-col overflow-hidden rounded-[24px] bg-card shadow-[5px_5px_15px_0_rgba(0,0,0,0.03)]" aria-live="polite">
        <div className="relative h-[200px] w-full overflow-hidden bg-[#ddd]">
          <Image key={t.id} src={t.photo} alt="" fill sizes="(max-width: 1023px) 92vw, 345px" className="object-cover" style={{ objectPosition: t.photoPosition ?? "50% 50%" }} />
        </div>
        <div className="flex h-[264px] flex-col gap-6 px-4 pb-4 pt-6">
          <span className="flex h-8 w-8 items-center justify-center text-white/10" aria-hidden>
            <IconQuote size={28} />
          </span>
          <blockquote className="text-[20px] font-medium leading-[1.2] tracking-[-0.2px] text-cream">{t.quote}</blockquote>
          <div className="flex flex-col gap-1 leading-[1.4]">
            <span className="text-[16px] font-medium tracking-[-0.16px] text-white">{t.name}</span>
            <span className="text-[14px] tracking-[-0.14px] text-white/70">{t.role}</span>
          </div>
        </div>
      </article>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous testimonial" onClick={() => setIndex((i) => (i - 1 + n) % n)} className="h-10 w-10 active:scale-95">
          <Image src="/l/icons/arrow-left-circle.svg" alt="" width={40} height={40} unoptimized className="h-10 w-10" />
        </button>
        <button type="button" aria-label="Next testimonial" onClick={() => setIndex((i) => (i + 1) % n)} className="h-10 w-10 active:scale-95">
          <Image src="/l/icons/arrow-right-circle.svg" alt="" width={40} height={40} unoptimized className="h-10 w-10" />
        </button>
      </div>
    </section>
  );
}
