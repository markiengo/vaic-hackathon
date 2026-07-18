"use client";

import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/api/session";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    staleTime: 5 * 60_000,
  });
}
