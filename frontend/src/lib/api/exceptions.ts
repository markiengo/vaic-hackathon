import { apiFetch, jsonBody } from "./client";
import type { ReconciliationException } from "@/lib/domain/types";

export interface ResolveExceptionInput {
  exceptionId: number;
  decision: "approved" | "rejected";
  classification?: "internal_transfer" | "revenue" | "loan" | "deposit" | "refund" | "other";
  sale_id?: string | null;
  note?: string;
}

export async function getExceptions(merchantId: string, period: string): Promise<ReconciliationException[]> {
  const query = new URLSearchParams({ merchant_id: merchantId, period, status: "PENDING" });
  try {
    return await apiFetch<ReconciliationException[]>(`reconciliation/exceptions?${query}`);
  } catch {
    // Fallback: derive exceptions from fixture transactions with unmatched status
    const { transactionFixtures } = await import("@/mocks/fixtures/transactions");
    return transactionFixtures
      .filter((t) => t.merchant_id === merchantId && t.match_status === "unmatched" && t.pending_exception_id)
      .map((t) => ({
        id: t.pending_exception_id!,
        merchant_id: t.merchant_id,
        exception_type: "PENDING_REVIEW",
        case_id: undefined,
        bank_transaction_id: t.id,
        sale_id: null,
        amount: t.amount,
        sender_name: t.sender_name,
        raw_note: t.raw_note,
        transaction_date: t.transaction_date,
        source: t.source,
        reference_number: t.reference_number,
        ai_suggestion: t.ai_interpretation
          ? {
              suggested_type: t.classification ?? null,
              confidence: typeof t.ai_interpretation === "object" && t.ai_interpretation !== null && "confidence" in t.ai_interpretation
                ? (t.ai_interpretation as { confidence: number }).confidence
                : null,
              reasoning: typeof t.ai_interpretation === "object" && t.ai_interpretation !== null && "reasoning" in t.ai_interpretation
                ? (t.ai_interpretation as { reasoning: string[] }).reasoning
                : null,
            }
          : null,
        status: "PENDING",
        human_decision: null,
        created_at: t.transaction_date,
      }));
  }
}

export function resolveException(input: ResolveExceptionInput) {
  const { exceptionId, ...body } = input;
  return apiFetch<{ exception_id: number; status: string; decision: string; classification: string | null }>(
    `reconciliation/exceptions/${exceptionId}/resolve`,
    { method: "POST", ...jsonBody(body) },
  );
}
