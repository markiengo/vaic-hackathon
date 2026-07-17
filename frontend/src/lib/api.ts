import axios from 'axios';
import type {
  DashboardStats,
  ExceptionItem,
  TaxReadinessReport,
  BankTransaction,
  Sale,
  Invoice,
  CashSession,
  TaxRuleVersion,
  AgentRun,
  Case,
  Product,
  AuditEvent,
} from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// --- Dashboard ---
export async function fetchDashboard(merchantId: string, period: string): Promise<DashboardStats> {
  const { data } = await api.get(`/merchants/${merchantId}/dashboard`, { params: { period } });
  return data;
}

// --- Exceptions ---
export async function fetchExceptions(merchantId: string, period: string): Promise<ExceptionItem[]> {
  const { data } = await api.get('/reconciliation/exceptions', { params: { merchant_id: merchantId, period } });
  return data;
}

export async function resolveException(id: string, action: string): Promise<void> {
  await api.post(`/reconciliation/exceptions/${id}/resolve`, { action });
}

// --- Tax ---
export async function fetchTaxReadiness(merchantId: string, period: string): Promise<TaxReadinessReport> {
  const { data } = await api.get('/tax/readiness', { params: { merchant_id: merchantId, period } });
  return data;
}

export async function exportTax(merchantId: string, period: string, format: string): Promise<Blob> {
  const { data } = await api.post('/tax/export', { merchant_id: merchantId, period, format }, { responseType: 'blob' });
  return data;
}

// --- Transactions ---
export async function fetchTransactions(merchantId: string, period: string): Promise<BankTransaction[]> {
  const { data } = await api.get('/transactions', { params: { merchant_id: merchantId, period } });
  return data;
}

// --- Agents ---
export async function startAgentRun(merchantId: string, period: string, request: string): Promise<{ run_id: string }> {
  const { data } = await api.post('/agents/run', { merchant_id: merchantId, period, request });
  return data;
}

export async function fetchAgentRun(runId: string): Promise<AgentRun> {
  const { data } = await api.get(`/agents/runs/${runId}`);
  return data;
}

export async function fetchAgentRuns(): Promise<AgentRun[]> {
  const { data } = await api.get('/agents/runs');
  return data;
}

// --- Cases ---
export async function fetchCases(merchantId: string): Promise<Case[]> {
  const { data } = await api.get('/cases', { params: { merchant_id: merchantId } });
  return data;
}

export async function assignCase(caseId: string, rm: string): Promise<void> {
  await api.post(`/cases/${caseId}/assign`, { rm });
}

// --- POS ---
export async function fetchProducts(merchantId: string): Promise<Product[]> {
  const { data } = await api.get('/pos/products', { params: { merchant_id: merchantId } });
  return data;
}

export async function createSale(merchantId: string, items: { product_id: string; quantity: number }[], paymentMethod: string): Promise<{ sale_id: string; payment_intent_id?: string }> {
  const { data } = await api.post('/pos/sales', { merchant_id: merchantId, items, payment_method: paymentMethod });
  return data;
}

export async function createPaymentIntent(saleId: string, amount: number): Promise<{ intent_id: string; qr_code: string; reference: string; expires_at: string }> {
  const { data } = await api.post('/pos/payment-intents', { sale_id: saleId, amount });
  return data;
}

export async function closeCashSession(sessionId: string, countedCash: number): Promise<void> {
  await api.post('/pos/cash-sessions/close', { session_id: sessionId, counted_cash: countedCash });
}

// --- Audit ---
export async function fetchAuditEvents(merchantId: string, period: string): Promise<AuditEvent[]> {
  const { data } = await api.get('/audit', { params: { merchant_id: merchantId, period } });
  return data;
}

export async function exportAudit(merchantId: string, period: string, format: string): Promise<Blob> {
  const { data } = await api.get('/audit', { params: { merchant_id: merchantId, period, format }, responseType: 'blob' });
  return data;
}
