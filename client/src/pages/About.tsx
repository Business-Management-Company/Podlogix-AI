import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, ShieldCheck, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

export default function About() {
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
            Podcasting deserves a <span className="text-gradient-primary">home team</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Podlogix exists so independent creators can own their platform, their
            audience, and — in the age of AI — their own voice.
          </motion.p>
        </div>
      </section>

      {/* STORY */}
      <section className="py-16 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Podcasting grew up scattered. Your audio lives with one company, your
              feed with another, your clips in a third tool, your audience on
              platforms you don't control, and your sponsorships in a spreadsheet.
              Every episode means logging into five things that don't talk to each other.
            </p>
            <p>
              We're building Podlogix as the alternative: one platform that hosts your
              show, publishes your feed to every directory, produces your show notes
              and clips with AI, and connects you with the brands and listeners who
              make podcasting sustainable.
            </p>
            <p>
              And because we're building in the AI era, we take one problem more
              seriously than anyone else in this space: <span className="text-foreground font-medium">voice theft</span>.
              The same technology that transcribes your show can clone your voice.
              That's why voice identity protection isn't an add-on at Podlogix — it's
              a founding principle, with certification on the blockchain and active
              impersonation monitoring built into the platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-display font-bold text-center mb-14">
            What we believe
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Mic,
                title: "Creators own their work",
                body: "Your feed, your audience, your content. Podlogix is infrastructure for your show — not a walled garden that keeps it.",
              },
              {
                icon: ShieldCheck,
                title: "Identity is sacred",
                body: "Your voice and likeness belong to you. Protecting them from AI misuse is a platform responsibility, not a premium upsell.",
              },
              {
                icon: Sparkles,
                title: "AI should serve the craft",
                body: "AI is for the busywork — transcripts, notes, clips — so creators can spend their energy on the conversation itself.",
              },
              {
                icon: Users,
                title: "The ecosystem wins together",
                body: "Podcasters, listeners, and brands each get real tools here, because a healthy show needs all three.",
              },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-7"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5 text-center">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Build it with us
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We're in public beta, shaping the platform with our first creators.
              Your feedback becomes next week's features.
            </p>
            <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25" asChild data-testid="button-about-cta">
              <Link href="/login">
                Join the beta <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
