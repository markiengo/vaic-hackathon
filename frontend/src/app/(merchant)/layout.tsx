import { AppShell } from "@/components/layout/AppShell";
import { MerchantRealtimeProvider } from "@/components/realtime/MerchantRealtimeProvider";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { ToastProvider } from "@/components/ui";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <MerchantRealtimeProvider>
        <AppShell>
          {children}
          <OnboardingFlow role="merchant" />
        </AppShell>
      </MerchantRealtimeProvider>
    </ToastProvider>
  );
}
