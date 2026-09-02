import { Eyebrow } from "@/components/ui/SectionHeader";
import { IconCheck } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { plans } from "@/lib/data";
import { site } from "@/lib/site";

const ctaHref: Record<string, string> = { starter: site.demo, pro: site.signup, business: site.contact };

export function PricingMobile() {
  return (
    <section className="flex flex-col items-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow>Our Pricing</Eyebrow>
        <h2 className="display text-center text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">Simple pricing, real workspace.</h2>
      </div>
      <div className="flex w-full flex-col gap-4">
        {plans.map((p) => (
          <div key={p.key} className="flex flex-col">
            {p.featured && (
              <div className="flex justify-center">
                <span
                  className="display flex h-8 w-[120px] items-center justify-center rounded-t-[12px] px-3 py-2 text-[16px] leading-none tracking-[-0.16px] text-cream"
                  style={{ backgroundImage: grad.tab120x32, backgroundSize: "100% 100%" }}
                >
                  Most popular
                </span>
              </div>
            )}
            <article className="relative flex flex-col rounded-[24px] bg-card p-2">
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
                className="flex h-[184px] flex-col items-start justify-between rounded-[16px] p-4"
                style={p.featured ? { backgroundImage: grad.pro312x200, backgroundSize: "100% 100%" } : { backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <span className="flex h-7 items-center rounded-[40px] bg-white px-[10px] text-[14px] font-medium leading-[1.4] text-black">{p.name}</span>
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    <span className="display text-[32px] leading-none tracking-[-0.32px] text-cream">{p.price}</span>
                    {p.period && <span className="text-[14px] font-medium leading-[1.4] text-white/90">{p.period}</span>}
                  </div>
                  <p className="text-[14px] font-medium leading-[1.4] text-white/80">{p.blurb}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 px-2 pb-2 pt-4">
                <ul className="flex flex-col gap-[10px] text-white">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-[6px]">
                      <span className="flex h-5 w-5 items-center justify-center text-cream"><IconCheck size={12} /></span>
                      <span className="text-[14px] leading-[1.4]">{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={ctaHref[p.key]}
                  className={`display flex h-10 w-full items-center justify-center rounded-[57.6px] text-[14px] leading-4 ${p.featured ? "bg-white text-ink" : "stroke-10 text-white"}`}
                >
                  {p.cta}
                </a>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
