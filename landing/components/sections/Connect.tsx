import Image from "next/image";
import { Eyebrow, SectionTitle } from "@/components/ui/SectionHeader";
import { IconEnvelope, IconInstagram, IconLinkedin, IconSpotify, IconTiktok, IconYoutube } from "@/components/icons";

type Item = { label: string; icon: React.ReactNode; gap?: string };

const items: Item[] = [
  { label: "Email", icon: <IconEnvelope size={24} /> },
  { label: "Spotify", icon: <IconSpotify size={24} /> },
  { label: "Instagram", icon: <IconInstagram size={24} /> },
  { label: "Tiktok", icon: <IconTiktok size={24} /> },
  { label: "LinkedIn", icon: <IconLinkedin size={24} /> },
  { label: "Youtube", icon: <IconYoutube size={24} /> },
  {
    label: "Amazon music",
    gap: "gap-3",
    icon: <Image src="/l/logos/amazon-music-wordmark.svg" alt="" width={37} height={24} unoptimized className="h-6 w-[36.93px] max-w-none" />,
  },
  {
    label: "Apple podcast",
    gap: "gap-3",
    icon: <Image src="/l/logos/apple-podcast-mark.svg" alt="" width={32} height={32} unoptimized className="h-8 w-8" />,
  },
];

const byLabel = Object.fromEntries(items.map((it) => [it.label, it])) as Record<string, Item>;
/* The two rows exactly as the file lays them out, including the repeated cards. */
const rowOne = ["LinkedIn", "Email", "Spotify", "Instagram", "Tiktok", "LinkedIn", "Youtube", "Amazon music", "Apple podcast"].map((l) => byLabel[l]);
const rowTwo = [...rowOne, byLabel.Youtube];
const PITCH = 228; // 220 card + 8 gap

/**
 * A row starts where the frame draws it (its cards centred as a group) and
 * drifts by exactly one sequence length, so the loop is seamless.
 */
function Row({ sequence, reverse }: { sequence: Item[]; reverse?: boolean }) {
  const loop = sequence.length * PITCH;
  const start = (1440 - (loop - 8)) / 2;
  const track = [...sequence, ...sequence, ...sequence];
  return (
    <div className="relative h-20 w-full overflow-hidden">
      <div
        className="absolute top-0 flex w-max items-center gap-2 will-change-transform motion-reduce:animate-none"
        style={
          {
            left: `${(start - (reverse ? loop : 0)) / 16}rem`,
            "--loop": `${-loop / 16}rem`,
            animation: `${reverse ? "marquee-right" : "marquee-left"} ${sequence.length * 4.6}s linear infinite`,
          } as React.CSSProperties
        }
      >
        {track.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className="stroke-5 flex h-20 w-[220px] shrink-0 items-center justify-center rounded-[16px] bg-white/[0.03]"
            aria-hidden={i >= sequence.length}
          >
            <span className={`flex items-center ${it.gap ?? "gap-1"} text-white`}>
              <span className="flex h-8 min-w-8 items-center justify-center">{it.icon}</span>
              <span className="whitespace-nowrap text-[20px] font-medium leading-[1.4] tracking-[-0.2px]">{it.label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Connect() {
  return (
    <section className="mx-auto flex h-[560px] w-[1440px] flex-col items-center justify-center gap-10 py-20">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow>Connect your business</Eyebrow>
        <SectionTitle className="whitespace-pre text-center tracking-normal text-white">
          {"Connects to everywhere your \nbusiness already runs"}
        </SectionTitle>
      </div>

      <div className="relative flex w-full flex-col items-start gap-2">
        <Row sequence={rowOne} />
        <Row sequence={rowTwo} reverse />
        <div className="pointer-events-none absolute left-0 top-1/2 h-[368px] w-[200px] -translate-y-1/2 bg-gradient-to-r from-ink to-ink/0" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-1/2 h-[368px] w-[200px] -translate-y-1/2 bg-gradient-to-l from-ink to-ink/0" aria-hidden />
      </div>
    </section>
  );
}
