import { OperationsSettings } from "@/features/agentops/OperationsSettings";
import { ToastProvider } from "@/components/ui";

export default function OperationsSettingsPage() {
  return (
    <ToastProvider>
      <OperationsSettings />
    </ToastProvider>
  );
}
