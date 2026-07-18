import { SalesWorkspace } from "@/components/sales/SalesWorkspace";
import { ToastProvider } from "@/components/ui";

export default function SalesPage() {
  return (
    <ToastProvider>
      <SalesWorkspace />
    </ToastProvider>
  );
}
