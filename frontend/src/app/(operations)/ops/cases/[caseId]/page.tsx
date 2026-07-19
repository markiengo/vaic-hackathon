import { CaseDetailView } from "@/features/agentops/OperationsViews";

export default async function OperationsCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <CaseDetailView caseId={caseId} />;
}
