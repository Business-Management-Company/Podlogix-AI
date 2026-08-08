import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { Mic, CheckCircle2, Mail } from "lucide-react";
import {
  SiSpotify,
  SiApplepodcasts,
  SiYoutube,
  SiAmazonmusic,
  SiInstagram,
  SiTiktok,
  SiLinkedin,
} from "react-icons/si";
import { easing } from "@/lib/design-tokens";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, viewportOnce, cursorSpring } from "./motion";

// The same eight platforms PlatformsStrip lists — deliberately reused so
// this section reads as "the very things mentioned above, now converging"
// rather than introducing a second, unrelated set of icons.
const NODES = [
  { Icon: SiSpotify, x: 0.06, y: 0.15 },
  { Icon: SiApplepodcasts, x: 0.04, y: 0.52 },
  { Icon: SiYoutube, x: 0.16, y: 0.85 },
  { Icon: SiAmazonmusic, x: 0.32, y: 0.08 },
  { Icon: SiInstagram, x: 0.36, y: 0.6 },
  { Icon: SiTiktok, x: 0.2, y: 0.35 },
  { Icon: SiLinkedin, x: 0.1, y: 0.94 },
  { Icon: Mail, x: 0.4, y: 0.88 },
];

const HUB = { x: 0.88, y: 0.5 };

// Short forms of the six WorkspacePillars titles — this panel is depicting
// the same workspace, not inventing new language for it.
const OUTCOMES = ["Episodes", "Audience", "Sponsors", "Distribution"];

/**
 * The page's "everything converges" moment: the platforms from PlatformsStrip
 * scatter, draw lines into a single Podlogix hub, and a compact "one view"
 * panel builds itself — original visual storytelling in place of a generic
 * dashboard screenshot. Tilts gently toward the cursor; no-ops under
 * prefers-reduced-motion.
 */
export function WorkspaceShowcase() {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, cursorSpring);
  const rotateY = useSpring(rotateYRaw, cursorSpring);

  const lineDuration = reduceMotion ? 0 : 0.6;
  const lineStagger = reduceMotion ? 0 : 0.07;
  const hubDelay = reduceMotion ? 0 : NODES.length * lineStagger + 0.2;
  const panelDelay = hubDelay + (reduceMotion ? 0 : 0.4);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateYRaw.set(px * 6);
    rotateXRaw.set(py * -6);
  }

  function handleMouseLeave() {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  }

  return (
    <section id="workspace-showcase" className="py-28 lg:py-36">
      <div className="container mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-14 max-w-xl text-center"
        >
          <SectionKicker className="text-center">One workspace</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Not five tabs. One place.
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          style={{ perspective: 1200 }}
          className="mx-auto max-w-3xl"
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/40"
          >
            {/* Header — a label, not a fake browser chrome */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">Your workspace</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>

            <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-stretch">
              {/* Convergence diagram */}
              <div className="relative min-h-[240px] flex-1 sm:min-h-[280px]">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Eight connected platforms converging into a single Podlogix workspace"
                >
                  <defs>
                    <linearGradient id="convergence-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                  {NODES.map((n, i) => (
                    <motion.line
                      key={i}
                      x1={n.x * 100}
                      y1={n.y * 100}
                      x2={HUB.x * 100}
                      y2={HUB.y * 100}
                      stroke="url(#convergence-line)"
                      strokeWidth={0.4}
                      vectorEffect="non-scaling-stroke"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.5 }}
                      viewport={viewportOnce}
                      transition={{ duration: lineDuration, delay: i * lineStagger, ease: easing.spring }}
                    />
                  ))}
                </svg>

                {NODES.map((n, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.3, delay: i * lineStagger, ease: easing.spring }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground"
                    >
                      <n.Icon className="h-3.5 w-3.5" />
                    </motion.div>
                  </div>
                ))}

                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${HUB.x * 100}%`, top: `${HUB.y * 100}%` }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.5, delay: hubDelay, ease: easing.spring }}
                    className="relative flex h-11 w-11 items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full blur-lg"
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
                        opacity: 0.4,
                      }}
                    />
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)" }}
                    >
                      <Mic className="h-4 w-4 text-white" />
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* One view panel */}
              <motion.div
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.4, delay: panelDelay, ease: easing.spring }}
                className="flex-none rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:w-[190px]"
              >
                <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  One view
                </p>
                <ul className="space-y-2.5">
                  {OUTCOMES.map((label, i) => (
                    <motion.li
                      key={label}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={viewportOnce}
                      transition={{
                        duration: 0.3,
                        delay: panelDelay + i * (reduceMotion ? 0 : 0.09),
                        ease: easing.spring,
                      }}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {label}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
