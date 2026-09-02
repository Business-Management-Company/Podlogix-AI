import { Eyebrow } from "@/components/ui/SectionHeader";
import {
  IconAtom,
  IconFlask,
  IconFootball,
  IconGraduationCap,
  IconJetFighter,
  IconMap,
  IconMusic,
  IconNewspaper,
  IconPalette,
  IconRocket,
  IconSmile,
  IconSuitcase,
  IconSuitcaseMedical,
  IconUsers,
  IconWarning,
} from "@/components/icons";
import { grad } from "@/lib/gradient";
import type { Category } from "@/lib/types";

const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "suitcase-medical": IconSuitcaseMedical,
  suitcase: IconSuitcase,
  rocket: IconRocket,
  flask: IconFlask,
  "graduation-cap": IconGraduationCap,
  atom: IconAtom,
  smile: IconSmile,
  newspaper: IconNewspaper,
  football: IconFootball,
  warning: IconWarning,
  music: IconMusic,
  map: IconMap,
  palette: IconPalette,
  users: IconUsers,
  "jet-fighter": IconJetFighter,
};

export function CategoryMobile({ items }: { items: Category[] }) {
  return (
    <section className="flex flex-col gap-8 py-16">
      <div className="flex flex-col gap-4 px-6">
        <Eyebrow tone="90">Our category</Eyebrow>
        <h2 className="display text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">15+ podcast &amp; show category</h2>
      </div>
      <div className="no-scrollbar flex h-[320px] snap-x snap-mandatory scroll-px-6 items-center gap-4 overflow-x-auto px-6">
        {items.map((c, i) => {
          const Icon = icons[c.icon] ?? IconRocket;
          const active = i === 0;
          return (
            <article
              key={c.slug}
              className="relative flex w-[180px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] p-4"
              style={{
                height: `${(active ? 320 : c.height) / 16}rem`,
                backgroundColor: active ? "transparent" : "rgba(255,255,255,0.05)",
                backgroundImage: active ? grad.card220x320 : undefined,
                backgroundSize: "100% 100%",
              }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={active ? { backgroundColor: "#fff" } : { backgroundImage: grad.icon40, backgroundSize: "100% 100%" }}
              >
                <Icon size={16} className={active ? "[fill:url(#pl-grad)]" : "text-white"} />
              </span>
              <span className="flex flex-col gap-2">
                <span className="display whitespace-nowrap text-[20px] leading-[1.2] tracking-[-0.2px] text-white">{c.name}</span>
                <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] text-white/80">{c.showsLabel}</span>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
