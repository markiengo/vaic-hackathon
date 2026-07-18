import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { StatStrip } from "@/components/landing/StatStrip";
import { Pillars } from "@/components/landing/Pillars";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SHBValue } from "@/components/landing/SHBValue";
import { CapabilitySplit } from "@/components/landing/CapabilitySplit";
import { SafetyGovernance } from "@/components/landing/SafetyGovernance";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <StatStrip />
        <Pillars />
        <HowItWorks />
        <SHBValue />
        <CapabilitySplit />
        <SafetyGovernance />
        <FinalCTA />
      </main>
      <LandingFooter />
    </>
  );
}
