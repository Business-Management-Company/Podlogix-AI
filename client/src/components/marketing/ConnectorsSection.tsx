import { motion } from "framer-motion";
import { Mic2, Mail, CheckCircle, Clock, Radio, Video } from "lucide-react";
import {
  SiSpotify,
  SiApplepodcasts,
  SiYoutube,
  SiAmazonmusic,
  SiInstagram,
  SiTiktok,
  SiLinkedin,
  SiMailchimp,
  SiSubstack,
  SiPatreon,
  SiX,
  SiZoom,
} from "react-icons/si";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, viewportOnce } from "./motion";

// ── Connector data ────────────────────────────────────────────────────────────

const HOSTING = [
  { Icon: Mic2, name: "Buzzsprout", category: "Podcast Hosting", status: "available" as const },
  { Icon: Mic2, name: "Libsyn",     category: "Podcast Hosting", status: "coming_soon" as const },
  { Icon: Mic2, name: "Podbean",    category: "Podcast Hosting", status: "coming_soon" as const },
  { Icon: Mic2, name: "Captivate",  category: "Podcast Hosting", status: "coming_soon" as const },
];

const RECORDING = [
  { Icon: Video,      name: "Riverside.fm", category: "Recording",  status: "coming_soon" as const },
  { Icon: Radio,      name: "Restream",     category: "Streaming",  status: "coming_soon" as const },
  { Icon: SiZoom,     name: "Zoom",         category: "Meetings",   status: "coming_soon" as const },
];

const DISTRIBUTION = [
  { Icon: SiSpotify,       name: "Spotify",         category: "Distribution", status: "available" as const },
  { Icon: SiApplepodcasts, name: "Apple Podcasts",   category: "Distribution", status: "available" as const },
  { Icon: SiYoutube,       name: "YouTube",          category: "Distribution", status: "available" as const },
  { Icon: SiAmazonmusic,   name: "Amazon Music",     category: "Distribution", status: "available" as const },
];

const SOCIAL = [
  { Icon: SiInstagram, name: "Instagram",  category: "Social", status: "available" as const },
  { Icon: SiTiktok,    name: "TikTok",     category: "Social", status: "available" as const },
  { Icon: SiLinkedin,  name: "LinkedIn",   category: "Social", status: "available" as const },
  { Icon: SiX,         name: "X (Twitter)", category: "Social", status: "available" as const },
];

const COMING_SOON = [
  { Icon: Mail,         name: "Email / Newsletter", category: "CRM" },
  { Icon: SiMailchimp,  name: "Mailchimp",          category: "Email" },
  { Icon: SiSubstack,   name: "Substack",           category: "Newsletter" },
  { Icon: SiPatreon,    name: "Patreon",            category: "Monetization" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "available" | "coming_soon" }) {
  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle className="h-2.5 w-2.5" />
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60">
      <Clock className="h-2.5 w-2.5" />
      Coming soon
    </span>
  );
}

function ConnectorCard({
  Icon,
  name,
  category,
  status,
  delay = 0,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  name: string;
  category: string;
  status: "available" | "coming_soon";
  delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ delay }}
      className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
          <Icon className="h-4 w-4 text-foreground/70 transition-colors group-hover:text-foreground" />
        </div>
        <StatusBadge status={status} />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-foreground">{name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{category}</p>
      </div>
    </motion.div>
  );
}

function ComingSoonCard({
  Icon,
  name,
  category,
  delay = 0,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  name: string;
  category: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ delay }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5 opacity-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground/60">{name}</p>
        <p className="text-[10px] text-muted-foreground/40">{category}</p>
      </div>
    </motion.div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function ConnectorsSection() {
  return (
    <section id="integrations" className="py-28 lg:py-36">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-16 max-w-xl text-center"
        >
          <SectionKicker className="text-center">Integrations</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Works with the tools you already use.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Connect once. Everything stays in sync — your hosting, your audiences,
            your platforms.
          </p>
        </motion.div>

        {/* ── Podcast hosting ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-3"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
            Podcast Hosting
          </p>
        </motion.div>
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HOSTING.map((c, i) => (
            <ConnectorCard key={c.name} {...c} delay={i * 0.06} />
          ))}
        </div>

        {/* ── Recording & streaming ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-3"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
            Recording &amp; Streaming
          </p>
        </motion.div>
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RECORDING.map((c, i) => (
            <ConnectorCard key={c.name} {...c} delay={i * 0.06} />
          ))}
        </div>

        {/* ── Distribution connectors ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-3"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
            Distribution
          </p>
        </motion.div>
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DISTRIBUTION.map((c, i) => (
            <ConnectorCard key={c.name} {...c} delay={i * 0.06} />
          ))}
        </div>

        {/* ── Social connectors ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-3"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
            Social & Audience
          </p>
        </motion.div>
        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SOCIAL.map((c, i) => (
            <ConnectorCard key={c.name} {...c} delay={i * 0.06} />
          ))}
        </div>

        {/* ── Coming soon ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-3"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
            Coming soon
          </p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COMING_SOON.map((c, i) => (
            <ComingSoonCard key={c.name} {...c} delay={i * 0.06} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10 text-center text-xs text-muted-foreground/40"
        >
          More integrations on the roadmap — request one via the in-app feedback panel.
        </motion.p>
      </div>
    </section>
  );
}
