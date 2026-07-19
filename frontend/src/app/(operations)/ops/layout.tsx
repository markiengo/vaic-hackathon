import { AppShell } from "@/components/layout/AppShell";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell workspace="operations">
      {children}
      <OnboardingTour role="ops" />
    </AppShell>
  );
}
