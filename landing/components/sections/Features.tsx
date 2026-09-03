"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { GradientRings } from "@/components/ui/GradientRings";
import {
  IconBullhorn,
  IconChevronUp,
  IconDesktop,
  IconHeadphones,
  IconMicrophone,
  IconNewspaper,
  IconRocket,
  IconScissors,
  IconShareNodes,
  IconSignalStream,
  IconStars,
  IconUsers,
} from "@/components/icons";
import { grad } from "@/lib/gradient";
import { usePrefersReducedMotion } from "@/lib/useRem";

/* Output cards, top to bottom. Rank is the distance from the hub: the
   choreography ripples outward, so the middle cards land first. */
const outputs = [
  { icon: <IconScissors size={16} />, title: "Clips", sub: "Short-form vertical content", rank: 2 },
  { icon: <IconStars size={16} />, title: "Highlights", sub: "Highlight saved", rank: 1 },
  { icon: <IconShareNodes size={16} />, title: "Social", sub: "Post prepared for your channel", rank: 0 },
  { icon: <IconNewspaper size={16} />, title: "Newsletter", sub: "Your broadcast, ready to send", rank: 0 },
  { icon: <IconBullhorn size={16} />, title: "Sponsors", sub: "Opportunities & integrations", rank: 1 },
  { icon: <IconUsers size={16} />, title: "Audience", sub: "Subscribers & engagement", rank: 2 },
];

const inputs = [
  { icon: <IconMicrophone size={16} />, label: "Podcast" },
  { icon: <IconSignalStream size={18} />, label: "Livestream" },
  { icon: <IconDesktop size={16} />, label: "Conference" },
  { icon: <IconHeadphones size={16} />, label: "Live event" },
];

