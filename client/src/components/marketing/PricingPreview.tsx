import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "./SectionKicker";
import { fadeUp, stagger, staggerItem, viewportOnce } from "./motion";

interface Tier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

// TODO: sync with the /pricing page — that page currently shows the product
// as free during beta with unpriced "planned tiers" (Starter/Creator/Studio).
// These are placeholder numbers for the homepage preview only.
const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "Free",
    description: "For new shows getting off the ground.",
    features: ["Hosting & RSS for one show", "Core AI tools", "Creator profile"],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For growing podcasts with an audience to manage.",
    features: [
      "Everything in Starter",
      "Full AI production toolkit",
      "Voice identity protection",
      "Clips & social hub",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "/mo",
    description: "For networks and teams running multiple shows.",
    features: [
      "Everything in Pro",
      "Multiple shows & team seats",
      "Brand marketplace access",
      "Priority support",
    ],
  },
];

export function PricingPreview() {
  return (
    <section className="relative overflow-hidden py-28 lg:py-36">
      <div className="container relative mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <SectionKicker className="text-center">Pricing</SectionKicker>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Simple pricing, real workspace.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3"
        >
          {TIERS.map((tier) => (
            <motion.div key={tier.name} variants={staggerItem}>
              <Link href="/pricing">
                <div
                  className={`flex h-full cursor-pointer flex-col rounded-2xl border p-8 transition-colors duration-300 ${
                    tier.highlighted
                      ? "border-primary/40 bg-primary/[0.06] hover:border-primary/60"
                      : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.035]"
                  }`}
                >
                  {tier.highlighted && (
                    <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold tracking-tight">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-muted-foreground">{tier.period}</span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <span
                    className={`mt-8 inline-flex items-center gap-1.5 text-sm font-medium ${
                      tier.highlighted ? "text-primary" : "text-foreground"
                    }`}
                  >
                    See full details <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-8 text-center"
        >
          <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5" asChild>
            <Link href="/pricing">View full pricing</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
