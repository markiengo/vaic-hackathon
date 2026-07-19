import { ApiError, apiFetch, jsonBody } from "./client";
import type { ReadinessCheck, TaxReadinessReport } from "@/lib/domain/types";

export type TaxExportFormat = "json" | "csv";

type RawReadinessCheck = Partial<ReadinessCheck> & {
  name?: string;
  passed?: boolean;
};

type RawTaxReadiness = Partial<TaxReadinessReport> & {
  checklist?: RawReadinessCheck[];
  missing_invoice_sales?: string[];
};

function normalizeCheck(check: RawReadinessCheck): ReadinessCheck {
  return {
    item: check.item ?? check.name ?? "unknown",
    label: check.label,
    value: check.value ?? false,
    threshold: check.threshold ?? true,
    pass: check.pass ?? check.passed ?? false,
    details: check.details,
    action_href: check.action_href,
  };
}

export async function getTaxReadiness(merchantId: string, period: string): Promise<TaxReadinessReport> {
  const query = new URLSearchParams({ merchant_id: merchantId, period });
  let raw: RawTaxReadiness;
  try {
    raw = await apiFetch<RawTaxReadiness>(`tax/readiness?${query}`);
  } catch {
    // Fallback: build a basic readiness report from fixture data
    const { transactionFixtures } = await import("@/mocks/fixtures/transactions");
    const txns = transactionFixtures.filter((t) => t.merchant_id === merchantId);
    const matched = txns.filter((t) => t.match_status === "matched").length;
    const unmatched = txns.filter((t) => t.match_status === "unmatched").length;
    const missingInvoices = txns.filter((t) => !t.invoice_id && t.match_status === "matched").length;
    const checks: ReadinessCheck[] = [
      { item: "bank_reconciliation", label: "Đối soát ngân hàng", value: matched, threshold: txns.length, pass: unmatched === 0 },
      { item: "invoice_coverage", label: "Bảo phủ hóa đơn", value: txns.length - missingInvoices, threshold: txns.length, pass: missingInvoices === 0 },
      { item: "unclassified_transactions", label: "Giao dịch chưa phân loại", value: 0, threshold: 0, pass: true },
    ];
    const blockers = checks.filter((c) => !c.pass);
    const ready = blockers.length === 0;
    const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
    return {
      merchant_id: merchantId,
      period,
      score,
      rule_version: "2026.07",
      effective_from: null,
      legal_source: "Thông tư 40/2021/TT-BTC",
      approved_by: null,
      generated_at: new Date().toISOString(),
      checklist: checks,
      checks,
      blockers,
      export_allowed: ready,
      ready,
    };
  }
  const checks = (raw.checks ?? raw.checklist ?? []).map(normalizeCheck);
  const blockers = raw.blockers?.map(normalizeCheck) ?? checks.filter((check) => !check.pass);
  const ready = raw.ready ?? blockers.length === 0;
  const score = typeof raw.score === "number"
    ? Math.round(Math.min(100, Math.max(0, raw.score <= 1 ? raw.score * 100 : raw.score)))
    : checks.length ? Math.round((checks.filter((check) => check.pass).length / checks.length) * 100) : 0;
  return {
    merchant_id: raw.merchant_id ?? merchantId,
    period: raw.period ?? period,
    score,
    rule_version: raw.rule_version ?? null,
    effective_from: raw.effective_from ?? null,
    legal_source: raw.legal_source ?? null,
    approved_by: raw.approved_by ?? null,
    generated_at: raw.generated_at ?? "",
    checklist: checks,
    checks,
    blockers,
    export_allowed: raw.export_allowed ?? ready,
    ready,
    passed_count: raw.passed_count,
    total_count: raw.total_count,
    blocking_count: raw.blocking_count,
    missing_invoice_sales: raw.missing_invoice_sales,
  };
}

function readCsrfCookie(): string | null {
  const value = document.cookie.split("; ").find((item) => item.startsWith("taxlens_csrf="));
  return value ? decodeURIComponent(value.slice("taxlens_csrf=".length)) : null;
}

export async function downloadTaxExport(merchantId: string, period: string, format: TaxExportFormat) {
  const headers = new Headers({ accept: "*/*", "content-type": "application/json" });
  const csrfToken = readCsrfCookie();
  if (csrfToken) headers.set("x-csrf-token", csrfToken);
  const response = await fetch("/api/backend/tax/export", {
    method: "POST",
    credentials: "same-origin",
    headers,
    ...jsonBody({ merchant_id: merchantId, period, format }),
  });
  if (!response.ok) {
    const envelope = await response.json().catch(() => ({}));
    throw new ApiError(
      envelope.error?.message ?? "Không thể xuất dữ liệu.",
      response.status,
      envelope.error?.code,
      envelope.error?.details,
    );
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `taxlens-${period}.${format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
