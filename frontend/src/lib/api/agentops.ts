import { apiFetch, jsonBody } from "./client";

export type AgentActionStatus =
  | "PROPOSED"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export interface AgentRunSummary {
  id: string;
  case_id: string | null;
  merchant_id: string;
  request_text: string;
  plan: {
    period?: string;
    steps?: AgentPlanStep[];
    progress?: SafeProgress[];
    evidence?: Record<string, unknown>;
  } | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface AgentPlanStep {
  step?: number;
  action?: string;
  agent?: string;
}

export interface AgentToolCall {
  agent_name: string;
  tool_name: string;
  input_hash: string | null;
  output_hash: string | null;
  confidence: number | null;
  rule_version: string | null;
  called_at: string | null;
  duration_ms: number | null;
}

export interface AgentRunTrace {
  run_id: string;
  status: string;
  plan: AgentPlanStep[];
  progress: SafeProgress[];
  evidence: Record<string, unknown>;
  tool_calls: AgentToolCall[];
  actions: AgentAction[];
}

export interface SafeProgress {
  agent: string;
  stage: string;
  summary: string;
}

export interface AgentAction {
  id: string;
  agent_run_id: string;
  merchant_id: string;
  case_id: string | null;
  requested_by_agent: string;
  tool_name: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  human_summary: string;
  status: AgentActionStatus;
  decided_by_user_id: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  result: Record<string, unknown> | null;
  result_hash: string | null;
  executed_at: string | null;
  error: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantPortfolio {
  merchants: Array<{
    id: string;
    name: string;
    business_type: string;
    business_category: string | null;
    status: string;
    open_cases: number;
    active_runs: number;
  }>;
  summary: { total: number; active: number; open_cases: number; active_runs: number };
}

export interface MerchantDashboard {
  merchant_id: string;
  period: string;
  total_transactions: number;
  reconciled_count: number;
  reconciliation_rate: number;
  exception_count: number;
  open_exceptions: number;
  missing_invoice_count: number;
  unclassified_count: number;
  tax_readiness: {
    score: number;
    ready: boolean;
    rule_version: string;
    bank_reconciliation: number;
    cash_session_closure: number;
    missing_invoices: number;
    unclassified_transactions: number;
  };
  active_agents: Array<{ agent_name: string; status: string; run_id: string }>;
}

export interface CaseSummary {
  id: string;
  merchant_id: string;
  period: string;
  status: string;
  priority: string;
  assigned_rm_id: string | null;
  exception_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseDetail extends CaseSummary {
  tax_rule_version: string | null;
  human_approvals: unknown[];
  exceptions: Array<{
    id: number;
    exception_type: string;
    status: string;
    bank_transaction_id: string | null;
    sale_id: string | null;
    ai_suggestion: Record<string, unknown> | null;
    human_decision: string | null;
    created_at: string | null;
  }>;
  actions: Array<{
    id: string;
    action_type: string;
    human_summary: string;
    status: AgentActionStatus;
    version: number;
  }>;
}

export interface AuditEvent {
  id: number;
  actor_type: string;
  actor_id: string;
  agent_name: string | null;
  action: string;
  tool_name: string | null;
  input_hash: string | null;
  output_hash: string | null;
  confidence: number | null;
  rule_version: string | null;
  approval_status: string | null;
  merchant_id: string | null;
  timestamp: string | null;
}

export interface ComplianceRule {
  version: string;
  merchant_type: string | null;
  business_category: string | null;
  effective_from: string;
  effective_to: string | null;
  legal_source: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
}

export function startAgentRun(input: { merchantId: string; period: string; request: string }) {
  return apiFetch<{ run_id: string; status: string }>("agents/run", {
    method: "POST",
    ...jsonBody({ merchant_id: input.merchantId, period: input.period, request: input.request }),
  });
}

export function getAgentRuns(merchantId?: string) {
  const query = merchantId ? `?merchant_id=${encodeURIComponent(merchantId)}` : "";
  return apiFetch<AgentRunSummary[]>(`agents/runs${query}`);
}

export function getAgentRun(runId: string) {
  return apiFetch<AgentRunSummary>(`agents/runs/${encodeURIComponent(runId)}`);
}

export function getAgentRunTrace(runId: string) {
  return apiFetch<AgentRunTrace>(`agents/runs/${encodeURIComponent(runId)}/trace`);
}

export function getAgentActions(filters: { merchantId?: string; runId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.merchantId) params.set("merchant_id", filters.merchantId);
  if (filters.runId) params.set("run_id", filters.runId);
  const query = params.size ? `?${params}` : "";
  return apiFetch<AgentAction[]>(`agents/actions${query}`);
}

export function decideAgentAction(action: AgentAction, decision: "APPROVED" | "REJECTED") {
  return apiFetch<AgentAction>(`agents/actions/${action.id}/decision`, {
    method: "POST",
    ...jsonBody({ decision, expected_version: action.version }),
  });
}

export function executeAgentAction(action: AgentAction) {
  return apiFetch<AgentAction>(`agents/actions/${action.id}/execute`, {
    method: "POST",
    ...jsonBody({ expected_version: action.version }),
  });
}

export function getMerchantPortfolio() {
  return apiFetch<MerchantPortfolio>("merchants");
}

export function getMerchantDashboard(merchantId: string, period = "2026-07") {
  return apiFetch<MerchantDashboard>(
    `merchants/${encodeURIComponent(merchantId)}/dashboard?period=${encodeURIComponent(period)}`,
  );
}

export function getCases() {
  return apiFetch<{ cases: CaseSummary[] }>("cases");
}

export function getCase(caseId: string) {
  return apiFetch<CaseDetail>(`cases/${encodeURIComponent(caseId)}`);
}

export function assignCase(caseId: string, rmId: string) {
  return apiFetch<{ case_id: string; assigned_rm_id: string; status: string }>(
    `cases/${encodeURIComponent(caseId)}/assign`,
    { method: "POST", ...jsonBody({ rm_id: rmId }) },
  );
}

export function draftCaseMessage(caseId: string, exceptionIds: number[]) {
  return apiFetch<{ case_id: string; message: string; status: "DRAFT" }>(
    `cases/${encodeURIComponent(caseId)}/draft-message`,
    { method: "POST", ...jsonBody({ exception_ids: exceptionIds }) },
  );
}

export function resolveCaseException(
  exceptionId: number,
  input: { saleId?: string | null; classification?: string | null },
) {
  return apiFetch<{ exception_id: number; status: string; decision: string; classification: string | null }>(
    `reconciliation/exceptions/${exceptionId}/resolve`,
    {
      method: "POST",
      ...jsonBody({
        decision: "approved",
        sale_id: input.saleId ?? null,
        classification: input.classification ?? null,
        note: "SHB Ops approved the recorded proposal.",
      }),
    },
  );
}

export function getAuditEvents() {
  return apiFetch<{ events: AuditEvent[] }>("audit?format=json&limit=200");
}

export function getComplianceRules() {
  return apiFetch<{ rules: ComplianceRule[] }>("tax/rules");
}
