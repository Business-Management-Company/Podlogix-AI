"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { IconArrowUp, IconBackward, IconForward, IconPlayCircle } from "@/components/icons";
import { grad } from "@/lib/gradient";
import { usePrefersReducedMotion } from "@/lib/useRem";

const rem = (n: number) => `${n / 16}rem`;
const d = (ms: number, extra: Record<string, string | number> = {}) => ({ "--d": `${ms}ms`, ...extra }) as React.CSSProperties;

/* The site's beat: the creator rotation holds for 3s and moves in 900ms. */
const HOLD = 3000;
const MOVE = 900;

export type VisualProps = { live: boolean; base: number };

/**
 * A card plays its illustration once it is a third on screen: a reveal in
 * the language of the rest of the page (rises through echo copies, pops out
 * from the hub nearest first, bars growing, rows cascading), then a quiet
 * idle loop. Visitors who prefer reduced motion get the drawn frame.
 */
function useLive<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [live, setLive] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, reduced]);
  return live && !reduced;
}

/* Card 1: the player. Bar heights and alphas as drawn; the alphas are the
   playhead, so playback is one number the bars read. */
const wave: [number, number][] = [
  [20, 1], [12, 1], [16, 1], [8, 1], [12, 1], [20, 1], [8, 1], [12, 1], [16, 1], [8, 1], [16, 1], [12, 1], [20, 1], [12, 1], [16, 1],
  [8, 1], [12, 1], [20, 1], [8, 1], [12, 1], [16, 1], [8, 0.6], [16, 0.3], [12, 0.1], [8, 0.1], [16, 0.1], [20, 0.1], [8, 0.1],
  [16, 0.1], [20, 0.1], [12, 0.1], [16, 0.1], [8, 0.1], [12, 0.1], [8, 0.1], [16, 0.1], [20, 0.1], [8, 0.1],
];

