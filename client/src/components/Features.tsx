import { Mic2, FileText, Scissors, RefreshCw, Wand2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const features = [
  {
    icon: Mic2,
    title: "Smart Transcription",
    description: "Industry-leading 99% accuracy with automatic speaker detection and multi-language support."
  },
  {
    icon: FileText,
    title: "Auto-Show Notes",
    description: "Generate SEO-optimized summaries, key takeaways, and timestamped chapters instantly."
  },
  {
    icon: Scissors,
    title: "Viral Clips",
    description: "AI identifies the most engaging moments and automatically crops them for TikTok and Reels."
  },
  {
    icon: RefreshCw,
    title: "Content Repurposing",
    description: "Turn a single episode into a month's worth of blog posts, newsletters, and tweets."
  },
  {
    icon: Wand2,
    title: "Audio Enhancement",
    description: "Remove background noise and level voices professionally with a single click."
  },
  {
    icon: Shield,
    title: "Voice Identity Protection",
    description: "Certify your voice on the Polygon blockchain. Protect against AI impersonation and deepfakes.",
    link: "/identity",
    highlight: true
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 translate-x-1/3" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Everything you need to <span className="text-gradient-primary">scale your show</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Stop spending hours on post-production. Let our AI handle the boring stuff so you can focus on creating great content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const CardContent = (
              <>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${feature.highlight ? 'bg-gradient-to-br from-primary to-purple-500 text-white' : 'bg-primary/10 text-primary'}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 font-display">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                {feature.highlight && (
                  <span className="inline-flex items-center mt-3 text-sm font-medium text-primary">
                    Learn more &rarr;
                  </span>
                )}
              </>
            );
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`glass-card p-6 rounded-2xl transition-all duration-300 group ${feature.highlight ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' : 'hover:border-primary/50'}`}
              >
                {feature.link ? (
                  <Link href={feature.link} className="block">
                    {CardContent}
                  </Link>
                ) : (
                  CardContent
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
