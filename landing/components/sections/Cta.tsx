import Image from "next/image";
import { GradientRings } from "@/components/ui/GradientRings";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowPill, GhostPill } from "@/components/ui/Buttons";
import { site } from "@/lib/site";

export function Cta() {
  return (
    <section className="mx-auto flex h-[640px] w-[1440px] flex-col items-start p-4">
      <Reveal className="relative flex min-h-0 w-[1408px] flex-1">
        <div className="cta-field relative min-h-0 w-full flex-1 overflow-hidden rounded-[40px] bg-white/10">
          <div className="cta-rings absolute inset-0 origin-[0%_100%]">
            <GradientRings set="cta" settle={3000} />
          </div>
        <div className="absolute left-1/2 top-1/2 flex w-[1180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-10">
          <div className="flex w-full flex-col items-center gap-6">
            <Image src="/l/brand/logo-lockup-cream.svg" alt="Podlogix" width={870} height={204} unoptimized className="h-10 w-[170.9px] max-w-none" />
            <h2 className="display w-full text-center text-[80px] leading-[1.1] tracking-[-0.8px] text-paper">
              Your show is a business.
              <br />
              Run it like one.
            </h2>
            <p className="w-[480px] text-center text-[20px] font-medium leading-[1.4] tracking-[-0.2px] text-white">
              Start free, connect your show, and bring the rest of
              <br />
              the business into one workspace.
            </p>
          </div>
          <div className="flex items-start">
            <ArrowPill href={site.signup}>Get started free</ArrowPill>
            <GhostPill href="#pricing">Explore pricing</GhostPill>
          </div>
        </div>
        </div>
      </Reveal>
    </section>
  );
}