type Tool = { label: string; logo: React.ReactNode };
const logo = (src: string, size = 20, extra = "") => (
  <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden ${extra}`}>
    <Image src={src} alt="" width={size} height={size} unoptimized={src.endsWith(".svg")} className="block object-contain" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} />
  </span>
);

const toolGroups: { title: string; top: number; left: 0 | 634; rank: number; tools: Tool[] }[] = [
  {
    title: "Podcast hosting",
    left: 0,
    top: -189,
    rank: 1,
    tools: [
      { label: "Buzzsprout", logo: logo("/l/logos/buzzsprout.svg", 24) },
      { label: "Libsyn", logo: logo("/l/logos/libsyn.svg", 24) },
      { label: "Podbean", logo: logo("/l/logos/podbean.png") },
      { label: "Captivate", logo: logo("/l/logos/captivate.png") },
    ],
  },
  {
    title: "Social & audience",
    left: 634,
    top: -103,
    rank: 1,
    tools: [
      { label: "Instagram", logo: logo("/l/logos/instagram.png") },
      { label: "Tiktok", logo: logo("/l/logos/tiktok.png", 24) },
      { label: "LinkedIn", logo: logo("/l/logos/linkedin.png", 20, "[&_img]:rounded-[2px]") },
      { label: "X (Twitter)", logo: logo("/l/logos/x.png", 18, "[&_img]:rounded-[3px]") },
    ],
  },
  {
    title: "Recording & streaming",
    left: 0,
    top: 0,
    rank: 0,
    tools: [
      { label: "Riverside.fm", logo: logo("/l/logos/riverside.png", 20, "[&_img]:rounded-[4px]") },
      { label: "Restream", logo: logo("/l/logos/restream.png") },
      { label: "Zoom", logo: logo("/l/logos/zoom.png") },
    ],
  },
  {
    title: "Email & CRM",
    left: 634,
    top: 103,
    rank: 2,
    tools: [
      { label: "Email/Newsletter", logo: logo("/l/logos/email.png") },
      {
        label: "Mailchimp",
        logo: (
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#ffe01b]">
            <Image src="/l/logos/mailchimp.png" alt="" width={28} height={28} className="block h-7 w-7 max-w-none" />
          </span>
        ),
      },
      {
        label: "Substack",
        logo: (
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#ff6719]">
            <Image src="/l/logos/substack.png" alt="" width={20} height={20} className="block h-5 w-5" />
          </span>
        ),
      },
      { label: "Patreon", logo: logo("/l/logos/patreon.png") },
    ],
  },
  {
    title: "Distribution",
    left: 0,
    top: 189,
    rank: 2,
    tools: [
      { label: "Spotify", logo: logo("/l/logos/spotify.png") },
      { label: "Apple Podcasts", logo: logo("/l/logos/apple-podcasts.png") },
      {
        label: "YouTube",
        logo: (
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
            <Image src="/l/logos/youtube.png" alt="" width={20} height={14} className="block h-[14px] w-5" />
          </span>
        ),
      },
      {
        label: "Amazon Music",
        logo: (
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#14191c]">
            <Image src="/l/logos/amazon-music.png" alt="" width={36} height={21} className="block h-[21px] w-9 max-w-none translate-y-px" />
          </span>
        ),
      },
    ],
  },
];

const rem = (n: number) => `${n / 16}rem`;

/**
 * The dashed connectors from the file, inlined so they can draw themselves
 * on entrance and keep their dashes flowing afterwards. Every path starts at
 * the hub end, so a falling dash offset moves the stream outward (and, on
 * the input line, into the hub). `from` is the clip that hides the line
 * before it draws: hidden from the right reveals left to right.
 */
type Conn = { d: string; vb: [number, number]; w: number; h: number; left: number; top: string; rank: number; stroke: string; opacity: number; dash: string; cycle: number; from: string; shift?: boolean };
const OUT = { stroke: "#FFD7A5", opacity: 1, dash: "6 6", cycle: 12, from: "0 100% 0 0" };
const PT = { stroke: "#ffffff", opacity: 0.5, dash: "5 5", cycle: 10 };
const R = "0 100% 0 0"; // reveal left to right (right-hand connectors)
const L = "0 0 0 100%"; // reveal right to left (left-hand connectors)

const inputConnector: Conn = { d: "M0 0.5H151", vb: [151, 1], w: 151, h: 1, left: 426, top: "50%", rank: 0, shift: true, ...OUT };
const outConnectors: Conn[] = [
  { d: "M0 200.5H21C29.8366 200.5 37 193.337 37 184.5V16.5C37 7.66344 44.1634 0.5 53 0.5H74", vb: [74, 201], w: 74, h: 200, left: 780, top: rem(111), rank: 2, ...OUT },
  { d: "M0 120.5H21C29.8366 120.5 37 113.337 37 104.5V16.5C37 7.66344 44.1634 0.5 53 0.5H74", vb: [74, 121], w: 74, h: 120, left: 780, top: rem(191), rank: 1, ...OUT },
  { d: "M0 40.5H21C29.8366 40.5 37 33.3366 37 24.5V16.5C37 7.66344 44.1634 0.5 53 0.5H74", vb: [74, 41], w: 74, h: 40, left: 780, top: rem(271), rank: 0, ...OUT },
  { d: "M0 0.5H21C29.8366 0.5 37 7.66345 37 16.5V104.5C37 113.337 44.1634 120.5 53 120.5H74", vb: [74, 121], w: 74, h: 120, left: 780, top: rem(311), rank: 1, ...OUT },
  { d: "M0 0.5H21C29.8366 0.5 37 7.66344 37 16.5V184.5C37 193.337 44.1634 200.5 53 200.5H74", vb: [74, 201], w: 74, h: 200, left: 780, top: rem(311), rank: 2, ...OUT },
  { d: "M0 0.5H21C29.8366 0.5 37 7.66344 37 16.5V24.5C37 33.3366 44.1634 40.5 53 40.5H74", vb: [74, 41], w: 74, h: 40, left: 780, top: rem(311), rank: 0, ...OUT },
];
const toolConnectors: Conn[] = [
  { d: "M0 104.5H16.5C27.5457 104.5 36.5 95.5457 36.5 84.5V20.5C36.5 9.45431 45.4543 0.5 56.5 0.5L121 0.5", vb: [121, 105], w: 121, h: 104, left: 513, top: "calc(50% - 3.25rem)", rank: 1, shift: true, from: R, ...PT },
  { d: "M0 0.5H16.5C27.5457 0.5 36.5 9.45431 36.5 20.5V92.5C36.5 103.546 45.4543 112.5 56.5 112.5H121", vb: [121, 113], w: 121, h: 112, left: 513, top: "calc(50% + 3.5rem)", rank: 2, shift: true, from: R, ...PT },
  { d: "M112 200.5H60.5C49.4543 200.5 40.5 191.546 40.5 180.5V20.5C40.5 9.45431 31.5457 0.5 20.5 0.5H0", vb: [112, 201], w: 112, h: 200, left: 240, top: "calc(50% - 6.25rem)", rank: 1, shift: true, from: L, ...PT },
  { d: "M112 0.5H0", vb: [112, 1], w: 112, h: 1, left: 240, top: "50%", rank: 0, shift: true, from: L, ...PT },
  { d: "M112 0.5H60.5C49.4543 0.5 40.5 9.45431 40.5 20.5V180.5C40.5 191.546 31.5457 200.5 20.5 200.5H0", vb: [112, 201], w: 112, h: 200, left: 240, top: "calc(50% + 6.25rem)", rank: 2, shift: true, from: L, ...PT },
];

function Connector({ c, delay }: { c: Conn; delay: number }) {
  return (
    <svg
      viewBox={`0 0 ${c.vb[0]} ${c.vb[1]}`}
      preserveAspectRatio="none"
      aria-hidden
      className={`feat-draw absolute max-w-none overflow-visible ${c.shift ? "-translate-y-1/2" : ""}`}
      style={{ left: rem(c.left), top: c.top, width: rem(c.w), height: rem(c.h), "--from": c.from, "--d": `${delay}ms` } as React.CSSProperties}
    >
      <path d={c.d} fill="none" stroke={c.stroke} strokeOpacity={c.opacity} strokeDasharray={c.dash} strokeLinejoin="round" className="feat-flow" style={{ "--cycle": `${-c.cycle}px` } as React.CSSProperties} />
    </svg>
  );
}

/** The views flip on their own once the board is on screen; a click picks
    a view and holds it before the flip resumes. */
const FLIP = 7000;
const PAUSE = 12000;
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/**
 * Each view plays the "one stream in, everything else out" choreography when
 * it becomes active: the input lands, its line draws into the hub, the hub
 * pops, the connectors draw outward and every card pops in at the end of its
 * line, nearest first, then the dashes keep flowing away from the hub.
 */
export function Features() {
  const boardRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(0);
  const [live, setLive] = useState(false);
  const reduced = usePrefersReducedMotion();
  const paused = useRef(false);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let timer = 0;
    let visible = false;
    const tick = () => {
      if (!paused.current) setTab((t) => (t + 1) % 2);
      timer = window.setTimeout(tick, FLIP);
    };
    const io = new IntersectionObserver(
      (entries) => {
        const now = entries.some((e) => e.isIntersecting);
        if (now && !visible) {
          visible = true;
          setLive(true);
          if (!reduced) timer = window.setTimeout(tick, FLIP);
        } else if (!now && visible) {
          visible = false;
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(board);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const go = (index: number) => {
    paused.current = true;
    window.setTimeout(() => {
      paused.current = false;
    }, PAUSE);
    setTab(index);
  };

  const view = (i: number) =>
    ({
      className: `absolute inset-0 transition-[opacity,transform] duration-[350ms] ease-soft ${live && tab === i ? "feat-live" : ""}`,
      style: { opacity: tab === i ? 1 : 0, transform: tab === i ? "none" : "translateY(12px)", pointerEvents: tab === i ? "auto" : "none" } as React.CSSProperties,
      "aria-hidden": tab !== i,
    }) as const;

  return (
    <section ref={boardRef} className="mx-auto flex h-[900px] w-[1440px] flex-col items-center gap-8 px-10 pb-6 pt-12">
          <div className="flex w-full flex-col items-center gap-6">
            <div className="flex w-full flex-col items-center gap-4">
              <span key={tab} className="feat-fade">
                <Eyebrow>{tab === 0 ? "Our Features" : "The Content Engine"}</Eyebrow>
              </span>
              <SectionTitle className="whitespace-nowrap">One stream in. Everything else out.</SectionTitle>
            </div>
            <div role="tablist" aria-label="Feature views" className="flex items-center rounded-[40px] bg-white/5 p-1">
              {[
                { label: "Platform tools", icon: <IconSignalStream size={18} /> },
                { label: "Integrations", icon: <IconRocket size={16} /> },
              ].map((t, i) => {
                const on = tab === i;
                return (
                  <button
                    key={t.label}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => go(i)}
                    className={`flex h-10 items-center justify-center gap-1 rounded-[30px] pl-2 pr-3 ${on ? "text-white" : "text-white/60"}`}
                    style={{
                      backgroundColor: on ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0)",
                      transition: reduced ? "none" : "background-color 620ms var(--ease-soft), color 620ms var(--ease-soft)",
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center">{t.icon}</span>
                    <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] tracking-[-0.16px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[32px]"
            style={{ backgroundImage: grad.board1360x640, backgroundSize: "100% 100%" }}
          >
            <GradientRings set="feat" />

            {/* Integrations */}
            <div {...view(1)}>
              <div
                className="feat-card absolute left-[226px] top-[calc(50%+4px)] flex h-12 w-[200px] -translate-y-1/2 items-center gap-1 rounded-[16px] bg-white px-[10px] text-[16px] text-ink drop-shadow-[0_2px_3px_rgba(0,0,0,0.05)]"
                style={{ ...d(0), "--fx": "-16px" } as React.CSSProperties}
              >
                <span className="flex h-8 w-8 items-center justify-center">
                  <IconMicrophone size={16} />
                </span>
                <span className="min-w-0 flex-1 font-medium leading-[1.4] tracking-[-0.16px]">Podcast</span>
                <span className="flex h-6 w-6 items-center justify-center">
                  <IconChevronUp size={14} />
                </span>
              </div>
              <div
                className="feat-card absolute left-[226px] top-[352px] flex w-[200px] flex-col rounded-[12px] bg-white p-1 text-[16px] text-ink"
                style={{ ...d(80), "--fx": "-16px" } as React.CSSProperties}
              >
                {inputs.map((it, i) => (
                  <span
                    key={it.label}
                    className={`feat-row flex h-11 w-full items-center gap-1 rounded-[10px] pl-2 pr-4 ${i === 0 ? "bg-[#f5f5f5]" : "shadow-[0_2px_6px_0_rgba(0,0,0,0.05)]"}`}
                    style={d(180 + i * 45)}
                  >
                    <span className="flex h-8 w-8 items-center justify-center">{it.icon}</span>
                    <span className="min-w-0 flex-1 font-medium leading-[1.4] tracking-[-0.16px]">{it.label}</span>
                  </span>
                ))}
              </div>

              <RecCard on={live && tab === 1} />

              <Connector c={inputConnector} delay={220} />

              <div className="feat-hub stroke-white absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={d(440)}>
                <div
                  className="stroke-white absolute left-1/2 top-1/2 flex h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)" }}
                >
                  <Image src="/l/brand/logo-mark-gradient.svg" alt="Podlogix" width={84} height={100} unoptimized className="h-[100px] w-[83.8px] max-w-none" />
                </div>
              </div>

              {outConnectors.map((c) => (
                <Connector key={c.d} c={c} delay={640 + c.rank * 90} />
              ))}

              {outputs.map((o, i) => (
                <div
                  key={o.title}
                  className="feat-card absolute left-[854px] flex w-[320px] items-start gap-[10px] rounded-[16px] bg-white p-[10px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.05)]"
                  style={{ top: rem(79 + i * 80), ...d(780 + o.rank * 90), "--fx": "-14px" } as React.CSSProperties}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">{o.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col text-[16px] font-medium leading-[1.4] tracking-[-0.16px]">
                    <span className="text-ink">{o.title}</span>
                    <span className="text-ink/80">{o.sub}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Platform tools */}
            <div {...view(0)}>
              <div className="absolute left-1/2 top-1/2 h-[598px] w-[874px] -translate-x-1/2 -translate-y-1/2">
                {toolGroups.map((g) => {
                  const start = 320 + g.rank * 90;
                  return (
                    <div
                      key={g.title}
                      className="feat-card stroke-20 absolute flex w-[240px] -translate-y-1/2 flex-col items-start gap-2 overflow-hidden rounded-[16px] bg-white/10 p-2 backdrop-blur-[12px]"
                      style={{ left: rem(g.left), top: `calc(50% + ${rem(g.top)})`, ...d(start), "--fx": g.left === 0 ? "14px" : "-14px" } as React.CSSProperties}
                    >
                      <span className="flex w-full items-center px-2 text-[16px] font-medium leading-[1.4] text-white">{g.title}</span>
                      <div className="flex w-full flex-col gap-3 rounded-[12px] bg-white p-3">
                        {g.tools.map((t, j) => (
                          <span key={t.label} className="feat-row flex w-full items-center gap-2" style={d(start + 160 + j * 45)}>
                            {t.logo}
                            <span className="whitespace-nowrap text-[16px] font-medium leading-[1.4] text-black">{t.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {toolConnectors.map((c) => (
                  <Connector key={c.d} c={c} delay={160 + c.rank * 90} />
                ))}

                <div className="feat-hub stroke-white absolute left-[calc(50%-4px)] top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={d(0)}>
                  <div
                    className="stroke-white absolute left-1/2 top-1/2 flex h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full"
                    style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 60.75%), linear-gradient(90deg, #fff 0%, #fff 100%)" }}
                  >
                    <Image src="/l/brand/logo-mark-gradient.svg" alt="Podlogix" width={80} height={96} unoptimized className="h-24 w-[80.4px] max-w-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
    </section>
  );
}

/**
 * The card Andrew missed from the old homepage: the incoming stream, live.
 * The timer ticks while the view is on stage and rests with it.
 */
function RecCard({ on }: { on: boolean }) {
  const [t, setT] = useState(861);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setT((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [on]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
  return (
    <div
      className="feat-card absolute left-[226px] top-[79px] flex w-[200px] flex-col gap-1 rounded-[16px] bg-white p-[10px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.05)]"
      style={{ ...d(40), "--fx": "-16px" } as React.CSSProperties}
    >
      <span className="flex items-center gap-2 text-[14px] font-medium leading-[1.4] tracking-[-0.14px] text-ink/80">
        <span className="feat-rec h-2 w-2 shrink-0 rounded-full bg-[#e5484d]" aria-hidden />
        Recording in session
      </span>
      <span className="display flex text-[24px] leading-[1.1] text-ink" aria-label={`Recording for ${text}`}>
        {text.split("").map((ch, i) => (
          <span key={i} className="text-center" style={{ width: ch === ":" ? "0.34em" : "0.62em" }}>
            {ch}
          </span>
        ))}
      </span>
      <span className="text-[12px] leading-[1.4] text-ink/60">Podlogix Studio or your current setup</span>
    </div>
  );
}
