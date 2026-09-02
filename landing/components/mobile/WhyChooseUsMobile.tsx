"use client";

import { Eyebrow } from "@/components/ui/SectionHeader";
import { WhyCardFrame, whyCards } from "@/components/sections/WhyChooseUs";

export function WhyChooseUsMobile() {
  return (
    <section className="flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <Eyebrow>Why choose us</Eyebrow>
        <h2 className="display text-[32px] leading-[1.2] text-white">Your show. No chaos.</h2>
      </div>
      <div className="flex flex-col gap-4">
        {whyCards.map((c) => (
          <WhyCardFrame key={c.title[0]} card={c} className="flex flex-col">
            {(live) => (
              <>
                <div className={`stroke-5 relative h-[220px] w-full overflow-hidden ${c.radius} bg-white/5`}>
                  {/* The desktop composition, centred and cropped to the mobile card. */}
                  <div className="absolute left-1/2 top-1/2 h-[284px] w-[312px]" style={{ transform: "translate(-50%, -50%)" }}>
                    <c.Visual live={live} base={0} />
                  </div>
                </div>
                <div className="flex flex-col gap-3 px-4 pb-4 pt-6">
                  <h3 className="display text-[20px] leading-[1.2] tracking-[-0.2px] text-cream">{c.title.join(" ")}</h3>
                  <p className="text-[14px] font-medium leading-[1.4] text-cream/60">{c.sub}</p>
                </div>
              </>
            )}
          </WhyCardFrame>
        ))}
      </div>
    </section>
  );
}