function PlayerVisual({ base }: VisualProps) {
  return (
    <>
      <div className="why-rise absolute left-1/2 top-[calc(50%-12.5px)] h-[149px] w-[217px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-[#443130]" style={d(base)} />
      <div className="why-rise absolute left-1/2 top-[calc(50%-0.5px)] h-[149px] w-[248px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-[#534342]" style={d(base + 80)} />
      <div className="why-rise absolute left-1/2 top-[calc(50%-7px)] h-8 w-[133px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-white/10" style={d(base + 80)} />
      <div className="why-rise absolute left-1/2 top-[calc(50%-13px)] h-8 w-[116px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-white/10" style={d(base + 80)} />
      <div className="why-rise absolute left-1/2 top-[calc(50%-1px)] h-8 w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-white/10" style={d(base + 80)} />
      <div
        className="why-rise absolute left-1/2 top-[calc(50%+11.5px)] flex w-[280px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-end gap-4 overflow-hidden rounded-[16px] bg-white p-4"
        style={d(base + 160)}
      >
        <div className="flex w-full items-center gap-[10px]">
          <span
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] shadow-[0_6.25px_18.75px_0_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: grad.icon40, backgroundSize: "100% 100%" }}
          >
            <Image src="/l/images/why/player-thumb.webp" alt="" width={41} height={52} className="absolute left-1/2 top-1/2 h-[52px] w-[41px] max-w-none -translate-x-[calc(50%-0.5px)] -translate-y-[calc(50%+1.5px)] object-cover" />
          </span>
          <span className="flex flex-col gap-[2px] text-[16px] font-medium leading-[1.4] tracking-[-0.16px]">
            <span className="whitespace-nowrap text-[#2a1615]">Alexandria show</span>
            <span className="whitespace-nowrap text-[#2a1615]/40">1 hours 24 minutes</span>
          </span>
        </div>
        <div className="why-play flex h-5 w-full items-center justify-between" style={d(base + 1400)} aria-hidden>
          {wave.map(([h, a], i) => (
            <span
              key={i}
              className="why-bar why-wave block w-[3px] rounded-[1px] bg-[#ef5b25]"
              style={{ height: rem(h), "--a": a, "--i": i, "--d": `${base + 520 + i * 12}ms` } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="flex items-start gap-2 text-ink">
          <span className="flex h-6 w-6 items-center justify-center"><IconBackward size={16} /></span>
          <span className="flex h-6 w-6 items-center justify-center"><IconPlayCircle size={16} /></span>
          <span className="flex h-6 w-6 items-center justify-center"><IconForward size={16} /></span>
        </div>
      </div>
    </>
  );
}

/* Card 2: distribution chips around the mark. Rank is the distance from the
   mark, so the reveal ripples outward; the idle loop lights each platform
   in turn, "show up everywhere". */
const chips: { label: string; logo: React.ReactNode; gap?: string; rank: number; fy: number }[] = [
  { label: "Spotify", rank: 3, fy: 10, logo: <Image src="/l/logos/spotify.png" alt="" width={20} height={20} className="h-5 w-5" /> },
  { label: "Apple Podcasts", rank: 3, fy: 10, logo: <Image src="/l/logos/apple-podcasts.png" alt="" width={20} height={20} className="h-5 w-5" /> },
  { label: "Buzzsprout", rank: 1, fy: 8, logo: <Image src="/l/logos/buzzsprout.svg" alt="" width={24} height={24} unoptimized className="h-6 w-6" /> },
  { label: "Podbean", rank: 0, fy: 8, logo: <Image src="/l/logos/podbean.png" alt="" width={20} height={20} className="h-5 w-5" /> },
  { label: "Libsyn", rank: 1, fy: 8, logo: <Image src="/l/logos/libsyn.svg" alt="" width={24} height={24} unoptimized className="h-6 w-6" /> },
  { label: "Captivate", rank: 1, fy: -8, logo: <Image src="/l/logos/captivate.png" alt="" width={20} height={20} className="h-5 w-5" /> },
  {
    label: "Amazon Music",
    rank: 0,
    fy: -8,
    logo: (
      <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-[4px] bg-[#14191c]">
        <Image src="/l/logos/amazon-music.png" alt="" width={36} height={21} className="h-[21px] w-9 max-w-none translate-y-px" />
      </span>
    ),
  },
  { label: "YouTube", rank: 1, fy: -8, logo: <Image src="/l/logos/youtube.png" alt="" width={20} height={14} className="h-[14px] w-5" /> },
  { label: "Riverside.fm", rank: 3, fy: -10, gap: "gap-[5px]", logo: <Image src="/l/logos/riverside.png" alt="" width={20} height={20} className="h-5 w-5 rounded-[4px]" /> },
  { label: "Restream", rank: 2, fy: -10, gap: "gap-[5px]", logo: <Image src="/l/logos/restream.png" alt="" width={20} height={20} className="h-5 w-5" /> },
  { label: "Zoom", rank: 3, fy: -10, gap: "gap-[5px]", logo: <Image src="/l/logos/zoom.png" alt="" width={20} height={20} className="h-5 w-5" /> },
];
const LIGHT = 700;

function PublishVisual({ base }: VisualProps) {
  return (
    <>
      <div className="absolute left-[calc(50%-0.5px)] top-1/2 flex w-[391px] -translate-x-1/2 -translate-y-1/2 flex-wrap content-center items-center justify-center gap-[10px]">
        {chips.map((c, i) => (
          <span
            key={c.label}
            className={`why-pop relative flex h-8 items-center ${c.gap ?? "gap-[6px]"} overflow-hidden rounded-[8px] bg-white py-2 pl-[5px] pr-[10px]`}
            style={d(base + 200 + c.rank * 90, { "--fy": `${c.fy}px` })}
          >
            <span
              className="why-light pointer-events-none absolute inset-0 opacity-0"
              style={{ backgroundImage: grad.chip151x40, backgroundSize: "100% 100%", ...d(base + 1600 + i * LIGHT) }}
              aria-hidden
            />
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">{c.logo}</span>
            <span className="why-light-text relative whitespace-nowrap text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-[#2a1615]" style={d(base + 1600 + i * LIGHT)}>
              {c.label}
            </span>
          </span>
        ))}
      </div>
      <div
        className="why-hub absolute left-1/2 top-1/2 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_50px_0_rgba(0,0,0,0.4)]"
        style={{ backgroundImage: grad.circle100, backgroundSize: "100% 100%", ...d(base) }}
      >
        <Image src="/l/brand/logo-mark-cream.svg" alt="" width={54} height={64} unoptimized className="h-16 w-[53.6px] max-w-none" />
      </div>
    </>
  );
}

/* Card 3: the chart. Bars grow in from the left, the highlighted one last,
   the badge counts up, then the bars breathe and the marker keeps pinging. */
const dotColumns = [
  [0.07, 0.07, 0.07, 0.12, 0.07, 0.07, 0.07, 0.12, 0.07, 0.07, 0.07, 0.12, 0.07, 0.07, 0.07, 0.12],
  [0.07, 0.12, 0.25, 0.07, 0.07, 0.07, 0.25, 0.07, 0.12, 0.25, 0.07, 0.07, 0.07, 0.25],
  [0.07, 0.12, 0.07, 0.07, 0.12, 0.07, 0.07, 0.12, 0.07, 0.07, 0.12, 0.07, 0.07, 0.12, 0.07, 0.07, 0.12, 0.07],
];
const breathe = (s1: number, s2: number) => ({ "--s1": s1, "--s2": s2 });

function ChartVisual({ live, base }: VisualProps) {
  const [value, setValue] = useState(12.4);
  useEffect(() => {
    if (!live) return;
    let frame = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / 1200);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * 124) / 10);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setValue(0);
      frame = requestAnimationFrame(tick);
    }, base + 700);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [live, base]);

  return (
    <>
      <div className="why-fade absolute left-[calc(50%+58px)] top-[calc(50%+36px)] h-[296px] w-14 -translate-x-1/2 -translate-y-1/2 rounded-[9px] bg-white/10 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.1),0_0_7.79px_0_rgba(0,0,0,0.05)]" style={d(base + 300)} />
      <div className="why-grow absolute left-[15px] top-[170px] h-[124px] w-10 rounded-[8px] bg-white" style={d(base, breathe(0.93, 1.05))} />
      <div className="why-grow absolute left-[74px] top-[115px] h-[179px] w-10 rounded-[8px] bg-white/10" style={d(base + 90, breathe(1.04, 0.95))} />
      <div className="why-grow absolute left-[133px] top-[149px] h-[145px] w-10 rounded-[8px] bg-white" style={d(base + 180, breathe(0.96, 1.06))} />
      <div className="why-grow-hi absolute left-[192.17px] top-[149.21px] h-[200.96px] w-[43.62px] rounded-t-[4.67px] bg-black/5" style={d(base + 360)} />
      <div
        className="why-grow-hi absolute left-[calc(50%+58px)] top-[calc(50%+41.5px)] h-[295px] w-11 -translate-x-1/2 -translate-y-1/2 rounded-[7px] shadow-[0_0_10px_0_rgba(0,0,0,0.3)]"
        style={{ backgroundImage: grad.bar44x295, backgroundSize: "100% 100%", ...d(base + 360) }}
      />
      <div className="why-grow absolute left-[calc(50%+120px)] top-[calc(50%+76px)] h-[242px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-white/10" style={d(base + 270, breathe(1.05, 0.94))} />
      <div className="why-grow absolute left-[calc(50%+182.51px)] top-[calc(50%+108.41px)] h-[160.46px] w-[43.62px] -translate-x-1/2 -translate-y-1/2 rounded-t-[4.67px] bg-black/5" style={d(base + 270, breathe(1.05, 0.94))} />
      <div className="why-fade absolute left-[calc(50%+58px)] top-[calc(50%+76.5px)] flex w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-between" style={d(base + 520)} aria-hidden>
        {dotColumns.map((col, ci) => (
          <span key={ci} className="flex flex-col items-start gap-[2.835px]">
            {col.map((a, i) => (
              <span key={i} className="block h-[10px] w-[10px] rounded-[3px]" style={{ backgroundColor: `rgba(255,255,255,${a})` }} />
            ))}
          </span>
        ))}
      </div>
      <Image src="/l/icons/dashed-line.svg" alt="" width={548} height={1} unoptimized className="why-draw absolute left-[calc(50%+0.46px)] top-[calc(50%-57.81px)] h-px w-[548.37px] max-w-none -translate-x-1/2" style={d(base + 420)} />
      <div
        className="why-pop absolute left-[106px] top-[calc(50%-92px)] flex h-7 -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] bg-white px-[6px] shadow-[inset_0_0_0_0.78px_rgba(0,0,0,0.05)] drop-shadow-[3.1px_3.1px_4.7px_rgba(0,0,0,0.05)]"
        style={d(base + 700, { "--fy": "6px" })}
      >
        <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-black">+{value.toFixed(1)}%</span>
        <span className="flex h-4 w-4 items-center justify-center text-[#10b77f]"><IconArrowUp size={12} /></span>
      </div>
      <div className="why-pop absolute left-[203px] top-[67px] h-5 w-5" style={d(base + 640)}>
        <span className="why-ping absolute left-1/2 top-1/2 h-[20.77px] w-[20.77px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 opacity-0" style={d(base + 1800)} aria-hidden />
        <span className="absolute left-0 top-[calc(50%+0.39px)] h-[20.77px] w-[20.77px] -translate-y-1/2 rounded-full bg-white/20" />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2.6px_3.9px_0_rgba(0,0,0,0.1)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_3.73px_3.73px_11.19px_0_rgba(0,0,0,0.02)]" />
    </>
  );
}

