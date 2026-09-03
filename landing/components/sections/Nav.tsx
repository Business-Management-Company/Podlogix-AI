import Image from "next/image";
import { site } from "@/lib/site";

const links = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: site.blog },
  { label: "About", href: "#about" },
];

export function Nav() {
  return (
    <header className="hero-nav absolute left-0 top-0 z-20 flex h-[72px] w-full items-center justify-between px-10 py-5">
      <a href="#top" className="flex items-center" aria-label="Podlogix home">
        <Image src="/l/brand/logo-lockup.svg" alt="" width={870} height={204} unoptimized className="h-8 w-[136.7px] max-w-none" />
      </a>

      <nav
        aria-label="Primary"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-[40px] bg-white/5 p-1"
      >
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="display flex h-8 items-center justify-center rounded-[30px] px-4 text-[14px] leading-[1.4] text-white/60 transition-colors duration-200 hover:bg-white/5 hover:text-white active:bg-white/10"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <a
        href={site.signup}
        className="display stroke-white flex h-10 items-center justify-center rounded-[40px] px-4 text-center text-[14px] leading-[1.2] text-white transition-colors duration-200 hover:bg-white hover:text-ink active:bg-cream"
      >
        Get started
      </a>
    </header>
  );
}
