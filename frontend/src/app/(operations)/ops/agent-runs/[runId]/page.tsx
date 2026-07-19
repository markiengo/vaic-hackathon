import { AgentRunDetailView } from "@/features/agentops/OperationsViews";

export default async function OperationsAgentRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <AgentRunDetailView runId={runId} />;
}
