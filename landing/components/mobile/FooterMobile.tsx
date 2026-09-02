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
const linkHref: Record<string, string> = { Dashboard: "#workspace", "Live studio": "#workspace", Podcast: "#workspace", Refiner: "#workspace", Livestream: "#features", Conference: "#features", "Live event": "#features", Features: "#features", Integrations: "#integrations", Pricing: "#pricing", About: "#about", "Privacy policy": site.privacy, "Terms of services": site.terms };

function Column({ col, className = "" }: { col: (typeof footerColumns)[number]; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <span className="text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white/60">{col.heading}</span>
      <ul className="display flex flex-col gap-2 text-[14px] leading-[1.4] tracking-[-0.14px] text-white">
        {col.links.map((l) => (
          <li key={l}>
            <a href={linkHref[l] ?? site.url}>{l}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FooterMobile() {
  return (
    <footer className="relative flex min-h-[720px] flex-col gap-8 overflow-hidden px-6 pt-8" style={{ paddingBottom: "calc(min(100vw - 48px, 520px) / 4.2717 + 22px)" }}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="display whitespace-pre-wrap text-[32px] leading-[1.2] tracking-[-0.32px] text-cream">{"Ready to level up \nyour business podcast?"}</h2>
          <p className="text-[14px] leading-[1.4] text-white/80">Join the beta and be one of the first creators on Podlogix. Early feedback shapes the platform.</p>
        </div>
        <div className="flex gap-3">
          {socials.map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink">
              {s.icon}
            </a>
          ))}
        </div>
      </div>
      {/* One grid for both rows so the second row lines up with the first; tablets get all four across. */}
      <nav aria-label="Footer" className="grid grid-cols-[minmax(0,1fr)_156px] gap-4 sm:grid-cols-4">
        <Column col={footerColumns[0]} className="min-w-0" />
        <Column col={footerColumns[1]} className="min-w-0" />
        <Column col={footerColumns[2]} className="min-w-0" />
        <Column col={footerColumns[3]} className="min-w-0" />
      </nav>
      <WaitlistForm size="sm" />

      <div className="pointer-events-none absolute bottom-[-10px] left-1/2 -translate-x-1/2" aria-hidden>
        <Image src="/l/brand/logo-lockup-cream.svg" alt="" width={870} height={204} unoptimized className="h-auto max-w-none" style={{ width: "min(calc(100vw - 48px), 520px)" }} />
      </div>
      <Image src="/l/images/footer-fade.png" alt="" width={1645} height={24} unoptimized className="pointer-events-none absolute bottom-0 left-1/2 h-[24px] w-[1645px] max-w-none -translate-x-1/2 object-cover" aria-hidden />
    </footer>
  );
}
