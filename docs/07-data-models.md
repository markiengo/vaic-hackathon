# Data Models — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Database schema, canonical ledger
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## ER diagram

```text
merchants ──┬── stores ──┬── devices
            │            │
            │            ├── sales ── sale_lines
            │            │            │
            │            │      payment_intents
            │            │            │
            │      bank_transactions
            │            │
            │   payment_allocations
            │            │
            │      cash_sessions
            │            │
            │       invoices
            │
            ├── users (RM assignment)
            │
            ├── reconciliation_cases ── exceptions
            │
            ├── tax_classifications
            │
            ├── agent_runs ── tool_calls
            │
            └── audit_events

tax_rule_versions (global)
```

*Figure 1: Entity relationship diagram*

## Table definitions

### merchants

```sql
CREATE TABLE merchants (
    id VARCHAR(20) PRIMARY KEY,           -- e.g., M001
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),            -- e.g., salon
    business_category VARCHAR(100),
    tax_id VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Stores merchant profile information.

### stores

```sql
CREATE TABLE stores (
    id VARCHAR(20) PRIMARY KEY,           -- e.g., S001
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Physical store locations for a merchant.

### devices

```sql
CREATE TABLE devices (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., D001
    store_id VARCHAR(20) NOT NULL REFERENCES stores(id),
    name VARCHAR(100),
    device_type VARCHAR(50),              -- e.g., tablet, phone
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Mini POS devices per store.

### users

```sql
CREATE TABLE users (
    id VARCHAR(20) PRIMARY KEY,           -- e.g., U001
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,            -- admin, ops_staff, rm, compliance, merchant
    merchant_id VARCHAR(20) REFERENCES merchants(id),  -- for RM assignment
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** SHB staff and their role assignments.

### products

```sql
CREATE TABLE products (
    id VARCHAR(20) PRIMARY KEY,
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(12,2) NOT NULL,
    is_service BOOLEAN DEFAULT TRUE,      -- salon services vs products
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Product/service catalog for Mini POS.

### sales

```sql
CREATE TABLE sales (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., ORDER-1842
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    store_id VARCHAR(20) NOT NULL REFERENCES stores(id),
    device_id VARCHAR(30) REFERENCES devices(id),
    staff_id VARCHAR(20) REFERENCES users(id),
    gross_amount DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'UNPAID',  -- UNPAID, PARTIAL, PAID, REFUNDED
    invoice_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ISSUED, EXEMPT
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Sales orders from POS or Mini POS.

### sale_lines

```sql
CREATE TABLE sale_lines (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(30) NOT NULL REFERENCES sales(id),
    product_id VARCHAR(20) REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL
);
```

**Purpose:** Line items for each sale.

### payment_intents

```sql
CREATE TABLE payment_intents (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., PAY-A8F21X
    sale_id VARCHAR(30) NOT NULL REFERENCES sales(id),
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, EXPIRED, CANCELLED
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Payment intents with unique references for dynamic QR. See DEC-003, DEC-009.

### bank_transactions

```sql
CREATE TABLE bank_transactions (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., SHB-902194810
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    amount DECIMAL(12,2) NOT NULL,
    sender_name VARCHAR(255),
    sender_account VARCHAR(50),
    raw_note TEXT,                        -- original transfer note
    normalized_note TEXT,                 -- normalized Vietnamese
    ai_interpretation JSONB,              -- {suggested_type, probable_date, confidence}
    transaction_type VARCHAR(50),         -- transfer, cash_deposit, etc.
    source VARCHAR(50) NOT NULL,          -- shb, sepay, csv
    source_id VARCHAR(100),              -- original ID from source
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    transaction_date TIMESTAMPTZ NOT NULL
);
```

**Purpose:** Bank transactions in canonical format. Three-layer note handling: raw_note, normalized_note, ai_interpretation. See FR-RECON-004.

### payment_allocations

```sql
CREATE TABLE payment_allocations (
    id SERIAL PRIMARY KEY,
    bank_transaction_id VARCHAR(30) REFERENCES bank_transactions(id),
    payment_intent_id VARCHAR(30) REFERENCES payment_intents(id),
    sale_id VARCHAR(30) REFERENCES sales(id),
    amount DECIMAL(12,2) NOT NULL,
    allocation_type VARCHAR(20) DEFAULT 'PAYMENT', -- PAYMENT, REFUND, DEPOSIT
    match_method VARCHAR(20),             -- EXACT, FUZZY, MANUAL
    confidence DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Many-to-many allocation between payments and orders. See FR-RECON-005.

### cash_sessions

```sql
CREATE TABLE cash_sessions (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(20) NOT NULL REFERENCES stores(id),
    staff_id VARCHAR(20) REFERENCES users(id),
    opening_cash DECIMAL(12,2) NOT NULL,
    expected_cash DECIMAL(12,2),
    counted_cash DECIMAL(12,2),
    cash_expenses DECIMAL(12,2) DEFAULT 0,
    discrepancy DECIMAL(12,2),
    discrepancy_reason TEXT,
    status VARCHAR(20) DEFAULT 'OPEN',    -- OPEN, CLOSED, RECONCILED
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
```

**Purpose:** Cash session tracking per store per shift. See FR-POS-004.

### invoices

```sql
CREATE TABLE invoices (
    id VARCHAR(30) PRIMARY KEY,
    sale_id VARCHAR(30) REFERENCES sales(id),
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    invoice_number VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    invoice_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ISSUED, CANCELLED
    source VARCHAR(50),                   -- e-invoice provider
    source_id VARCHAR(100),
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** E-invoice records linked to sales.

### reconciliation_cases

```sql
CREATE TABLE reconciliation_cases (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., CASE-001
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    period VARCHAR(10) NOT NULL,          -- e.g., 2026-07
    status VARCHAR(30) DEFAULT 'OPEN',    -- OPEN, WAITING_FOR_CONFIRMATION, RESOLVED, CLOSED
    priority VARCHAR(10) DEFAULT 'MEDIUM',
    assigned_rm_id VARCHAR(20) REFERENCES users(id),
    tax_rule_version VARCHAR(20),
    human_approvals JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Reconciliation cases per merchant per period. See FR-OPS-001.

### exceptions

```sql
CREATE TABLE exceptions (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES reconciliation_cases(id),
    bank_transaction_id VARCHAR(30) REFERENCES bank_transactions(id),
    sale_id VARCHAR(30) REFERENCES sales(id),
    exception_type VARCHAR(30) NOT NULL,  -- AMBIGUOUS_MATCH, NO_MATCH, DUPLICATE_CANDIDATE, MISSING_INVOICE, CASH_DISCREPANCY, INVOICE_MISMATCH
    ai_suggestion JSONB,                  -- {suggested_type, confidence, reasoning}
    human_decision VARCHAR(50),           -- approved, rejected, reclassified
    human_decision_by VARCHAR(20) REFERENCES users(id),
    human_decision_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RESOLVED, ESCALATED
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Individual exceptions within a case. See FR-RECON-003.

### tax_classifications

```sql
CREATE TABLE tax_classifications (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    transaction_id VARCHAR(30),
    classification VARCHAR(50) NOT NULL,  -- revenue, internal_transfer, loan, purchase_payment, other
    classified_by VARCHAR(20),            -- ai, human
    confidence DECIMAL(5,2),
    rule_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Revenue classifications for transactions.

### tax_rule_versions

```sql
CREATE TABLE tax_rule_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) UNIQUE NOT NULL,  -- e.g., 2026.07
    merchant_type VARCHAR(100),
    business_category VARCHAR(100),
    effective_from DATE NOT NULL,
    effective_to DATE,
    required_fields JSONB NOT NULL,
    formula_or_validation JSONB NOT NULL,
    legal_source TEXT NOT NULL,
    approval_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, SUPERSEDED
    approved_by VARCHAR(50),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Versioned tax rules. Immutable once approved. See DEC-004, FR-TAX-002.

### agent_runs

```sql
CREATE TABLE agent_runs (
    id VARCHAR(30) PRIMARY KEY,           -- e.g., RUN-001
    case_id VARCHAR(30) REFERENCES reconciliation_cases(id),
    merchant_id VARCHAR(20) NOT NULL REFERENCES merchants(id),
    user_id VARCHAR(20) REFERENCES users(id),
    request_text TEXT NOT NULL,
    plan JSONB,                           -- planner output
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PLANNING, EXECUTING, WAITING_FOR_HUMAN, COMPLETED, FAILED
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error TEXT
);
```

**Purpose:** Agent run state and plan. See FR-AGENT-001.

### tool_calls

```sql
CREATE TABLE tool_calls (
    id SERIAL PRIMARY KEY,
    agent_run_id VARCHAR(30) NOT NULL REFERENCES agent_runs(id),
    agent_name VARCHAR(50) NOT NULL,      -- planner, reconciliation, tax_compliance, merchant_ops
    tool_name VARCHAR(100) NOT NULL,
    input_hash VARCHAR(64),               -- SHA-256 of input
    output_hash VARCHAR(64),              -- SHA-256 of output
    confidence DECIMAL(5,2),
    rule_version VARCHAR(20),
    called_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INT
);
```

**Purpose:** Individual tool calls by agents. See FR-AGENT-002.

### audit_events

```sql
CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    actor_type VARCHAR(20) NOT NULL,      -- agent, human, system
    actor_id VARCHAR(50) NOT NULL,
    agent_name VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    tool_name VARCHAR(100),
    input_hash VARCHAR(64),
    output_hash VARCHAR(64),
    rule_version VARCHAR(20),
    confidence DECIMAL(5,2),
    approval_status VARCHAR(20),
    merchant_id VARCHAR(20) REFERENCES merchants(id),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Append-only audit log. See DEC-008, FR-AGENT-003. Retention: 7 years.

## Relationships and cascading rules

| Parent | Child | FK | Cascade |
|---|---|---|---|
| merchants | stores | merchant_id | CASCADE DELETE |
| stores | devices | store_id | CASCADE DELETE |
| stores | cash_sessions | store_id | SET NULL |
| merchants | sales | merchant_id | RESTRICT |
| sales | sale_lines | sale_id | CASCADE DELETE |
| sales | payment_intents | sale_id | CASCADE DELETE |
| sales | payment_allocations | sale_id | RESTRICT |
| bank_transactions | payment_allocations | bank_transaction_id | RESTRICT |
| payment_intents | payment_allocations | payment_intent_id | SET NULL |
| merchants | reconciliation_cases | merchant_id | CASCADE DELETE |
| reconciliation_cases | exceptions | case_id | CASCADE DELETE |
| agent_runs | tool_calls | agent_run_id | CASCADE DELETE |

## Indexes

```sql
CREATE INDEX idx_bank_tx_merchant_date ON bank_transactions(merchant_id, transaction_date);
CREATE INDEX idx_bank_tx_source ON bank_transactions(source, source_id);
CREATE INDEX idx_payment_intents_ref ON payment_intents(id) WHERE status = 'PENDING';
CREATE INDEX idx_sales_merchant_status ON sales(merchant_id, payment_status);
CREATE INDEX idx_exceptions_case_status ON exceptions(case_id, status);
CREATE INDEX idx_audit_events_merchant_time ON audit_events(merchant_id, timestamp);
CREATE INDEX idx_agent_runs_case ON agent_runs(case_id);
CREATE INDEX idx_tool_calls_run ON tool_calls(agent_run_id);
```

## Migration strategy

- **Tool:** Alembic
- **Workflow:** Create migration → run locally → verify → commit
- **Rollback:** Every migration has a downgrade function
- **Seed data:** Separate migration for demo dataset (1 salon, 30 orders, etc.)

## Verification

### Automated

- `cd backend && alembic upgrade head` — migrations apply cleanly
- `cd backend && python -m pytest tests/test_models.py -v` — model tests pass
- `pg_dump --schema-only` — schema matches DDL above

### Manual

- ER diagram matches table definitions
- Every table has a purpose statement
- Cascade rules are verified by deletion test

---

*Last updated: 2026-07-17*
