import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { MerchantDayStory } from "@/components/landing/MerchantDayStory";
import { RecordConnectionVisual } from "@/components/landing/RecordConnectionVisual";
import { ExceptionResolutionStory } from "@/components/landing/ExceptionResolutionStory";
import { MerchantToSHBHandoff } from "@/components/landing/MerchantToSHBHandoff";
import { OperationsPortfolioPreview } from "@/components/landing/OperationsPortfolioPreview";
import { AuditTimelinePreview } from "@/components/landing/AuditTimelinePreview";
import { PlatformShowcaseTabs } from "@/components/landing/PlatformShowcaseTabs";
import { FinalDemoStoryCTA } from "@/components/landing/FinalDemoStoryCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <MerchantDayStory />
        <RecordConnectionVisual />
        <ExceptionResolutionStory />
        <MerchantToSHBHandoff />
        <OperationsPortfolioPreview />
        <AuditTimelinePreview />
        <PlatformShowcaseTabs />
        <FinalDemoStoryCTA />
      </main>
      <LandingFooter />
    </>
  );
}
