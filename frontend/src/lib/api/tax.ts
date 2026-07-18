import { ApiError, apiFetch } from "./client";
import type { TaxReadinessReport } from "@/lib/domain/types";

export type TaxExportFormat = "json" | "csv" | "misa_csv";

export function getTaxReadiness(merchantId: string, period: string) {
  const query = new URLSearchParams({ merchant_id: merchantId, period });
  return apiFetch<TaxReadinessReport>(`tax/readiness?${query}`);
}

function readCsrfCookie(): string | null {
  const value = document.cookie.split("; ").find((item) => item.startsWith("taxlens_csrf="));
  return value ? decodeURIComponent(value.slice("taxlens_csrf=".length)) : null;
}

export async function downloadTaxExport(merchantId: string, period: string, format: TaxExportFormat) {
  const headers = new Headers({ accept: "*/*", "content-type": "application/json" });
  const csrfToken = readCsrfCookie();
  if (csrfToken) headers.set("x-csrf-token", csrfToken);
  const query = new URLSearchParams({ merchant_id: merchantId, period, format });
  const response = await fetch(`/api/backend/tax/export?${query}`, {
    method: "GET",
    credentials: "same-origin",
    headers,
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
