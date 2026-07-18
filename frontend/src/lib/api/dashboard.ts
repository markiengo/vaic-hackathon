import { apiFetch } from "./client";
import type { DashboardSummary } from "@/lib/domain/types";

export function getDashboard(merchantId: string, period: string): Promise<DashboardSummary> {
  const query = new URLSearchParams({ period });
  return apiFetch<DashboardSummary>(`merchants/${merchantId}/dashboard?${query}`);
}
