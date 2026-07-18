import { AppShell } from "@/components/layout/AppShell";
import { MerchantRealtimeProvider } from "@/components/realtime/MerchantRealtimeProvider";
import { ToastProvider } from "@/components/ui";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <MerchantRealtimeProvider>
        <AppShell>{children}</AppShell>
      </MerchantRealtimeProvider>
    </ToastProvider>
  );
}
