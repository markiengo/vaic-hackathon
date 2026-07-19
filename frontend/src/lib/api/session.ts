import type { SessionResponse } from "@/lib/auth/contracts";
import { ApiError, type ApiErrorEnvelope } from "./client";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

const DEMO_USERS: Record<string, SessionResponse["user"]> = {
  U005: {
    id: "U005",
    name: "Nguyễn Thị Hương",
    email: "huong.salonhoa@gmail.com",
    role: "merchant",
    merchant_id: "M001",
    onboarding_completed: false,
  },
  U002: {
    id: "U002",
    name: "Trần Văn Long",
    email: "long.ops@shb.com.vn",
    role: "ops_staff",
    merchant_id: null,
    onboarding_completed: false,
  },
};

export async function getSession(): Promise<SessionResponse> {
  // Demo mode: return hardcoded user without hitting the API
  if (readCookie("taxlens_demo") === "1") {
    const userId = readCookie("taxlens_demo_user") ?? "U005";
    const user = DEMO_USERS[userId] ?? DEMO_USERS["U005"];
    return { csrfToken: "demo-csrf", user };
  }

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
