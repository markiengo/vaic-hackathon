export type IsoDateTime = string;
export type MoneyValue = number;

export type MatchStatus = "matched" | "unmatched" | "partial" | "ambiguous";
export type ResolutionStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type PaymentMethod = "bank_transfer" | "cash" | "card" | "other";
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "REFUNDED" | "CANCELLED";

export interface MerchantSummary {
  id: string;
  name: string;
  business_type: string;
  business_category?: string | null;
  tax_id?: string | null;
  status: string;
}

export interface BankTransaction {
  id: string;
  merchant_id?: string;
  amount: MoneyValue;
  sender_name: string | null;
  raw_note: string | null;
  normalized_note: string | null;
  ai_interpretation?: unknown | null;
  transaction_type?: string | null;
  reference_number?: string | null;
  payment_code?: string | null;
  source?: string | null;
  transaction_date: IsoDateTime;
  match_status: MatchStatus | string;
  matched_sale_id: string | null;
  matched_sale_ids?: string[];
  allocated_amount?: MoneyValue;
  classification?: string | null;
  pending_exception_id?: number | null;
  invoice_id?: string | null;
}

export interface TransactionPage {
  transactions: BankTransaction[];
  total: number;
  page?: number;
  page_size?: number;
  next_cursor?: string | null;
}

export interface ReadinessCheck {
  item: string;
  label?: string;
  value: number | string | boolean;
  threshold: number | string | boolean;
  pass: boolean;
  details?: string;
  action_href?: string;
}

export interface TaxReadinessReport {
  merchant_id: string;
  period: string;
  score: number;
  rule_version: string | null;
  effective_from: string | null;
  legal_source: string | null;
  approved_by: string | null;
  generated_at: IsoDateTime;
  checklist: ReadinessCheck[];
  checks: ReadinessCheck[];
  blockers: ReadinessCheck[];
  export_allowed: boolean;
  ready: boolean;
}

export interface DashboardSummary {
  merchant_id: string;
  period: string;
  total_transactions: number;
  reconciled_count: number;
  reconciliation_rate: number;
  exception_count: number;
  missing_invoice_count: number;
  unclassified_count: number;
  tax_readiness: Pick<TaxReadinessReport, "ready" | "rule_version"> & {
    score: number;
    bank_reconciliation: number;
    cash_session_closure: number;
    missing_invoices: number;
    unclassified_transactions: number;
  };
  active_agents: Array<{ agent_name: string; status: string; run_id: string }>;
  recent_transactions: BankTransaction[];
}

export interface ReconciliationException {
  id: number;
  merchant_id?: string;
  exception_type: string;
  case_id?: string;
  bank_transaction_id?: string | null;
  sale_id?: string | null;
  amount: MoneyValue;
  sender_name: string | null;
  raw_note: string | null;
  ai_suggestion: {
    suggested_type?: string | null;
    confidence?: number | null;
    reasoning?: string[] | null;
    reason?: string | null;
  } | null;
  status: ResolutionStatus | string;
  human_decision?: string | null;
  created_at?: IsoDateTime | null;
}

export interface SaleLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: MoneyValue;
}

export interface SaleSummary {
  id: string;
  merchant_id: string;
  created_at: IsoDateTime;
  items: SaleLineItem[];
  gross_amount: MoneyValue;
  discount: MoneyValue;
  net_amount: MoneyValue;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus | string;
  invoice_status: string;
}

export interface InvoiceSummary {
  id: string;
  merchant_id: string;
  sale_id: string | null;
  invoice_number: string | null;
  amount: MoneyValue;
  issued_at: IsoDateTime | null;
  status: string;
  source?: string | null;
}

export interface InvoiceCoverageRecord {
  sale_id: string;
  amount: MoneyValue;
  payment_status: string;
  invoice_status: string;
  invoice_id: string | null;
  invoice_number: string | null;
  provider: string | null;
  issued_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
  readiness_blocker: boolean;
}

export interface InvoiceCoverageResponse {
  merchant_id: string;
  period: string;
  missing_count: number;
  total?: number;
  next_cursor?: string | null;
  items?: InvoiceCoverageRecord[];
  records: InvoiceCoverageRecord[];
}

export interface AgentEvidence {
  label: string;
  record_type: string;
  record_id: string;
  href?: string;
}

export interface AgentActionProposal {
  id: string;
  run_id: string;
  merchant_id: string;
  action_type: string;
  title: string;
  summary: string;
  impact: string;
  status:
    | "PROPOSED"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED";
  evidence: AgentEvidence[];
  created_at: IsoDateTime;
}
