import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import {
  SiSpotify,
  SiApplepodcasts,
  SiYoutube,
  SiAmazonmusic,
  SiInstagram,
  SiTiktok,
  SiLinkedin,
} from "react-icons/si";
import { fadeUp, viewportOnce } from "./motion";

const PLATFORMS = [
  { Icon: SiSpotify, label: "Spotify" },
  { Icon: SiApplepodcasts, label: "Apple Podcasts" },
  { Icon: SiYoutube, label: "YouTube" },
  { Icon: SiAmazonmusic, label: "Amazon Music" },
  { Icon: SiInstagram, label: "Instagram" },
  { Icon: SiTiktok, label: "TikTok" },
  { Icon: SiLinkedin, label: "LinkedIn" },
  { Icon: Mail, label: "Email" },
];

/**
 * Deliberately quiet — this is the section that demotes hosting/distribution
 * to "one connected surface" rather than the headline feature. A slow,
 * pausable drift rather than a static row so it reads as "always connected"
 * without asking for attention.
 */
export function PlatformsStrip() {
  return (
    <section className="overflow-hidden border-y border-white/5 py-10">
      <div className="container mx-auto px-6">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70"
        >
          Connects to everywhere your business already runs
        </motion.p>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="animate-marquee flex w-max items-center gap-14">
          {[...PLATFORMS, ...PLATFORMS].map(({ Icon, label }, i) => (
            <div
              key={`${label}-${i}`}
              className="flex items-center gap-2 whitespace-nowrap text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
