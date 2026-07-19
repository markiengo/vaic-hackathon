import { apiFetch } from "./client";
import type { BankTransaction, TransactionPage } from "@/lib/domain/types";

export interface TransactionFilters {
  merchantId: string;
  period: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  transport?: "live" | "fixture";
}

export async function getTransactions({
  merchantId,
  period,
  status,
  search,
  page = 1,
  pageSize = 50,
  transport = "live",
}: TransactionFilters): Promise<TransactionPage> {
  if (transport === "fixture") {
    const { transactionFixtures } = await import("@/mocks/fixtures/transactions");
    const transactions = transactionFixtures.filter(
      (transaction) =>
        transaction.merchant_id === merchantId &&
        (!status || status === "all" || transaction.match_status === status),
    );
    return { page: 1, page_size: transactions.length, total: transactions.length, transactions };
  }

  const query = new URLSearchParams({
    merchant_id: merchantId,
    period,
    page: String(page),
    page_size: String(pageSize),
  });
  if (status && status !== "all") query.set("status", status);
  if (search) query.set("search", search);
  const response = await apiFetch<TransactionPage | BankTransaction[]>(`transactions?${query}`);
  const transactions = Array.isArray(response) ? response : response.transactions ?? [];
  return {
    page: Array.isArray(response) ? page : response.page ?? page,
    page_size: Array.isArray(response) ? transactions.length : response.page_size ?? pageSize,
    total: Array.isArray(response) ? transactions.length : response.total ?? transactions.length,
    next_cursor: Array.isArray(response) ? null : response.next_cursor ?? null,
    transactions,
  };
}
