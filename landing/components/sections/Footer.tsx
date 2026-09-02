import Image from "next/image";
import { IconGithub, IconInstagram, IconLinkedin, IconX } from "@/components/icons";
import { footerColumns } from "@/lib/data";
import { WaitlistForm } from "@/components/ui/WaitlistForm";
import { site } from "@/lib/site";

const socials = [
  { label: "Instagram", href: site.social.instagram, icon: <IconInstagram size={20} /> },
  { label: "LinkedIn", href: site.social.linkedin, icon: <IconLinkedin size={20} /> },
  { label: "X", href: site.social.x, icon: <IconX size={20} /> },
  { label: "GitHub", href: site.social.github, icon: <IconGithub size={20} /> },
];

const linkHref: Record<string, string> = {
  Dashboard: "#workspace",
  "Live studio": "#workspace",
  Podcast: "#workspace",
  Refiner: "#workspace",
  Livestream: "#features",
  Conference: "#features",
  "Live event": "#features",
  Features: "#features",
  Integrations: "#integrations",
  Pricing: "#pricing",
  About: "#about",
  "Privacy policy": site.privacy,
  "Terms of services": site.terms,
};

export function Footer() {
  return (
    <footer className="relative mx-auto flex h-[720px] w-[1440px] flex-col items-start gap-10 overflow-hidden p-10">
      <div className="flex h-[240px] w-full items-start justify-between">
        <div className="flex h-full w-[502px] flex-col items-start justify-between">
          <div className="flex w-full flex-col items-start gap-4">
            <h2 className="h-section w-full whitespace-pre-wrap">{"Ready to level up \nyour business podcast?"}</h2>
            <p className="w-[412px] text-[16px] leading-[1.4] tracking-[-0.16px] text-white/80">
              Join the beta and be one of the first creators on Podlogix. Early feedback shapes the platform.
            </p>
          </div>
          <div className="flex items-start gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition-[scale] duration-200 ease-soft hover:scale-105 active:scale-95"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="flex h-full w-[672px] flex-col items-start justify-between">
          <nav aria-label="Footer" className="flex w-full items-start gap-4 text-[16px] tracking-[-0.16px]">
            {footerColumns.map((col, i) => (
              <div key={col.heading} className={`flex flex-col items-start justify-center gap-3 ${i === 1 ? "w-[156px] shrink-0" : "min-w-0 flex-1"}`}>
                <span className="whitespace-nowrap font-medium leading-[1.4] text-white/60">{col.heading}</span>
                <ul className="display flex flex-col items-start gap-2 leading-[1.4] text-white">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href={linkHref[l] ?? site.url} className="whitespace-nowrap transition-colors hover:text-cream/70">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <WaitlistForm size="lg" className="w-full" />
        </div>
      </div>

      {/* Giant lockup, bleeding off the bottom edge as the wordmark did in the file. */}
      <div className="pointer-events-none absolute bottom-[-40px] left-1/2 -translate-x-1/2" aria-hidden>
        <Image src="/l/brand/logo-lockup-cream.svg" alt="" width={870} height={204} unoptimized className="h-[304.3px] w-[1300px] max-w-none" />
      </div>
      <Image src="/l/images/footer-fade.png" alt="" width={1645} height={72} unoptimized className="pointer-events-none absolute bottom-0 left-[calc(50%-0.5px)] h-[72px] w-[1645px] max-w-none -translate-x-1/2 object-cover" aria-hidden />
    </footer>
  );
}
