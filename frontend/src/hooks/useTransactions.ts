"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { getTransactions, type TransactionFilters } from "@/lib/api/transactions";

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryFn: () => getTransactions(filters),
    queryKey: queryKeys.transactions(filters.merchantId, {
      period: filters.period,
      status: filters.status,
      search: filters.search,
      page: filters.page?.toString(),
      pageSize: filters.pageSize?.toString(),
      transport: filters.transport,
    }),
    enabled: Boolean(filters.merchantId),
  });
}
