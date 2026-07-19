import type { SessionResponse } from "@/lib/auth/contracts";
import { ApiError, type ApiErrorEnvelope } from "./client";

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
    throw new ApiError(
      payload.error?.message ?? "Phiên đăng nhập đã hết hạn.",
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }
  return (await response.json()) as SessionResponse;
}
