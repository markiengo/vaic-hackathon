import { MerchantCaseDetail } from "@/components/support/MerchantCaseDetail";
import { ToastProvider } from "@/components/ui";

export default async function SupportCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <ToastProvider>
      <MerchantCaseDetail caseId={caseId} />
    </ToastProvider>
  );
}
