import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mic,
  Headphones,
  Briefcase,
  Rss,
  Globe,
  ShieldCheck,
  Sparkles,
  Scissors,
  Share2,
  Link2,
  Mail,
  BarChart3,
  BookOpen,
  Search,
  Calculator,
  Users,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

const sections = [
  {
    id: "podcasters",
    icon: Mic,
    label: "For Podcasters",
    title: "The full creator stack, minus the duct tape",
    intro:
      "Everything between 'I recorded something' and 'my audience heard it' — handled in one place.",
    features: [
      {
        icon: Rss,
        title: "Podcast hosting & RSS",
        body: "Upload episodes, and Podlogix stores your audio, serves it from a global CDN, and maintains a valid Apple-spec RSS feed for your show.",
      },
      {
        icon: Globe,
        title: "Distribution management",
        body: "Take your feed to Spotify, Apple Podcasts, and every RSS-powered app. Track submission status per directory from one dashboard.",
      },
      {
        icon: Sparkles,
        title: "AI transcription & show notes",
        body: "Every episode can be transcribed and summarized automatically — show notes, key takeaways, and episode descriptions in minutes.",
      },
      {
        icon: Scissors,
        title: "Clips & repurposing",
        body: "Turn full episodes into short, share-ready clips for social — one recording becomes a week of content.",
      },
      {
        icon: Share2,
        title: "Social hub",
        body: "Connect Instagram, TikTok, YouTube, Facebook, and LinkedIn, then post and schedule from a single hub.",
      },
      {
        icon: Link2,
        title: "Creator profile & link page",
        body: "A public profile with your podcast, social links, and stats — a link-in-bio that's actually part of your platform.",
      },
      {
        icon: Mail,
        title: "Email tools",
        body: "Contacts, templates, and campaigns for building a direct relationship with your audience — the channel no algorithm owns.",
      },
      {
        icon: BarChart3,
        title: "Social analytics",
        body: "Auto-fetched follower and view stats across your connected platforms, in one view.",
      },
    ],
  },
  {
    id: "voice",
    icon: ShieldCheck,
    label: "Voice Identity Protection",
    title: "Your voice is your brand. Certify it.",
    intro:
      "The feature no other podcast platform has: blockchain-backed proof of your voice identity, plus active impersonation monitoring.",
    features: [
      {
        icon: ShieldCheck,
        title: "Voice certification",
        body: "Register your voiceprint and mint a tamper-proof certificate on the Polygon blockchain — verifiable proof that your voice is yours.",
      },
      {
        icon: Users,
        title: "Likeness certification",
        body: "Extend protection to your face and image, so your visual identity is certified alongside your voice.",
      },
      {
        icon: Search,
        title: "Impersonation monitoring",
        body: "Continuous scanning across social platforms for accounts and content impersonating you — with alerts when something looks wrong.",
      },
      {
        icon: BookOpen,
        title: "Public certificate page",
        body: "A shareable page proving your certification — show it to sponsors, platforms, and press.",
      },
    ],
  },
  {
    id: "listeners",
    icon: Headphones,
    label: "For Listeners",
    title: "Follow more shows. Miss less.",
    intro:
      "Podlogix isn't only for creators — listeners get an AI layer over every show they follow.",
    features: [
      {
        icon: Rss,
        title: "Follow via RSS or Spotify",
        body: "Subscribe to any podcast by feed URL, or import the shows you already follow on Spotify in one click.",
      },
      {
        icon: Sparkles,
        title: "AI episode briefings",
        body: "Personalized summaries with key quotes and insights, tuned to the topics you care about — know what's worth your full listen.",
      },
      {
        icon: BarChart3,
        title: "Listening analytics",
        body: "See your listening patterns and interests evolve over time.",
      },
    ],
  },
  {
    id: "brands",
    icon: Briefcase,
    label: "For Brands & Agencies",
    title: "Sponsorships without the spreadsheet chaos",
    intro:
      "A client portal for finding creators, judging fit, and managing the pipeline from first contact to partnership.",
    features: [
      {
        icon: Search,
        title: "Creator discovery",
        body: "Search a database of hundreds of millions of creators and podcasters with natural-language filters — niche, audience size, engagement, location.",
      },
      {
        icon: BookOpen,
        title: "Media kits",
        body: "Creator profiles with stats, audience data, and estimated rates — the context you need before reaching out.",
      },
      {
        icon: Calculator,
        title: "Rate calculator",
        body: "Industry-standard sponsorship rate estimates from followers, engagement, and average views.",
      },
      {
        icon: Users,
        title: "Pipeline management",
        body: "Track creators from saved to contacted to partnered, with notes, tags, and lists your whole team can use.",
      },
    ],
  },
];

export default function Features() {
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
            Everything inside <span className="text-gradient-primary">Podlogix</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            One platform for creating, publishing, protecting, and growing a podcast —
            with dedicated tools for listeners and brands too.
          </motion.p>
        </div>
      </section>

      {/* SECTION NAV */}
      <div className="container mx-auto px-4 md:px-6 mb-8">
        <div className="flex flex-wrap justify-center gap-3">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <s.icon className="h-4 w-4 text-primary" />
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* SECTIONS */}
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="py-20 border-t border-white/5 scroll-mt-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div {...fadeUp} className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                <section.icon className="h-4 w-4" />
                {section.label}
              </p>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{section.title}</h2>
              <p className="text-lg text-muted-foreground">{section.intro}</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {section.features.map((f, i) => (
                <motion.div
                  key={f.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-primary/30 hover:bg-white/[0.04] transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 border-t border-white/5 text-center">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              See it with your own show
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              The beta is free — upload an episode and have a live, submittable RSS feed tonight.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25" asChild data-testid="button-features-cta">
                <Link href="/login">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
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
