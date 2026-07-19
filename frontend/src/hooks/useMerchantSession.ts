"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { SessionResponse, SessionUser } from "@/lib/auth/contracts";

const DEMO_USERS: Record<string, SessionUser> = {
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

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

async function getSession(): Promise<SessionResponse> {
  // Demo mode: return hardcoded user without hitting the API
  const isDemo = readCookie("taxlens_demo") === "1";
  if (isDemo) {
    const userId = readCookie("taxlens_demo_user") ?? "U005";
    const user = DEMO_USERS[userId] ?? DEMO_USERS["U005"];
    return { csrfToken: "demo-csrf", user };
  }

  const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Phiên đăng nhập đã hết hạn.");
  return response.json() as Promise<SessionResponse>;
}

export function useMerchantSession() {
  return useQuery({ queryKey: queryKeys.session(), queryFn: getSession, staleTime: 60_000, retry: 1 });
}
