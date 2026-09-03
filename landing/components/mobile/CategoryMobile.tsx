import Image from "next/image";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { IconRocket } from "@/components/icons";
import { CATEGORY_WASH, categoryIcons } from "@/components/categoryShared";
import { grad } from "@/lib/gradient";
import type { Category } from "@/lib/types";

export function CategoryMobile({ items }: { items: Category[] }) {
  return (
    <section className="flex flex-col gap-8 py-16">
      <div className="flex flex-col gap-4 px-6">
        <Eyebrow tone="90">Our category</Eyebrow>
        <h2 className="display text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">15+ podcast &amp; show category</h2>
      </div>
      <div className="no-scrollbar flex h-[320px] snap-x snap-mandatory scroll-px-6 items-center gap-4 overflow-x-auto px-6">
        {items.map((c, i) => {
          const Icon = categoryIcons[c.icon] ?? IconRocket;
          const active = i === 0;
          return (
            <article
              key={c.slug}
              className="relative flex w-[180px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] bg-white/5 p-4"
              style={{ height: `${(active ? 320 : c.height) / 16}rem`, boxShadow: active ? "inset 0 0 0 1.5px rgba(254,252,250,0.85)" : undefined }}
            >
              {c.art && (
                <span className="pointer-events-none absolute inset-0" aria-hidden>
                  <Image src={c.art} alt="" fill sizes="180px" className="object-cover" />
                  <span className="absolute inset-0" style={{ backgroundImage: CATEGORY_WASH }} />
                </span>
              )}
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-full"
                style={active ? { backgroundColor: "#fff" } : { backgroundImage: grad.icon40, backgroundSize: "100% 100%" }}
              >
                <Icon size={16} className={active ? "[fill:url(#pl-grad)]" : "text-white"} />
              </span>
              <span className="relative flex flex-col gap-2">
                <span className="display whitespace-nowrap text-[20px] leading-[1.2] tracking-[-0.2px] text-white">{c.name}</span>
                {c.showsLabel && <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] text-white/80">{c.showsLabel}</span>}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
