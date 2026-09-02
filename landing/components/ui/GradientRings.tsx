/**
 * The layered radial rings behind the hero card, the workspace panel, the
 * features board and the closing banner. Each ring is the exact SVG Figma
 * exports (radial fill plus the grain filter), placed at the coordinates from
 * the file, and given a slow staggered breathe so the stack reads as a sound
 * wave rather than a static wallpaper.
 */
type Ring = { file: string; left: number; top: number; w: number; h: number };

const sets: Record<"hero" | "ws" | "feat" | "cta" | "wsMobile" | "ctaMobile", Ring[]> = {
  wsMobile: [
    { file: "ws-30", left: -69, top: -249.67, w: 630, h: 631 },
    { file: "ws-29", left: -69, top: -180.67, w: 564, h: 562 },
    { file: "ws-28", left: -59, top: -89.67, w: 473, h: 471 },
    { file: "ws-27", left: -61, top: 5.33, w: 363, h: 365 },
    { file: "ws-31", left: -45, top: 94.33, w: 277, h: 276 },
    { file: "ws-26", left: -58, top: 192.33, w: 189, h: 170 },
  ],
  ctaMobile: [
    { file: "cta-30", left: -105, top: -287.71, w: 850, h: 850 },
    { file: "cta-29", left: -105, top: -195.71, w: 760, h: 758 },
    { file: "cta-28", left: -44, top: -96.71, w: 520, h: 518 },
    { file: "cta-27", left: -48, top: 8.29, w: 401, h: 400 },
    { file: "cta-26", left: -28, top: 105.29, w: 303, h: 303 },
  ],
  hero: [
    { file: "hero-30", left: -157, top: -698.17, w: 1663, h: 1664 },
    { file: "hero-29", left: -157, top: -519.17, w: 1487, h: 1485 },
    { file: "hero-28", left: -132, top: -280.17, w: 1247, h: 1246 },
    { file: "hero-27", left: -140, top: -28.17, w: 961, h: 960 },
    { file: "hero-26", left: -91, top: 205.83, w: 726, h: 726 },
  ],
  ws: [
    { file: "ws-30", left: -184, top: -476.17, w: 1377, h: 1379 },
    { file: "ws-29", left: -184, top: -328.17, w: 1232, h: 1231 },
    { file: "ws-28", left: -163, top: -130.17, w: 1033, h: 1033 },
    { file: "ws-27", left: -169, top: 78.83, w: 794, h: 795 },
    { file: "ws-31", left: -128, top: 272.83, w: 600, h: 601 },
    { file: "ws-26", left: -161, top: 486.83, w: 415, h: 371 },
  ],
  feat: [
    { file: "feat-30", left: -258, top: -742.17, w: 1757, h: 1758 },
    { file: "feat-29", left: -258, top: -553.17, w: 1571, h: 1569 },
    { file: "feat-28", left: -231, top: -300.17, w: 1318, h: 1316 },
    { file: "feat-27", left: -240, top: -34.17, w: 1015, h: 1014 },
    { file: "feat-26", left: -188, top: 213.83, w: 767, h: 766 },
  ],
  cta: [
    { file: "cta-30", left: -123, top: -743.22, w: 1742, h: 1743 },
    { file: "cta-29", left: -123, top: -556.22, w: 1557, h: 1556 },
    { file: "cta-28", left: -96, top: -306.22, w: 1306, h: 1306 },
    { file: "cta-27", left: -105, top: -42.22, w: 1006, h: 1005 },
    { file: "cta-26", left: -53, top: 203.78, w: 760, h: 759 },
  ],
};

const rem = (px: number) => `${px / 16}rem`;

export function GradientRings({
  set,
  animate = true,
  settle = 0,
  className = "",
}: {
  set: keyof typeof sets;
  animate?: boolean;
  /** Milliseconds to hold the ripple before it starts, so it never competes with an entrance. */
  settle?: number;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {sets[set].map((r, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={r.file}
          src={`/l/gradients/${r.file}.svg`}
          alt=""
          draggable={false}
          className="absolute block max-w-none select-none"
          style={{
            left: rem(r.left),
            top: rem(r.top),
            width: rem(r.w),
            height: rem(r.h),
            animation: animate ? `ring-ripple 6.5s ease-in-out ${settle ? settle / 1000 + i * 0.9 : -i * 0.9}s infinite` : undefined,
          }}
        />
      ))}
    </div>
  );
}
