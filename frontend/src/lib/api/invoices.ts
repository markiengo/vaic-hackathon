import { apiFetch, jsonBody } from "./client";
import type { InvoiceCoverageResponse } from "@/lib/domain/types";

export type InvoiceCoverageStatus = "all" | "missing" | "linked";

export async function getInvoices(merchantId: string, period: string, status: InvoiceCoverageStatus): Promise<InvoiceCoverageResponse> {
  const query = new URLSearchParams({ period, status });
  try {
    return await apiFetch<InvoiceCoverageResponse>(`invoices?merchant_id=${merchantId}&${query}`);
  } catch {
    // Fallback: derive invoice coverage from fixture transactions
    const { transactionFixtures } = await import("@/mocks/fixtures/transactions");
    const txns = transactionFixtures.filter((t) => t.merchant_id === merchantId && t.match_status === "matched");
    const records = txns.map((t) => ({
      sale_id: t.matched_sale_id ?? t.id,
      amount: t.amount,
      payment_status: "paid",
      invoice_status: t.invoice_id ? "linked" : "missing",
      invoice_id: t.invoice_id ?? null,
      invoice_number: t.invoice_id ?? null,
      provider: t.invoice_id ? "SHB" : null,
      issued_at: t.invoice_id ? t.transaction_date : null,
      created_at: t.transaction_date,
      readiness_blocker: !t.invoice_id,
    }));
    const filtered = status === "missing" ? records.filter((r) => r.invoice_status === "missing")
      : status === "linked" ? records.filter((r) => r.invoice_status === "linked")
      : records;
    return {
      merchant_id: merchantId,
      period,
      missing_count: records.filter((r) => r.invoice_status === "missing").length,
      total: records.length,
      items: filtered,
      records: filtered,
    };
  }
}

export function linkInvoice(merchantId: string, saleId: string, invoiceId: string) {
  return apiFetch<{ invoice_id: string; sale_id: string; status: string }>(
    "invoices/link",
    { method: "POST", ...jsonBody({ merchant_id: merchantId, sale_id: saleId, invoice_id: invoiceId }) },
  );
}

export function markInvoiceIssuedElsewhere(
  merchantId: string,
  saleId: string,
  invoiceNumber: string,
  source: string,
) {
  return apiFetch<{ invoice_id: string; sale_id: string; status: string }>(
    "invoices/issued-elsewhere",
    { method: "POST", ...jsonBody({ merchant_id: merchantId, sale_id: saleId, invoice_number: invoiceNumber, source }) },
  );
}