/* Card 4: the team chips. The file leaves twelve of the circles empty, so
   those slots borrow the page's other portraits. Rows cascade in, then the
   cursor tours the team and the highlight follows it on the creator beat. */
type Person = { name: string; kind: "illustrated" | "photo"; src: string; pos?: string };
const person = (name: string, kind: Person["kind"], src: string, pos?: string): Person => ({ name, kind, src, pos });
const rows: { size: 38.4 | 33.33; people: Person[] }[] = [
  {
    size: 38.4,
    people: [
      person("Nina Halberg", "photo", "/l/images/creators/2.webp", "50% 30%"),
      person("Jace Monroe", "photo", "/l/avatars/jace.webp", "50% 50%"),
      person("Lara Devlin", "photo", "/l/avatars/lara.webp", "50% 20%"),
      person("Owen Radcliffe", "photo", "/l/images/trending/1.webp", "50% 15%"),
    ],
  },
  {
    size: 33.33,
    people: [
      person("Maya Sterling", "photo", "/l/images/creators/3.webp", "50% 25%"),
      person("Caleb Mercer", "photo", "/l/avatars/caleb.webp", "50% 30%"),
      person("Zara Finch", "photo", "/l/avatars/zara.webp", "50% 50%"),
      person("Ivy Langston", "photo", "/l/images/testimonials/1.webp", "45% 50%"),
      person("Ivy Langston", "photo", "/l/images/trending/5.webp", "50% 20%"),
    ],
  },
  {
    size: 33.33,
    people: [
      person("Jude Ellison", "photo", "/l/images/testimonials/2.webp", "50% 15%"),
      person("Tara Winslow", "photo", "/l/avatars/tara.webp", "50% 50%"),
      person("Evan Carver", "photo", "/l/avatars/evan.webp", "50% 10%"),
      person("Sienna Brooks", "photo", "/l/images/testimonials/3.webp", "50% 20%"),
    ],
  },
  {
    size: 33.33,
    people: [
      person("Liam Calder", "photo", "/l/images/creators/1.webp", "50% 20%"),
      person("Maya Sterling", "photo", "/l/avatars/maya.webp", "50% 50%"),
      person("Owen Radcliffe", "photo", "/l/avatars/owen.webp", "50% 50%"),
      person("Jace Monroe", "photo", "/l/images/trending/4.webp", "50% 15%"),
      person("Jace Monroe", "photo", "/l/images/trending/3.webp", "50% 20%"),
    ],
  },
  {
    size: 33.33,
    people: [
      person("Nina Halberg", "photo", "/l/images/hero-portrait.webp", "50% 18%"),
      person("Lara Devlin", "photo", "/l/avatars/lara-2.webp", "50% 30%"),
      person("Caleb Mercer", "photo", "/l/avatars/caleb-2.webp", "50% 50%"),
      person("Zara Finch", "photo", "/l/images/trending/2.webp", "50% 20%"),
    ],
  },
];
/* The cursor's tour, as row-column keys. It starts and ends on the drawn chip. */
const TOUR = ["2-1", "1-1", "1-2", "3-2", "3-1", "0-1"];
const CURSOR = { left: 227, top: 146 };

