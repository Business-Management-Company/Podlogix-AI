import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { IconCheck } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { plans } from "@/lib/data";
import { site } from "@/lib/site";

const ctaHref: Record<string, string> = {
  starter: site.demo,
  pro: site.signup,
  business: site.contact,
};

export function Pricing() {
  return (
    <section className="mx-auto flex h-[800px] w-[1440px] flex-col items-center justify-center gap-10 px-10 py-20">
      <div className="flex w-[685px] flex-col items-center justify-center gap-4">
        <Eyebrow>Our Pricing</Eyebrow>
        <SectionTitle className="w-full text-center">Simple pricing, real workspace.</SectionTitle>
      </div>

      <div className="flex min-h-0 w-[1016px] flex-1 flex-col items-start">
        <div className="flex w-full items-start justify-center">
          <span
            className="display flex h-8 w-[120px] items-center justify-center rounded-t-[12px] px-3 py-2 text-[16px] leading-none tracking-[-0.16px] text-cream"
            style={{ backgroundImage: grad.tab120x32, backgroundSize: "100% 100%" }}
          >
            Most popular
          </span>
        </div>
        <div className="flex min-h-0 w-full flex-1 items-start gap-4">
          {plans.map((p) => (
            <article key={p.key} className="relative flex h-full min-w-0 flex-1 flex-col rounded-[24px] bg-card p-2">
              {p.featured && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[inherit] p-[2px]"
                  style={{
                    backgroundImage: grad.proRing328x448,
                    backgroundSize: "100% 100%",
                    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
                    WebkitMaskClip: "content-box, border-box",
                    WebkitMaskComposite: "xor",
                    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
                    maskClip: "content-box, border-box",
                    maskComposite: "exclude",
                  }}
                />
              )}

              <div
                className="flex h-[200px] w-full flex-col items-start justify-between rounded-[16px] p-4"
                style={p.featured ? { backgroundImage: grad.pro312x200, backgroundSize: "100% 100%" } : { backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <span className="flex h-7 items-center rounded-[40px] bg-white px-[10px] text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-black">{p.name}</span>
                <div className="flex w-full flex-col items-start gap-4">
                  {p.period ? (
                    <div className="flex items-end gap-2 whitespace-nowrap">
                      <span className="display text-[40px] leading-none tracking-[-0.4px] text-cream">{p.price}</span>
                      <span className={`text-[16px] font-medium leading-[1.4] tracking-[-0.16px] ${p.featured ? "text-white/90" : "text-white/80"}`}>{p.period}</span>
                    </div>
                  ) : (
                    <span className="display flex h-10 items-center text-[40px] leading-[1.2] tracking-[-0.4px] text-white">{p.price}</span>
                  )}
                  <p className={`w-full text-[16px] font-medium leading-[1.4] tracking-[-0.16px] ${p.featured ? "text-white/90" : "text-white/80"}`}>{p.blurb}</p>
                </div>
              </div>
              <div className="flex min-h-0 w-full flex-1 flex-col items-start justify-between rounded-[16px] px-2 pb-2 pt-4">
                <ul className="flex w-full flex-col gap-[10px] text-white">
                  {p.features.map((f) => (
                    <li key={f} className="flex w-[296px] items-center gap-[6px]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-cream"><IconCheck size={14} /></span>
                      <span className="whitespace-nowrap text-[16px] leading-[1.4] tracking-[-0.16px]">{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={ctaHref[p.key]}
                  className={`display flex h-10 w-full items-center justify-center rounded-[57.6px] py-1 pl-2 pr-1 text-center text-[14px] leading-4 transition-[scale,background-color] duration-200 ease-soft active:scale-[0.98] ${
                    p.featured ? "bg-white text-ink hover:bg-cream" : "stroke-10 text-white hover:bg-white/5"
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
