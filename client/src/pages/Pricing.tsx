import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

const betaIncludes = [
  "Podcast hosting with Apple & Spotify-ready RSS",
  "Episode uploads served from a global CDN",
  "AI transcription & show notes",
  "Voice identity certification on Polygon",
  "Impersonation monitoring",
  "Social hub & multi-platform posting",
  "Creator profile & link page",
  "Listener AI briefings",
  "Email tools for your audience",
];

const plannedTiers = [
  {
    name: "Starter",
    audience: "For new shows",
    highlights: ["Hosting & RSS for one show", "Core AI tools", "Creator profile"],
  },
  {
    name: "Creator",
    audience: "For growing podcasts",
    highlights: ["Everything in Starter", "Full AI production toolkit", "Voice identity protection", "Clips & social hub"],
  },
  {
    name: "Studio",
    audience: "For networks & pros",
    highlights: ["Everything in Creator", "Multiple shows & team seats", "Brand marketplace access", "Priority support"],
  },
];

export default function Pricing() {
  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-20 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/15 blur-[140px]" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6"
          >
            Free while we're in <span className="text-gradient-primary">beta</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Every feature, no credit card, while we build Podlogix alongside our first
            creators. Beta users will get preferred pricing when paid plans arrive.
          </motion.p>
        </div>
      </section>

      {/* BETA CARD */}
      <section className="pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/[0.08] to-white/[0.02] p-10 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-display font-bold">Public Beta</h2>
                    <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                  </div>
                  <p className="text-muted-foreground">Full platform access for early creators</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-display font-bold">$0</p>
                  <p className="text-sm text-muted-foreground">during beta</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-10">
                {betaIncludes.map((t) => (
                  <span key={t} className="inline-flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{t}</span>
                  </span>
                ))}
              </div>

              <Button size="lg" className="w-full sm:w-auto rounded-full px-10 shadow-lg shadow-primary/25" asChild data-testid="button-pricing-cta">
                <Link href="/login">
                  Join the beta free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PLANNED TIERS */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> After beta
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Where pricing is headed
            </h2>
            <p className="text-lg text-muted-foreground">
              Final pricing isn't set — that's part of what the beta is for. Here's the
              shape of what we're planning, so there are no surprises.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plannedTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-8"
              >
                <h3 className="text-xl font-display font-bold mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.audience}</p>
                <ul className="space-y-3">
                  {tier.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.p {...fadeUp} className="text-center text-sm text-muted-foreground mt-10">
            Beta creators lock in preferred rates before any of this goes live.
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