function Avatar({ p, size, lit }: { p: Person; size: number; lit: boolean }) {
  if (p.kind === "illustrated") {
    return <Image src={p.src} alt="" width={size} height={size} unoptimized className="relative shrink-0" style={{ width: rem(size), height: rem(size) }} />;
  }
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{ width: rem(size), height: rem(size), backgroundColor: lit ? "#ffffff" : "#2a1615", transition: "background-color 620ms var(--ease-soft)" }}
    >
      <Image src={p.src} alt="" fill sizes="40px" className="object-cover" style={{ objectPosition: p.pos ?? "50% 50%" }} />
    </span>
  );
}

function TeamVisual({ live, base }: VisualProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLImageElement>(null);
  const [lit, setLit] = useState(TOUR[0]);

  useEffect(() => {
    const box = boxRef.current;
    const cursor = cursorRef.current;
    if (!live || !box || !cursor) return;
    let step = 0;
    let timer = 0;
    const home = box.querySelector<HTMLElement>(`[data-person="${TOUR[0]}"]`);
    if (!home) return;
    // Where the cursor sits on the drawn chip, as a fraction of the chip.
    const origin = box.getBoundingClientRect();
    const h = home.getBoundingClientRect();
    const fx = (origin.left + CURSOR.left - h.left) / h.width;
    const fy = (origin.top + CURSOR.top - h.top) / h.height;
    const move = () => {
      step = (step + 1) % TOUR.length;
      const key = TOUR[step];
      const chip = box.querySelector<HTMLElement>(`[data-person="${key}"]`);
      if (!chip) return;
      const o = box.getBoundingClientRect();
      const r = chip.getBoundingClientRect();
      const x = r.left - o.left + fx * r.width - CURSOR.left;
      const y = r.top - o.top + fy * r.height - CURSOR.top;
      cursor.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      // The highlight follows once the cursor arrives.
      timer = window.setTimeout(() => {
        setLit(key);
        timer = window.setTimeout(move, HOLD);
      }, MOVE);
    };
    timer = window.setTimeout(move, base + 2200);
    return () => window.clearTimeout(timer);
  }, [live, base]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      <div className="absolute left-[calc(50%+94.52px)] top-[calc(50%+0.05px)] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[10px]">
        {rows.map((row, ri) => {
          const big = row.size === 38.4;
          return (
            <div key={ri} className="flex h-10 items-center gap-[10px]">
              {row.people.map((p, pi) => {
                const key = `${ri}-${pi}`;
                const on = lit === key;
                return (
                  <span
                    key={`${p.name}-${pi}`}
                    data-person={key}
                    className={`why-row relative flex h-10 items-center overflow-hidden ${big ? "gap-[7.68px] rounded-[23.05px] pl-[3.84px] pr-[15.37px]" : "gap-[6.67px] rounded-[20px] pl-[3.33px] pr-[13.33px]"}`}
                    style={{ ...d(base + 60 + (ri * 5 + pi) * 35), backgroundColor: on ? "transparent" : "#ffffff", transition: "background-color 620ms var(--ease-soft)" }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{ backgroundImage: grad.chip151x40, backgroundSize: "100% 100%", opacity: on ? 1 : 0, transition: "opacity 620ms var(--ease-soft)" }}
                      aria-hidden
                    />
                    <Avatar p={p} size={row.size} lit={on} />
                    <span
                      className="relative whitespace-nowrap text-center text-[16px] font-medium leading-[1.4] tracking-[-0.16px]"
                      style={{ color: on ? "#ffffff" : "#2a1615", transition: "color 620ms var(--ease-soft)" }}
                    >
                      {p.name}
                    </span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <Image
        ref={cursorRef}
        src="/l/icons/cursor.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        className="why-fade absolute h-6 w-6"
        style={{ left: rem(CURSOR.left), top: rem(CURSOR.top), transition: `transform ${MOVE}ms var(--ease-soft)`, ...d(base + 950) }}
      />
    </div>
  );
}

export const whyCards = [
  { title: ["Production without", "the pileup"], sub: "Send us the raw conversation. Get back a polished episode, clips, artwork, and notes.", Visual: PlayerVisual, radius: "rounded-[20px]" },
  { title: ["Publish once.", "Show up everywhere."], sub: "Apple, Spotify, YouTube, Buzzsprout, RSS and whatever comes next.", Visual: PublishVisual, radius: "rounded-[20px]" },
  { title: ["Know what is", "actually working"], sub: "See every episode's performance in one view and get AI insight into your next move.", Visual: ChartVisual, radius: "rounded-[12.4px]" },
  { title: ["Real people behind", "the platform"], sub: "A creator team that uses Podlogix daily. We build what we need—and share where you fit.", Visual: TeamVisual, radius: "rounded-[20px]" },
];
export type WhyCard = (typeof whyCards)[number];

/** One card; the illustration wakes when the card is a third on screen. */
export function WhyCardFrame({ card, className = "flex h-full min-w-0 flex-1 flex-col", children }: { card: WhyCard; className?: string; children: (live: boolean) => React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const live = useLive(ref);
  return (
    <article ref={ref} className={`${className} rounded-[24px] bg-cream/5 p-2 ${live ? "why-live" : ""}`} data-card={card.title[0]}>
      {children(live)}
    </article>
  );
}

export function WhyChooseUs() {
  return (
    <section className="mx-auto flex h-[764px] w-[1440px] flex-col items-start justify-center gap-10 px-10 py-20">
      <div className="flex flex-col items-start gap-4">
        <Eyebrow>Why choose us</Eyebrow>
        <SectionTitle className="whitespace-nowrap tracking-normal text-white">Your show. No chaos.</SectionTitle>
      </div>
      <div className="flex h-[480px] w-full items-center gap-4">
        {whyCards.map((c, k) => (
          <WhyCardFrame key={c.title[0]} card={c}>
            {(live) => (
              <>
                <div className={`stroke-5 relative min-h-0 w-full flex-1 overflow-hidden ${c.radius} bg-white/5`}>
                  <c.Visual live={live} base={k * 120} />
                </div>
                <div className="flex h-[180px] w-full flex-col items-start gap-3 px-4 pb-4 pt-6">
                  <h3 className="display w-full text-[24px] leading-[1.2] tracking-[-0.24px] text-cream">
                    {c.title[0]}
                    <br />
                    {c.title[1]}
                  </h3>
                  <p className="w-full text-[16px] font-medium leading-[1.4] tracking-[-0.16px] text-cream/60">{c.sub}</p>
                </div>
              </>
            )}
          </WhyCardFrame>
        ))}
      </div>
    </section>
  );
}
