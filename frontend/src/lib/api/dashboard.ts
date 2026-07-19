import { apiFetch } from "./client";
import { getTransactions } from "./transactions";
import type { BankTransaction, DashboardSummary } from "@/lib/domain/types";

type RawDashboard = Omit<Partial<DashboardSummary>, "tax_readiness" | "active_agents"> & {
  matched?: number;
  exceptions?: number;
  open_exceptions?: number;
  tax_ready?: boolean;
  tax_readiness?: Record<string, unknown>;
  active_agents?: Array<Record<string, unknown>>;
};

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizedRate(value: unknown): number {
  const rate = finiteNumber(value);
  return Math.min(1, Math.max(0, rate > 1 ? rate / 100 : rate));
}

function readinessValue(value: unknown, zeroMeansPass = false): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  const number = finiteNumber(value);
  if (zeroMeansPass) return number === 0 ? 1 : 0;
  return Math.min(1, Math.max(0, number));
}

function readinessScore(value: unknown, checks: number[]): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(Math.min(100, Math.max(0, value <= 1 ? value * 100 : value)));
  }
  return checks.length ? Math.round((checks.reduce((sum, check) => sum + check, 0) / checks.length) * 100) : 0;
}

async function getRecentTransactions(merchantId: string, period: string): Promise<BankTransaction[]> {
  try {
    const response = await getTransactions({ merchantId, period, page: 1, pageSize: 7 });
    return response.transactions.slice(0, 7);
  } catch {
    // Dashboard remains useful even when the optional recent-activity read fails.
    return [];
  }
}

export async function getDashboard(merchantId: string, period: string): Promise<DashboardSummary> {
  const query = new URLSearchParams({ period });
  const raw = await apiFetch<RawDashboard>(`merchants/${merchantId}/dashboard?${query}`);
  const rawReadiness = raw.tax_readiness ?? {};
  const bankReconciliation = readinessValue(rawReadiness.bank_reconciliation);
  const cashSessionClosure = readinessValue(rawReadiness.cash_session_closure);
  const missingInvoices = readinessValue(rawReadiness.missing_invoices, true);
  const unclassifiedTransactions = readinessValue(rawReadiness.unclassified_transactions, true);
  const checks = [bankReconciliation, cashSessionClosure, missingInvoices, unclassifiedTransactions];

  return {
    merchant_id: raw.merchant_id ?? merchantId,
    period: raw.period ?? period,
    total_transactions: finiteNumber(raw.total_transactions),
    reconciled_count: finiteNumber(raw.reconciled_count, finiteNumber(raw.matched)),
    reconciliation_rate: normalizedRate(raw.reconciliation_rate),
    exception_count: finiteNumber(raw.exception_count, finiteNumber(raw.exceptions, finiteNumber(raw.open_exceptions))),
    missing_invoice_count: finiteNumber(raw.missing_invoice_count),
    unclassified_count: finiteNumber(raw.unclassified_count),
    tax_readiness: {
      ready: typeof rawReadiness.ready === "boolean" ? rawReadiness.ready : Boolean(raw.tax_ready),
      rule_version: typeof rawReadiness.rule_version === "string" ? rawReadiness.rule_version : null,
      score: readinessScore(rawReadiness.score, checks),
      bank_reconciliation: bankReconciliation,
      cash_session_closure: cashSessionClosure,
      missing_invoices: missingInvoices,
      unclassified_transactions: unclassifiedTransactions,
    },
    active_agents: (raw.active_agents ?? []).map((agent) => ({
      agent_name: typeof agent.agent_name === "string" ? agent.agent_name : "reconciliation",
      status: typeof agent.status === "string" ? agent.status : "UNKNOWN",
      run_id: typeof agent.run_id === "string" ? agent.run_id : "unknown",
    })),
    recent_transactions: raw.recent_transactions ?? await getRecentTransactions(merchantId, period),
  };
}
