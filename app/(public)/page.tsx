import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { AIDemoSection } from "@/components/landing/ai-demo-section";
import { TrustSection } from "@/components/landing/trust-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { FinalCTASection } from "@/components/landing/final-cta-section";
// import { SocialProofSection } from "@/components/landing/social-proof-section";

export const metadata: Metadata = {
  title: "Confairo — Academic Conference Management Platform",
  description:
    "Manage paper submissions, peer reviews, registration, payments, scheduling, and certificates for academic conferences — all in one platform. Free to start.",
  keywords: [
    "academic conference management",
    "paper submission portal",
    "peer review system",
    "conference management software",
    "certificate generation",
    "research conference platform",
    "Confairo",
  ],
  openGraph: {
    title: "Confairo — Academic Conference Management Platform",
    description:
      "Manage paper submissions, peer reviews, payments, and certificates for academic conferences. One platform, free to start.",
    type: "website",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* 1. Hero — Headline + CTA + Trust */}
      <HeroSection />

      {/* 2. Core Capabilities — Six modules */}
      <FeaturesSection />

      {/* 3. Who It's For — Organizers, institutions, communities */}
      <AudienceSection />

      {/* 4. AI Assistance — Reviewer, analysis, similarity */}
      <AIDemoSection />

      {/* 5. Trust — Product-based credibility signals */}
      <TrustSection />

      {/* 6. Pricing — Free-first positioning */}
      <PricingSection />

      {/* 7. Comparison — Confairo vs traditional */}
      <ComparisonSection />

      {/* 8. Social Proof — Testimonials + Use Cases */}
      {/* <SocialProofSection /> */}

      {/* 8. Final CTA — Before footer */}
      <FinalCTASection />

    </main>
  );
}
