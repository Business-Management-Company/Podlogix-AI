import Image from "next/image";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { IconClock, IconHeadphones, IconSearch } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { site } from "@/lib/site";
import type { Podcast } from "@/lib/types";

export function TrendingMobile({ items }: { items: Podcast[] }) {
  return (
    <section className="flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow tone="90">Trending podcast</Eyebrow>
        <h2 className="display text-center text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">Most Listened This Week</h2>
        <form
          action={site.search}
          method="get"
          role="search"
          className="flex w-full items-center gap-2 overflow-hidden rounded-[60px] bg-paper py-1 pl-4 pr-1 shadow-[0_0_30px_0_rgba(0,0,0,0.1)]"
        >
          <label htmlFor="trending-search-m" className="sr-only">
            Search shows, episodes, or guests
          </label>
          <input
            id="trending-search-m"
            name="q"
            type="search"
            placeholder="Search shows, episodes, or guests"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-[1.4] tracking-[-0.14px] text-[#0f0603] outline-none placeholder:text-[#0f0603]/60"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
            style={{ backgroundImage: grad.search40, backgroundSize: "100% 100%" }}
          >
            <IconSearch size={12} />
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <article key={p.id} className="stroke-3 flex flex-col rounded-[24px] bg-card p-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-white/[0.04]">
              <Image src={p.artwork} alt="" fill sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 320px" className="object-cover" style={{ objectPosition: p.artworkPosition ?? "50% 50%" }} />
            </div>
            <div className="flex flex-col gap-3 px-2 pb-3 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="stroke-10 flex h-7 items-center whitespace-nowrap rounded-[40px] px-[10px] text-[14px] leading-[1.4] tracking-[-0.14px] text-white">{p.category}</span>
                <span className="stroke-10 flex h-7 items-center whitespace-nowrap rounded-[40px] px-[10px] text-[14px] leading-[1.4] tracking-[-0.14px] text-white">{p.episodeLabel}</span>
              </div>
              <h3 className="display text-[20px] leading-[1.2] tracking-[-0.2px] text-white">{p.title}</h3>
              <p className="text-[14px] leading-[1.4] tracking-[-0.14px] text-white/80">{p.description}</p>
              <div className="flex items-center gap-3 pt-1 text-[14px] leading-[1.4] tracking-[-0.14px] text-white/80">
                <span className="flex items-center gap-[6px]">
                  <span className="flex h-5 w-5 items-center justify-center text-white"><IconClock size={12} /></span>
                  {p.durationLabel}
                </span>
                <span className="flex items-center gap-[6px]">
                  <span className="flex h-5 w-5 items-center justify-center text-white"><IconHeadphones size={12} /></span>
                  {p.listenersLabel}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
