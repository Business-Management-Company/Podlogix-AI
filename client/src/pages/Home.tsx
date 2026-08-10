import { useEffect } from "react";
import { useLocation } from "wouter";
import { MotionConfig } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import {
  Hero,
  PlatformsStrip,
  WorkspacePillars,
  EditorialStatement,
  WorkspaceShowcase,
  ConnectorsSection,
  SocialProof,
  PricingPreview,
  FinalCTA,
  Grain,
} from "@/components/marketing";

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
      {/* Disables transform/filter-based motion for prefers-reduced-motion
          users across every section in one place; the few imperative
          cursor-driven effects (Magnetic, tilt, glow parallax) additionally
          check useReducedMotion() themselves since they bypass variants. */}
      <MotionConfig reducedMotion="user">
        <Grain />
        <Navbar />
        <Hero />
        {/* "See the workspace" reveal — dashboard mockup in a browser frame */}
        <WorkspaceShowcase />
        {/* Problem / chaos */}
        <EditorialStatement />
        {/* Cost — everywhere the business already has to run */}
        <PlatformsStrip />
        {/* Solution */}
        <WorkspacePillars />
        {/* Integrations / Connected apps */}
        <ConnectorsSection />
        {/* Social proof */}
        <SocialProof />
        {/* Pricing */}
        <PricingPreview />
        {/* CTA */}
        <FinalCTA />
        <Footer />
      </MotionConfig>
    </div>
  );
}
