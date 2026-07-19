export const queryKeys = {
  agentRun: (runId: string) => ["agent-run", runId] as const,
  agentRuns: (merchantId?: string) => ["agent-runs", merchantId ?? "all"] as const,
  audit: (filters: Record<string, string | undefined>) => ["audit", filters] as const,
  dashboard: (merchantId: string, period: string) => ["dashboard", merchantId, period] as const,
  exceptions: (merchantId: string, filters: Record<string, string | undefined>) =>
    ["exceptions", merchantId, filters] as const,
  invoices: (merchantId: string, filters: Record<string, string | undefined>) =>
    ["invoices", merchantId, filters] as const,
  merchants: () => ["merchants"] as const,
  sales: (merchantId: string, filters: Record<string, string | undefined>) =>
    ["sales", merchantId, filters] as const,
  session: () => ["session"] as const,
  taxReadiness: (merchantId: string, period: string) =>
    ["tax-readiness", merchantId, period] as const,
  transactions: (merchantId: string, filters: Record<string, string | undefined>) =>
    ["transactions", merchantId, filters] as const,
} as const;
