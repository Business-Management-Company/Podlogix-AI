import { Eyebrow } from "@/components/ui/SectionHeader";
import { IconChevronsRight, IconMicrophone, IconPlus, IconScreencast, IconUsers, IconVideo } from "@/components/icons";
import { pipeline } from "@/lib/data";
import { radial, STOPS_TAB } from "@/lib/gradient";

const icons: Record<string, React.ReactNode> = {
  plus: <IconPlus size={16} />,
  screencast: <IconScreencast size={18} />,
  video: <IconVideo size={16} />,
  microphone: <IconMicrophone size={16} />,
  users: <IconUsers size={16} />,
};

const chevronGrad = radial(40, 40, [-4.3294, 5.0743, -1.1226, -5.0546, 40.735, -0.97973], STOPS_TAB);

export function HowItWorksMobile() {
  return (
    <section className="flex flex-col gap-8 py-16">
      <div className="flex flex-col gap-4 px-6">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="display whitespace-pre-wrap text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">{"A show stopped \nbeing just a show."}</h2>
        <p className="text-[14px] leading-[1.4] text-white/80">It&apos;s a pipeline and Podlogix runs every stage of it.</p>
      </div>
      <div className="no-scrollbar overflow-x-auto px-6">
        <div className="relative flex w-max items-center gap-2">
          {pipeline.map((step) => (
            <article key={step.key} className="flex h-[240px] w-[180px] shrink-0 flex-col items-start justify-between rounded-[20px] bg-cream/5 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/5 text-cream">{icons[step.icon]}</span>
              <span className="flex w-full flex-col gap-3">
                <span className="display text-[20px] leading-[1.2] tracking-[-0.2px] text-cream">{step.title}</span>
                <span className="text-[14px] font-medium leading-[1.4] text-cream/60">{step.sub}</span>
              </span>
            </article>
          ))}
          {Array.from({ length: pipeline.length - 1 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[inset_0_0_0_1px_#2a1615]"
              style={{ left: `${(180 * (i + 1) + 8 * i + 4 - 20) / 16}rem`, backgroundImage: chevronGrad, backgroundSize: "100% 100%" }}
            >
              <IconChevronsRight size={16} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
