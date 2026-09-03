"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { IconBars, IconClose } from "@/components/icons";
import { HeroLetters } from "@/components/sections/HeroLetters";
import { site } from "@/lib/site";

const links = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: site.blog },
  { label: "About", href: "#about" },
];

const ECHO_BEAT = 120;
const ECHOES = [1, 2, 3, 4];

function Words({ text, from, step }: { text: string; from: number; step: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="hero-word inline-block" style={{ "--d": `${from + i * step}ms`, "--b": "2900ms" } as React.CSSProperties}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export function HeroMobile() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="relative h-[804px] w-full overflow-hidden bg-ink">
      <header className="hero-nav absolute left-0 top-0 z-30 flex h-16 w-full items-center justify-between px-6 py-5">
        <a href="#top" className="flex items-center" aria-label="Podlogix home">
          <Image src="/l/brand/logo-lockup.svg" alt="" width={870} height={204} unoptimized className="h-7 w-[119.6px] max-w-none" />
        </a>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className="stroke-white relative flex h-10 w-10 items-center justify-center rounded-full text-white"
        >
          <span className={`absolute transition-[opacity,transform,scale] duration-300 ease-soft ${open ? "-rotate-90 scale-75 opacity-0" : "rotate-0 opacity-100"}`}>
            <IconBars size={16} />
          </span>
          <span className={`absolute transition-[opacity,transform,scale] duration-300 ease-soft ${open ? "rotate-0 opacity-100" : "rotate-90 scale-75 opacity-0"}`}>
            <IconClose size={16} />
          </span>
        </button>
      </header>

      {/* The menu: the sheet fades in, the links cascade up one after another
          with the page's soft ease, and the button lands last. Closing is quick. */}
      <div
        id="mobile-menu"
        className="fixed inset-x-0 bottom-0 top-16 z-20 flex flex-col justify-between bg-ink px-6 pb-8 pt-6 transition-[opacity,transform] ease-soft"
        style={{ opacity: open ? 1 : 0, transform: open ? "none" : "translateY(-12px)", pointerEvents: open ? "auto" : "none", transitionDuration: open ? "420ms" : "220ms" }}
        aria-hidden={!open}
      >
        <nav aria-label="Primary" className="display flex flex-col gap-2 text-[32px] leading-[1.2] text-cream">
          {links.map((l, i) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`py-2 transition-[opacity,transform] ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
              style={{ transitionDuration: open ? "560ms" : "180ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)", transitionDelay: open ? `${90 + i * 70}ms` : "0ms" }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={site.signup}
          className={`display stroke-white flex h-12 items-center justify-center rounded-[40px] text-[16px] text-white transition-[opacity,transform] ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          style={{ transitionDuration: open ? "520ms" : "180ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)", transitionDelay: open ? "440ms" : "0ms" }}
        >
          Get started
        </a>
      </div>

      {/* Gradient card: full-bleed for the bloom, centred, then down to its place. */}
      <div className="hero-card absolute bottom-6 left-4 right-4 top-[360px] overflow-hidden rounded-[32px] bg-cream/10">
        <div className="hero-rings absolute inset-0 origin-[0%_100%]">
          <Image src="/l/gradients/hero-mobile-card.svg" alt="" fill unoptimized className="object-cover object-[0%_100%]" />
        </div>
      </div>

      <HeroLetters size={72} />

      <div className="absolute left-6 right-6 top-[88px]">
        <h1 className="hero-title display text-[48px] leading-[1.1] text-cream">
          <Words text="One place to create,stream and grow." from={2050} step={110} />
        </h1>
      </div>

      {/* Portrait, rising from below with delayed copies trailing in front of it. */}
      <div className="pointer-events-none absolute bottom-6 left-4 right-4 h-[441px] overflow-hidden rounded-br-[32px]">
        <div className="hero-portrait absolute inset-0">
          <Image
            src="/l/images/hero-portrait.webp"
            alt="A podcast host laughing into a studio microphone while wearing headphones"
            width={505}
            height={759}
            priority
            data-hero-portrait
            className="absolute left-[max(-70px,calc(50%-252px))] top-[-191px] h-[759px] w-[505px] max-w-none object-cover"
          />
        </div>
        {ECHOES.map((n) => (
          <div key={n} className="hero-echo absolute inset-0" style={{ "--d": `${2250 + n * ECHO_BEAT}ms` } as React.CSSProperties} aria-hidden>
            <Image src="/l/images/hero-portrait.webp" alt="" width={505} height={759} className="absolute left-[max(-70px,calc(50%-252px))] top-[-191px] h-[759px] w-[505px] max-w-none object-cover" />
          </div>
        ))}
      </div>

      <div className="hero-copy absolute bottom-12 left-1/2 flex w-max -translate-x-1/2 items-start">
        <a href={site.signup} className="flex h-10 shrink-0 items-center rounded-[57.6px] bg-cta py-1 pl-2 pr-1 text-cream">
          <span className="display flex items-center justify-center whitespace-nowrap px-2 text-[14px] leading-[1.4]">Start free</span>
          <Image src="/l/icons/arrow-pill-sm.svg" alt="" width={40} height={32} unoptimized className="h-8 w-10" />
        </a>
        <a href={site.workspaceTour} className="display flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] px-3 text-[14px] leading-[1.4] text-cream">
          Explore workspace
        </a>
      </div>
    </section>
  );
}
