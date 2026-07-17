export interface Merchant {
  id: string;
  name: string;
  business_type: string;
  business_category: string;
  tax_id: string;
  status: string;
}

export interface BankTransaction {
  id: string;
  merchant_id: string;
  account_number: string;
  amount: number;
  raw_note: string;
  transaction_type: string;
  reference_number: string | null;
  payment_code: string | null;
  source: string;
  transaction_date: string;
  accumulated: number | null;
}

export interface Sale {
  id: string;
  merchant_id: string;
  store_id: string;
  gross_amount: number;
  net_amount: number;
  payment_status: string;
  invoice_status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  sale_id: string;
  merchant_id: string;
  invoice_number: string;
  amount: number;
  invoice_date: string;
  status: string;
  source: string;
}

export interface CashSession {
  id: string;
  store_id: string;
  opening_cash: number;
  expected_cash: number;
  counted_cash: number;
  discrepancy: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface TaxRuleVersion {
  id: string;
  version: string;
  merchant_type: string;
  business_category: string;
  effective_from: string;
  required_fields: Record<string, string>;
  formula_or_validation: Record<string, string>;
  legal_source: string;
  approval_status: string;
}

export interface DashboardStats {
  total_transactions: number;
  reconciliation_rate: number;
  open_exceptions: number;
  tax_ready: boolean;
  matched: number;
  pending: number;
  exceptions: number;
}

export interface ExceptionItem {
  id: string;
  transaction_id: string;
  error_type: string;
  amount: number;
  timestamp: string;
  status: string;
  sender: string;
  note: string;
  ai_suggestion: string;
  confidence: number;
  reasoning: string;
}

export interface TaxReadinessReport {
  rule_version: string;
  effective_from: string;
  legal_source: string;
  ready: boolean;
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  item: string;
  label: string;
  passed: boolean;
  value: string;
  details: string;
}

export interface AgentRun {
  id: string;
  status: string;
  request: string;
  started_at: string;
  completed_at: string | null;
  steps: AgentStep[];
}

export interface AgentStep {
  agent: string;
  tool: string;
  status: string;
  confidence: number;
  timestamp: string;
  duration: string;
  description: string;
}

export interface Case {
  id: string;
  merchant_id: string;
  merchant_name: string;
  period: string;
  status: string;
  assigned_rm: string | null;
  message: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  is_service: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  agent: string;
  tool: string;
  action: string;
  details: string;
}
