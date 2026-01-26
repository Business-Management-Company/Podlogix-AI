import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const scrollToFooter = () => {
    document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white">
      <Navbar />
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary-foreground mb-8 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now in public beta v2.0
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-tight"
            >
              Supercharge your podcast with <span className="text-gradient-primary">AI intelligence</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
            >
              Automated transcription, show notes, and viral clips in minutes. 
              Focus on creating conversation, let our AI handle the rest.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Button 
                size="lg" 
                onClick={scrollToFooter}
                className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300"
              >
                Start Creating Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 hover:text-white transition-all duration-300"
              >
                <Play className="mr-2 w-5 h-5 fill-current" /> Watch Demo
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen" />
        </div>
      </section>

      <Features />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-black/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">From raw audio to viral content</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to automate your workflow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block" />
            
            {[
              { step: "01", title: "Upload Episode", desc: "Drag and drop your audio file. We support MP3, WAV, and M4A up to 2 hours." },
              { step: "02", title: "AI Processing", desc: "Our engine transcribes, summarizes, and identifies key moments in under 3 minutes." },
              { step: "03", title: "Publish & Share", desc: "Export show notes, download viral clips, and schedule social posts instantly." }
            ].map((item, i) => (
              <div key={i} className="relative z-10 bg-card border border-white/5 p-8 rounded-2xl text-center hover:-translate-y-2 transition-transform duration-300 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">Trusted by next-gen creators</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Text placeholders for logos as requested */}
             <span className="text-xl font-bold font-display">AudioPhile</span>
             <span className="text-xl font-bold font-display">CastMaster</span>
             <span className="text-xl font-bold font-display">WaveForm</span>
             <span className="text-xl font-bold font-display">StudioOne</span>
             <span className="text-xl font-bold font-display">Streamline</span>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start for free, scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { name: "Starter", price: "$0", desc: "Perfect for hobbyists", features: ["2 hours/month transcription", "Basic show notes", "720p clip exports", "Email support"] },
              { name: "Pro", price: "$29", desc: "For serious creators", features: ["10 hours/month transcription", "Advanced SEO summaries", "1080p viral clips", "Social media scheduler", "Priority support"], popular: true },
              { name: "Agency", price: "$99", desc: "For networks & studios", features: ["Unlimited transcription", "White-label reports", "4K clip exports", "API access", "Dedicated account manager"] }
            ].map((plan, i) => (
              <div key={i} className={cn(
                "p-8 rounded-3xl border flex flex-col relative", 
                plan.popular 
                  ? "bg-primary/5 border-primary/50 shadow-2xl shadow-primary/10 scale-105 z-10" 
                  : "bg-card border-white/10 hover:border-white/20"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className={cn(
                  "w-full h-12 rounded-xl font-semibold",
                  plan.popular ? "bg-primary hover:bg-primary/90" : "bg-white/10 hover:bg-white/20 text-white"
                )}>
                  Choose {plan.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Utility for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
