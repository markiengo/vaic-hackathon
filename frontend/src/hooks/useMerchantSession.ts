"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { SessionResponse } from "@/lib/auth/contracts";

async function getSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Phiên đăng nhập đã hết hạn.");
  return response.json() as Promise<SessionResponse>;
}

export function useMerchantSession() {
  return useQuery({ queryKey: queryKeys.session(), queryFn: getSession, staleTime: 60_000 });
}
