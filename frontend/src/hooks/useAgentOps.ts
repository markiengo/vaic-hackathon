"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignCase,
  decideAgentAction,
  draftCaseMessage,
  executeAgentAction,
  getAgentActions,
  getAgentRun,
  getAgentRunTrace,
  getAgentRuns,
  getAuditEvents,
  getCase,
  getCases,
  getComplianceRules,
  getMerchantDashboard,
  getMerchantPortfolio,
  resolveCaseException,
  startAgentRun,
  type AgentAction,
} from "@/lib/api/agentops";

export const agentOpsKeys = {
  actions: (runId?: string) => ["agent-actions", runId ?? "all"] as const,
  runs: (merchantId?: string) => ["agent-runs", merchantId ?? "all"] as const,
  run: (runId: string) => ["agent-run", runId] as const,
  trace: (runId: string) => ["agent-run-trace", runId] as const,
  portfolio: ["merchant-portfolio"] as const,
  cases: ["ops-cases"] as const,
  case: (caseId: string) => ["ops-case", caseId] as const,
  dashboard: (merchantId: string, period: string) => ["ops-merchant-dashboard", merchantId, period] as const,
  audit: ["ops-audit"] as const,
  compliance: ["ops-compliance"] as const,
};

export function useAgentRuns(merchantId?: string) {
  return useQuery({ queryKey: agentOpsKeys.runs(merchantId), queryFn: () => getAgentRuns(merchantId) });
}

export function useAgentRun(runId: string) {
  return useQuery({ queryKey: agentOpsKeys.run(runId), queryFn: () => getAgentRun(runId) });
}

export function useAgentRunTrace(runId: string) {
  return useQuery({ queryKey: agentOpsKeys.trace(runId), queryFn: () => getAgentRunTrace(runId) });
}

export function useAgentActions(runId?: string, enabled = Boolean(runId)) {
  return useQuery({
    queryKey: agentOpsKeys.actions(runId),
    queryFn: () => getAgentActions({ runId }),
    enabled: Boolean(runId) && enabled,
  });
}

export function useStartAgentRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: startAgentRun,
    onSuccess: () => client.invalidateQueries({ queryKey: ["agent-runs"] }),
  });
}

export function useActionDecision(runId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ action, decision }: { action: AgentAction; decision: "APPROVED" | "REJECTED" }) =>
      decideAgentAction(action, decision),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: agentOpsKeys.actions(runId) });
      client.invalidateQueries({ queryKey: ["agent-runs"] });
    },
  });
}

export function useActionExecution(runId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: executeAgentAction,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: agentOpsKeys.actions(runId) });
      client.invalidateQueries({ queryKey: ["agent-runs"] });
      client.invalidateQueries({ queryKey: agentOpsKeys.cases });
      client.invalidateQueries({ queryKey: agentOpsKeys.portfolio });
    },
  });
}

export function usePortfolio() {
  return useQuery({ queryKey: agentOpsKeys.portfolio, queryFn: getMerchantPortfolio });
}

export function useMerchantDashboard(merchantId: string, period = "2026-07") {
  return useQuery({
    queryKey: agentOpsKeys.dashboard(merchantId, period),
    queryFn: () => getMerchantDashboard(merchantId, period),
    enabled: Boolean(merchantId),
  });
}

export function useMerchantDashboards(merchantIds: string[], period = "2026-07") {
  return useQueries({
    queries: merchantIds.map((merchantId) => ({
      queryKey: agentOpsKeys.dashboard(merchantId, period),
      queryFn: () => getMerchantDashboard(merchantId, period),
      staleTime: 30_000,
    })),
  });
}

export function useCases() {
  return useQuery({ queryKey: agentOpsKeys.cases, queryFn: getCases });
}

export function useCaseDetail(caseId: string) {
  return useQuery({ queryKey: agentOpsKeys.case(caseId), queryFn: () => getCase(caseId), enabled: Boolean(caseId) });
}

export function useAssignCase(caseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (rmId: string) => assignCase(caseId, rmId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: agentOpsKeys.case(caseId) });
      client.invalidateQueries({ queryKey: agentOpsKeys.cases });
    },
  });
}

export function useDraftCaseMessage(caseId: string) {
  return useMutation({ mutationFn: (exceptionIds: number[]) => draftCaseMessage(caseId, exceptionIds) });
}

export function useResolveCaseException(caseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, saleId, classification }: { exceptionId: number; saleId?: string | null; classification?: string | null }) =>
      resolveCaseException(exceptionId, { saleId, classification }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: agentOpsKeys.case(caseId) });
      client.invalidateQueries({ queryKey: agentOpsKeys.cases });
      client.invalidateQueries({ queryKey: agentOpsKeys.portfolio });
    },
  });
}

export function useAuditEvents() {
  return useQuery({ queryKey: agentOpsKeys.audit, queryFn: getAuditEvents });
}

export function useComplianceRules() {
  return useQuery({ queryKey: agentOpsKeys.compliance, queryFn: getComplianceRules });
}
