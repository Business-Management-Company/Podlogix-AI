import Image from "next/image";
import { GradientRings } from "@/components/ui/GradientRings";
import { Reveal } from "@/components/ui/Reveal";
import { FitBox } from "@/components/ui/FitBox";
import { site } from "@/lib/site";

export function CtaMobile() {
  return (
    <section className="p-4">
      <Reveal>
        <div className="cta-field relative h-[368px] w-full overflow-hidden rounded-[40px] bg-white/10">
          <div className="cta-rings absolute inset-0 origin-[0%_100%]">
            <FitBox width={361} height={368}>
              <GradientRings set="ctaMobile" settle={3000} />
            </FitBox>
          </div>
        <div className="absolute left-1/2 top-1/2 flex w-[300px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6 sm:w-[560px]">
          <div className="flex w-full flex-col items-center gap-4">
            <Image src="/l/brand/logo-lockup-cream.svg" alt="Podlogix" width={870} height={204} unoptimized className="h-8 w-[136.7px] max-w-none" />
            <h2 className="display w-full text-center text-[32px] leading-[1.1] tracking-[-0.32px] text-paper sm:text-[48px]">
              Your show is a business.
              <br />
              Run it like one.
            </h2>
            <p className="w-[208px] text-center text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white sm:w-[360px] sm:text-[16px]">
              Start free, connect your show, and bring the rest of the business into one workspace.
            </p>
          </div>
          <div className="flex items-start">
            <a href={site.signup} className="flex h-10 items-center rounded-[57.6px] bg-cta py-1 pl-2 pr-1 text-cream">
              <span className="display flex items-center justify-center px-2 text-[16px] leading-[1.4]">Get started</span>
              <Image src="/l/icons/arrow-pill-sm.svg" alt="" width={40} height={32} unoptimized className="h-8 w-10" />
            </a>
            <a href="#pricing" className="display flex h-10 items-center justify-center rounded-[40px] px-4 text-[16px] leading-[1.4] text-cream">
              Explore pricing
            </a>
          </div>
        </div>
        </div>
      </Reveal>
    </section>
  );
}
