import { SupportWorkspace } from "@/components/support/SupportWorkspace";
import { ToastProvider } from "@/components/ui";

export default function SupportPage() {
  return (
    <ToastProvider>
      <SupportWorkspace />
    </ToastProvider>
  );
}
