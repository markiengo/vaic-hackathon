import { ApiError, type ApiErrorEnvelope } from "./client";

export type ConfirmationClassification = "revenue" | "internal_transfer" | "loan" | "other";

export interface PublicConfirmation {
  exception_id: number;
  status: string;
  amount: string | null;
  sender_name: string | null;
  date: string | null;
  raw_note: string | null;
  ai_suggestion: string | null;
  confidence: number | null;
  suggestion_summary: string | null;
  expires_at: string;
  options: string[];
  consumed_at: string | null;
}

export interface ConfirmationResult {
  status: "CONFIRMED" | "ALREADY_CONFIRMED";
  exception_id: number;
  classification: ConfirmationClassification;
}

async function publicConfirmationFetch<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/public/confirm", {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json", "content-type": "application/json" },
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    let envelope: ApiErrorEnvelope = {};
    try {
      envelope = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // The public surface still exposes one stable error when upstream is not JSON.
    }
    throw new ApiError(
      envelope.error?.message ?? "Không thể kiểm tra liên kết xác nhận.",
      response.status,
      envelope.error?.code,
      envelope.error?.details,
    );
  }
  return (await response.json()) as T;
}

export function inspectConfirmation(token: string): Promise<PublicConfirmation> {
  return publicConfirmationFetch({ operation: "inspect", token });
}

export function submitConfirmation(token: string, classification: ConfirmationClassification): Promise<ConfirmationResult> {
  return publicConfirmationFetch({ operation: "submit", token, classification });
}
