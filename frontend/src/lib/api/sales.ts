import { apiFetch, jsonBody } from "./client";

export interface PosProduct {
  id: string;
  name: string;
  category: string | null;
  price: number;
  is_service: boolean;
}

export interface CashSessionSummary {
  id: number;
  opening_cash: number;
  expected_cash: number | null;
  counted_cash: number | null;
  cash_expenses: number;
  discrepancy: number | null;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
}

export interface PosContext {
  merchant_id: string;
  store_id: string;
  store_name: string;
  device_id: string | null;
  staff_id: string;
  active_cash_session: CashSessionSummary | null;
}

export interface SaleDraftItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface CreatedSale {
  sale_id: string;
  gross_amount: number;
  discount: number;
  net_amount: number;
  payment_status: string;
  invoice_status: string;
  idempotent_replay: boolean;
}

export interface PaymentIntentResult {
  payment_intent_id: string;
  amount: number;
  qr_data: string;
  expires_at: string;
  status: string;
  idempotent_replay: boolean;
}

export interface CashPaymentResult {
  sale_id: string;
  payment_status: string;
  cash_session_id: string;
  allocation_id: number;
}

export interface DemoPaymentResult {
  transaction_id: string;
  payment_intent_id: string;
  sale_id: string;
  payment_status: string;
  idempotent_replay: boolean;
}

export interface SaleHistoryItem {
  id: string;
  merchant_id: string;
  store_id: string;
  gross_amount: number;
  discount: number;
  net_amount: number;
  payment_method: "cash" | "bank_transfer" | "other" | null;
  payment_status: string;
  invoice_status: string;
  created_at: string;
  lines: Array<{
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  relationship: {
    order_id: string;
    payment_id: string | null;
    invoice_id: string | null;
  };
}

export interface SalesPageResult {
  items: SaleHistoryItem[];
  total: number;
  next_cursor: string | null;
}

export interface CashCloseResult {
  session_id: string;
  opening_cash: number;
  expected_cash: number;
  counted_cash: number;
  discrepancy: number;
  status: string;
}

export const salesQueryKeys = {
  context: (merchantId: string) => ["pos-context", merchantId] as const,
  products: (merchantId: string) => ["pos-products", merchantId] as const,
  history: (merchantId: string, period: string) => ["sales", merchantId, period] as const,
};

export function getPosContext(merchantId: string): Promise<PosContext> {
  return apiFetch(`pos/context?merchant_id=${encodeURIComponent(merchantId)}`);
}

export function getProducts(merchantId: string): Promise<PosProduct[]> {
  return apiFetch(`pos/products?merchant_id=${encodeURIComponent(merchantId)}`);
}

export function getSales(merchantId: string, period: string): Promise<SalesPageResult> {
  const query = new URLSearchParams({ merchant_id: merchantId, period });
  return apiFetch(`sales?${query}`);
}

export function createSale(
  context: PosContext,
  items: SaleDraftItem[],
  discount: number,
  idempotencyKey: string,
): Promise<CreatedSale> {
  return apiFetch("pos/sales", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    ...jsonBody({
      merchant_id: context.merchant_id,
      store_id: context.store_id,
      device_id: context.device_id,
      staff_id: context.staff_id,
      items: items.map(({ product_id, product_name, quantity, unit_price }) => ({
        product_id,
        product_name,
        quantity,
        unit_price,
      })),
      discount,
    }),
  });
}

export function createPaymentIntent(
  saleId: string,
  amount: number,
  idempotencyKey: string,
): Promise<PaymentIntentResult> {
  return apiFetch("pos/payment-intents", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    ...jsonBody({ sale_id: saleId, amount }),
  });
}

export function recordCashPayment(
  saleId: string,
  amount: number,
  context: PosContext,
  idempotencyKey: string,
): Promise<CashPaymentResult> {
  return apiFetch("pos/cash-payments", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    ...jsonBody({
      sale_id: saleId,
      amount,
      store_id: context.store_id,
      staff_id: context.staff_id,
    }),
  });
}

export function simulateDemoPayment(paymentIntentId: string): Promise<DemoPaymentResult> {
  return apiFetch("pos/demo-payments", {
    method: "POST",
    ...jsonBody({ payment_intent_id: paymentIntentId }),
  });
}

export function closeCashSession(
  sessionId: number,
  countedCash: number,
  discrepancyReason?: string,
): Promise<CashCloseResult> {
  return apiFetch(`pos/cash-sessions/${sessionId}/close`, {
    method: "POST",
    ...jsonBody({ counted_cash: countedCash, discrepancy_reason: discrepancyReason || null }),
  });
}
