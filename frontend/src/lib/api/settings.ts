import { apiFetch, jsonBody } from "./client";

export interface MerchantProfile {
  id: string;
  name: string;
  business_type: string;
  business_category: string | null;
  tax_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export type IntegrationSyncStatus = "PENDING" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";

export interface IntegrationSyncRun {
  id: string;
  merchant_id: string;
  initiated_by_user_id: string | null;
  provider: string;
  trigger_type: "MANUAL" | "SCHEDULED" | "WEBHOOK" | "RETRY";
  idempotency_key: string;
  status: IntegrationSyncStatus;
  range_start: string | null;
  range_end: string | null;
  cursor_before: string | null;
  cursor_after: string | null;
  records_received: number;
  records_inserted: number;
  records_skipped: number;
  records_failed: number;
  request_context: Record<string, unknown>;
  result_summary: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  merchant_id: string;
  provider: string;
  configured: boolean;
  latest_run: IntegrationSyncRun | null;
}

export interface ImportPreviewRow {
  row_number: number;
  date: string;
  amount: string;
  sender: string | null;
  note: string | null;
  type: string;
}

export interface ImportRowError {
  row_number: number;
  reason: string;
  raw_row: Record<string, unknown>;
}

export interface LedgerImportResult {
  batch_id: string;
  status: "UPLOADED" | "VALIDATING" | "READY" | "IMPORTING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  source_type: "CSV" | "XLSX";
  total_rows: number;
  valid_rows: number;
  imported_rows: number;
  rejected_rows: number;
  preview: ImportPreviewRow[];
  errors: ImportRowError[];
  idempotent_replay: boolean;
}

export const settingsQueryKeys = {
  merchant: (merchantId: string) => ["merchant-profile", merchantId] as const,
  integration: (merchantId: string) => ["integration-status", merchantId] as const,
};

export function getMerchantProfile(merchantId: string): Promise<MerchantProfile> {
  return apiFetch(`merchants/${encodeURIComponent(merchantId)}`);
}

export function getIntegrationStatus(merchantId: string): Promise<IntegrationStatus> {
  return apiFetch(`integrations/status?merchant_id=${encodeURIComponent(merchantId)}`);
}

export function syncSepay(
  merchantId: string,
  period: string,
  accountNumber: string,
  idempotencyKey: string,
): Promise<IntegrationSyncRun> {
  return apiFetch("integrations/sepay/sync", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    ...jsonBody({ merchant_id: merchantId, period, account_number: accountNumber.trim() || null }),
  });
}

export function importLedger(
  merchantId: string,
  reportingPeriod: string,
  file: File,
  commit: boolean,
): Promise<LedgerImportResult> {
  const body = new FormData();
  body.set("merchant_id", merchantId);
  body.set("reporting_period", reportingPeriod);
  body.set("commit", String(commit));
  body.set("file", file, file.name);
  return apiFetch("imports/ledger", { method: "POST", body });
}

export interface UpdateMerchantRequest {
  name?: string;
  business_type?: string;
  business_category?: string;
  tax_id?: string;
  contact_phone?: string;
  contact_email?: string;
}

export function updateMerchantProfile(
  merchantId: string,
  body: UpdateMerchantRequest,
): Promise<MerchantProfile> {
  return apiFetch(`merchants/${encodeURIComponent(merchantId)}`, {
    method: "PUT",
    ...jsonBody(body),
  });
}

export interface OnboardingSyncStep {
  label: string;
  count: number;
  done: boolean;
}

export interface OnboardingSyncResponse {
  merchant_id: string;
  period: string;
  case_id: string | null;
  steps: OnboardingSyncStep[];
  sync: {
    transactions: number;
    sales: number;
    cash_sessions: number;
    invoices: number;
    matched: number;
  };
  reconciliation: {
    total_transactions: number;
    matched: number;
    pending_exceptions: number;
    missing_invoices: number;
    readiness_score: number;
    summary: Record<string, unknown> | null;
  };
}

export function runOnboardingSync(merchantId: string): Promise<OnboardingSyncResponse> {
  return apiFetch(`merchants/${encodeURIComponent(merchantId)}/onboarding-sync`, {
    method: "POST",
  });
}

export interface CasesSummary {
  total_active: number;
  high_priority: number;
  medium_priority: number;
  over_sla: number;
  agent_attention: number;
}

export function getCasesSummary(): Promise<CasesSummary> {
  return apiFetch("cases/summary");
}

export interface PortfolioMerchant {
  id: string;
  name: string;
  business_type: string | null;
  business_category: string | null;
  status: string;
  open_cases: number;
  active_runs: number;
}

export function getPortfolio(): Promise<{ merchants: PortfolioMerchant[]; summary: Record<string, number> }> {
  return apiFetch("merchants/portfolio");
}
