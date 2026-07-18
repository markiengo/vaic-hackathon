"use client";

import { useSearchParams } from "next/navigation";

export function LoginSearchParams({ children }: { children: (initialEmail: string | undefined) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? undefined;
  return <>{children(email)}</>;
}
