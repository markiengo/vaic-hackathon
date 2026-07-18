import { apiFetch, jsonBody } from "./client";
import type { ReconciliationException } from "@/lib/domain/types";

export interface ResolveExceptionInput {
  exceptionId: number;
  decision: "approved" | "rejected";
  classification?: "internal_transfer" | "revenue" | "loan" | "deposit" | "refund" | "other";
  sale_id?: string | null;
  note?: string;
}

export function getExceptions(merchantId: string, period: string): Promise<ReconciliationException[]> {
  const query = new URLSearchParams({ merchant_id: merchantId, period, status: "PENDING" });
  return apiFetch<ReconciliationException[]>(`reconciliation/exceptions?${query}`);
}

export function resolveException(input: ResolveExceptionInput) {
  const { exceptionId, ...body } = input;
  return apiFetch<{ exception_id: number; status: string; decision: string; classification: string | null }>(
    `reconciliation/exceptions/${exceptionId}/resolve`,
    { method: "POST", ...jsonBody(body) },
  );
}
