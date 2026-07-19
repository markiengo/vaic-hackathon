import { apiFetch, jsonBody } from "./client";
import type { InvoiceCoverageResponse } from "@/lib/domain/types";

export type InvoiceCoverageStatus = "all" | "missing" | "linked";

export function getInvoices(merchantId: string, period: string, status: InvoiceCoverageStatus) {
  const query = new URLSearchParams({ period, status });
  return apiFetch<InvoiceCoverageResponse>(`invoices?merchant_id=${merchantId}&${query}`);
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
