import Image from "next/image";
import { GradientRings } from "@/components/ui/GradientRings";
import { ArrowPill, GhostPill } from "@/components/ui/Buttons";
import { site } from "@/lib/site";
import { Nav } from "./Nav";
import { HeroLetters } from "./HeroLetters";

/** Each word appears dim in turn, then the whole line brightens together. */
function Words({ text, from, step, bright }: { text: string; from: number; step: number; bright: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="hero-word inline-block" style={{ "--d": `${from + i * step}ms`, "--b": `${bright}ms` } as React.CSSProperties}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/* The copies behind the portrait run the same rise a beat later each, so the
   gaps stretch while she moves fast and close as she lands, as in the
   reference. The copies draw in front of her, latest in front, as in the file. */
const ECHO_BEAT = 120;
const ECHOES = [1, 2, 3, 4];

export function Hero() {
  return (
    <section className="relative h-[900px] w-full overflow-hidden bg-ink">
      <div className="relative mx-auto h-full w-[1440px]">
        <Nav />

        {/* Gradient card. Starts full-bleed while the rings bloom, then settles into place. */}
        <div className="hero-card absolute bottom-4 left-4 right-4 top-[404px] overflow-hidden rounded-[32px] bg-cream/10">
          <div className="hero-rings absolute inset-0 origin-[0%_100%]">
            <GradientRings set="hero" settle={4000} />
          </div>
          <div className="hero-copy">
            <div className="absolute left-6 top-[400px] flex items-start">
              <ArrowPill href={site.signup}>Start free</ArrowPill>
              <GhostPill href={site.workspaceTour}>Explore workspace</GhostPill>
            </div>
          </div>
        </div>

        <HeroLetters size={168} />

        {/* Portrait, rising from below with delayed copies trailing in front of it. */}
        <div className="pointer-events-none absolute bottom-[15px] left-[347px] h-[869px] w-[841px] overflow-hidden">
          <div className="hero-portrait absolute inset-0">
            <Image
              src="/l/images/hero-portrait.webp"
              alt="A podcast host laughing into a studio microphone while wearing headphones"
              width={841}
              height={1261}
              priority
              data-hero-portrait
              className="absolute left-0 top-[-36.62%] block h-[145.12%] w-full max-w-none"
            />
          </div>
          {ECHOES.map((n) => (
            <div key={n} className="hero-echo absolute inset-0" style={{ "--d": `${2250 + n * ECHO_BEAT}ms` } as React.CSSProperties} aria-hidden>
              <Image src="/l/images/hero-portrait.webp" alt="" width={841} height={1261} className="absolute left-0 top-[-36.62%] block h-[145.12%] w-full max-w-none" />
            </div>
          ))}
        </div>

        {/* Headline. Positions are the four text origins from the file. */}
        <h1 className="hero-title display absolute left-10 top-[112px] h-[252px] w-[1360px] whitespace-nowrap text-[120px] leading-[1.05] tracking-[-1.2px] text-cream">
          <span className="absolute left-0 top-0">
            <Words text="One place to" from={2050} step={110} bright={2550} />
          </span>
          <span className="absolute left-[1015px] top-0">
            <Words text="create," from={2380} step={110} bright={2550} />
          </span>
          <span className="absolute left-0 top-[126px]">
            <Words text="stream,and" from={2650} step={110} bright={3000} />
          </span>
          <span className="absolute left-[1009px] top-[126px]">
            <Words text="grow." from={2800} step={110} bright={3000} />
          </span>
        </h1>

      </div>
    </section>
  );
}
