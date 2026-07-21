import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Rss,
  Mic,
  ShieldCheck,
  Sparkles,
  Scissors,
  Radio,
  Headphones,
  Briefcase,
  UploadCloud,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/15 blur-[140px]" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Now in public beta — free while we build together
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.05]"
            >
              Your podcast. Your platform.
              <br />
              <span className="text-gradient-primary">Your voice, protected.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
            >
              Podlogix hosts your show, publishes your RSS feed everywhere, and puts an
              AI toolkit behind every episode — with blockchain-backed voice identity
              protection no other platform offers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300"
                asChild
                data-testid="button-hero-start"
              >
                <Link href="/login">
                  Start your podcast free <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 transition-all duration-300"
                asChild
                data-testid="button-hero-features"
              >
                <Link href="/features">See everything inside</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
            >
              {["Unlimited hosting during beta", "Apple & Spotify-ready RSS", "No credit card required"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">The platform</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Everything a podcast needs, in one place
            </h2>
            <p className="text-lg text-muted-foreground">
              Stop stitching together five subscriptions. Podlogix covers the entire
              life of an episode — from upload to everywhere your audience listens.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Rss,
                title: "Hosting & RSS",
                body: "Upload your audio and we host it, generate an Apple-spec RSS feed, and serve it fast from a global CDN. Your feed URL works with every directory.",
              },
              {
                icon: Globe,
                title: "Distribution",
                body: "One feed, everywhere: Spotify, Apple Podcasts, and every app that speaks RSS. Manage submissions and track where your show is live.",
              },
              {
                icon: ShieldCheck,
                title: "Voice Identity Protection",
                body: "Certify your voice on the blockchain and monitor social platforms for AI impersonations. Your voice is your brand — we help you defend it.",
              },
              {
                icon: Sparkles,
                title: "AI Production Toolkit",
                body: "Transcription, show notes, and episode summaries generated in minutes, so you spend your time on the conversation — not the paperwork.",
              },
              {
                icon: Scissors,
                title: "Clips & Repurposing",
                body: "Turn long episodes into share-ready moments and push them to Instagram, TikTok, YouTube, Facebook, and LinkedIn from one hub.",
              },
              {
                icon: Briefcase,
                title: "Brand Connections",
                body: "A built-in marketplace layer where brands discover creators, view media kits, and start sponsorship conversations.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:border-primary/30 hover:bg-white/[0.04] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VOICE PROTECTION SPOTLIGHT */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-[-10%] w-[500px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp}>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">The differentiator</p>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 leading-tight">
                In the age of AI, your voice needs a certificate of authenticity
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Voice cloning is getting good — scary good. Podlogix lets you certify
                your voice identity on the Polygon blockchain, creating tamper-proof
                proof that you are you. Then our monitoring watches social platforms
                for impersonations, so you hear about fakes before your audience does.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Blockchain certificate tied to your voice fingerprint",
                  "Likeness certification for your face and image",
                  "Impersonation monitoring across social platforms",
                  "A public certificate page you can show sponsors and press",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="rounded-full px-8" asChild data-testid="button-voice-protection">
                <Link href="/login">
                  Certify your voice <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-10 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">Voice Certificate</p>
                    <p className="text-sm text-muted-foreground">Secured on Polygon</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    ["Identity", "Verified creator"],
                    ["Voiceprint", "Registered & hashed"],
                    ["Monitoring", "Active across platforms"],
                    ["Status", "Protected"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-5 py-4">
                      <span className="text-sm text-muted-foreground">{k}</span>
                      <span className="text-sm font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              From audio file to every podcast app
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: UploadCloud,
                title: "Upload your episode",
                body: "Drop in your audio, add a title and show notes. We store it safely and serve it from a global CDN.",
              },
              {
                step: "02",
                icon: Rss,
                title: "Publish to your feed",
                body: "One click generates and updates your Apple-spec RSS feed — the single source of truth for your show.",
              },
              {
                step: "03",
                icon: Radio,
                title: "Reach every listener",
                body: "Submit your feed to Spotify, Apple, and beyond. New episodes appear everywhere, automatically.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8"
              >
                <span className="absolute top-6 right-8 text-5xl font-display font-bold text-white/5">{s.step}</span>
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Who it's for</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Three sides. One ecosystem.
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                label: "Podcasters",
                title: "Create, publish, and own your audience",
                body: "Hosting, feeds, AI production, clips, a link-in-bio page, and email tools — the full creator stack.",
              },
              {
                icon: Headphones,
                label: "Listeners",
                title: "AI briefings from the shows you follow",
                body: "Follow podcasts by RSS or Spotify and get smart, personalized episode briefings with key quotes and insights.",
              },
              {
                icon: Briefcase,
                label: "Brands",
                title: "Find creators worth sponsoring",
                body: "Search a massive creator database, view media kits and rate estimates, and manage sponsorships end to end.",
              },
            ].map((a, i) => (
              <motion.div
                key={a.label}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <a.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary uppercase tracking-widest">{a.label}</span>
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 border-t border-white/5 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-[-40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/15 blur-[140px]" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
              Press record.
              <br />
              <span className="text-gradient-primary">We'll handle the rest.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join the beta free, publish your first episode tonight, and lock down
              your voice identity while you're at it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300"
                asChild
                data-testid="button-cta-start"
              >
                <Link href="/login">
                  Get started free <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 transition-all duration-300"
                asChild
                data-testid="button-cta-pricing"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
