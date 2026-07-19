import { AppShell } from "@/components/layout/AppShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell workspace="operations">
      {children}
      <OnboardingFlow role="ops" />
    </AppShell>
  );
}
