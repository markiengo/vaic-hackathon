import { ApiError, apiFetch, jsonBody } from "./client";
import type { ReadinessCheck, TaxReadinessReport } from "@/lib/domain/types";

export type TaxExportFormat = "json" | "csv";

type RawReadinessCheck = Partial<ReadinessCheck> & {
  name?: string;
  passed?: boolean;
};

type RawTaxReadiness = Partial<TaxReadinessReport> & {
  checklist?: RawReadinessCheck[];
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
  const raw = await apiFetch<RawTaxReadiness>(`tax/readiness?${query}`);
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
