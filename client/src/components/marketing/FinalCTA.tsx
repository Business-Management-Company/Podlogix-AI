import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./Magnetic";
import { fadeUp, viewportOnce } from "./motion";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-[-30%] left-1/2 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.12] blur-[150px]" />
      </div>
      <div className="container relative z-10 mx-auto px-6 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto max-w-2xl"
        >
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Your show is a business.
            <br />
            Run it like one.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground">
            Start free, connect your show, and bring the rest of the business into
            one workspace.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Magnetic className="inline-block">
              <Button
                size="lg"
                className="h-14 rounded-full px-8 text-base shadow-xl shadow-primary/20 transition-shadow duration-300 hover:shadow-primary/35"
                asChild
                data-testid="button-cta-start"
              >
                <Link href="/login">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic className="inline-block">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-white/10 px-8 text-base hover:bg-white/5"
                asChild
                data-testid="button-cta-pricing"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </Magnetic>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
