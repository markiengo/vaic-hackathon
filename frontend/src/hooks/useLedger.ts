"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api/dashboard";
import { getExceptions, resolveException, type ResolveExceptionInput } from "@/lib/api/exceptions";
import {
  getInvoices,
  linkInvoice,
  markInvoiceIssuedElsewhere,
  type InvoiceCoverageStatus,
} from "@/lib/api/invoices";
import { queryKeys } from "@/lib/api/queryKeys";
import { getTaxReadiness } from "@/lib/api/tax";

export function useDashboard(merchantId: string | undefined, period: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(merchantId ?? "", period),
    queryFn: () => getDashboard(merchantId!, period),
    enabled: Boolean(merchantId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useExceptions(merchantId: string | undefined, period: string) {
  return useQuery({
    queryKey: queryKeys.exceptions(merchantId ?? "", { period, status: "PENDING" }),
    queryFn: () => getExceptions(merchantId!, period),
    enabled: Boolean(merchantId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInvoices(
  merchantId: string | undefined,
  period: string,
  status: InvoiceCoverageStatus = "all",
) {
  return useQuery({
    queryKey: queryKeys.invoices(merchantId ?? "", { period, status }),
    queryFn: () => getInvoices(merchantId!, period, status),
    enabled: Boolean(merchantId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTaxReadiness(merchantId: string | undefined, period: string) {
  return useQuery({
    queryKey: queryKeys.taxReadiness(merchantId ?? "", period),
    queryFn: () => getTaxReadiness(merchantId!, period),
    enabled: Boolean(merchantId),
    staleTime: 30_000,
    retry: 1,
  });
}

function useLedgerInvalidation(merchantId: string, period: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard", merchantId] }),
      queryClient.invalidateQueries({ queryKey: ["exceptions", merchantId] }),
      queryClient.invalidateQueries({ queryKey: ["invoices", merchantId] }),
      queryClient.invalidateQueries({ queryKey: ["tax-readiness", merchantId, period] }),
      queryClient.invalidateQueries({ queryKey: ["transactions", merchantId] }),
    ]);
  };
}

export function useResolveException(merchantId: string, period: string) {
  return useMutation({ mutationFn: (input: ResolveExceptionInput) => resolveException(input), onSuccess: useLedgerInvalidation(merchantId, period) });
}

export function useLinkInvoice(merchantId: string, period: string) {
  return useMutation({
    mutationFn: ({ saleId, invoiceId }: { saleId: string; invoiceId: string }) =>
      linkInvoice(merchantId, saleId, invoiceId),
    onSuccess: useLedgerInvalidation(merchantId, period),
  });
}

export function useMarkInvoiceIssuedElsewhere(merchantId: string, period: string) {
  return useMutation({
    mutationFn: ({ saleId, invoiceNumber, source }: { saleId: string; invoiceNumber: string; source: string }) =>
      markInvoiceIssuedElsewhere(merchantId, saleId, invoiceNumber, source),
    onSuccess: useLedgerInvalidation(merchantId, period),
  });
}
