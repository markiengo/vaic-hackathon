import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { ToastProvider } from "@/components/ui";

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsWorkspace />
    </ToastProvider>
  );
}
