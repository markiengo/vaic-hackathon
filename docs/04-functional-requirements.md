# Functional Requirements — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Reconciliation

### FR-RECON-001: Exact matching by payment reference

**Description:** The system automatically matches bank transactions to sales orders when a valid payment reference exists, the amount matches, the order is unpaid, and the transaction has not been used for another allocation.

**Acceptance criteria:**
- [ ] Transaction with valid reference and matching amount is auto-matched to the correct order
- [ ] Transaction with valid reference but mismatched amount is not auto-matched
- [ ] Transaction referencing an already-paid order is not matched
- [ ] Transaction already allocated to another order is not matched again
- [ ] Match result includes confidence score of 100% for exact matches

**Business rules:**
- Reference must exist in payment_intents table and be non-expired
- Amount must match exactly (no tolerance for exact match)
- Order payment_status must be `UNPAID` or `PARTIAL`

**Edge cases:**
- Invalid input: Malformed reference → no match, log as unmatched
- Empty state: No transactions → return 0 matched, 0 unmatched
- Permission denied: User without merchant access → 403

**Traces to:** BR-002, USR-RECON-001

---

### FR-RECON-002: Candidate matching without reference

**Description:** When no payment reference exists, the system generates candidate matches based on merchant, amount proximity, time window, order status, sender name familiarity, and transfer note content. Each candidate receives a match score.

**Acceptance criteria:**
- [ ] Candidates are generated only for the same merchant and store
- [ ] Score uses weighted factors: exact amount (+50), time <1min (+20), reference/match (+20), familiar sender (+10), multiple same-amount orders (-30)
- [ ] Score ≥95%: auto-matched
- [ ] Score 75–94%: placed in Exception Inbox for human confirmation
- [ ] Score <75%: marked as `UNMATCHED`
- [ ] Already-used transactions are excluded from candidates

**Business rules:**
- Scoring weights are configurable in tax_rule_versions (see `ALGORITHM.md`)
- Time window default: 60 minutes
- Amount proximity: exact match only for MVP (no tolerance)

**Edge cases:**
- Two identical orders and no identifier → mandatory exception (no guess)
- No candidates found → transaction marked `UNMATCHED`
- Multiple candidates with same score → exception created

**Traces to:** BR-003, USR-RECON-002

---

### FR-RECON-003: Exception Inbox

**Description:** The system displays only transactions requiring human decisions, not the full transaction list. Each exception shows amount, sender, transfer note, AI suggestion, confidence, and reasoning.

**Acceptance criteria:**
- [ ] Only items with confidence <95% or flagged as ambiguous appear in Inbox
- [ ] Each exception displays: amount, sender, raw note, normalized note, AI suggestion, confidence %, reasoning factors
- [ ] User can approve, reject, or reclassify each exception
- [ ] User decision is logged in audit_events
- [ ] Resolved exceptions disappear from Inbox
- [ ] Inbox supports filtering by merchant, period, and exception type

**Business rules:**
- Exceptions are created by Reconciliation Agent when auto-match fails
- Exception types: `AMBIGUOUS_MATCH`, `NO_MATCH`, `DUPLICATE_CANDIDATE`, `MISSING_INVOICE`, `CASH_DISCREPANCY`

**Edge cases:**
- Empty state: No exceptions → show "All transactions reconciled" message
- Permission denied: User without merchant access → 403

**Traces to:** BR-004, BR-005, USR-RECON-003

---

### FR-RECON-004: AI suggestion with confidence and reasoning

**Description:** For each exception, the AI provides a suggested classification with confidence score and human-readable reasoning explaining the factors that influenced the suggestion.

**Acceptance criteria:**
- [ ] Suggestion includes: suggested_type (e.g., `internal_transfer`, `revenue`, `loan`, `other`), confidence (0.0–1.0), and reasoning array
- [ ] Reasoning lists specific evidence: sender name match, amount match, historical pattern, note interpretation
- [ ] AI interpretation of Vietnamese notes handles diacritics, no-diacritics, and abbreviations
- [ ] Raw note, normalized note, and AI interpretation are stored separately (three layers)
- [ ] Suggestion is never auto-applied for confidence <0.95

**Business rules:**
- AI may not use raw note as the sole identifier or proof
- AI must search for corroborating evidence (invoices, supplier history, prior confirmed transactions)
- If evidence is insufficient, transaction goes to Exception Inbox

**Edge cases:**
- Empty note: AI uses other signals (amount, sender, timing)
- Conflicting evidence: AI presents both possibilities with respective confidence

**Traces to:** BR-013, USR-RECON-004

---

### FR-RECON-005: Payment allocation

**Description:** The system supports allocating a single payment across multiple orders and multiple payments to a single order through a payment_allocations table.

**Acceptance criteria:**
- [ ] One payment can be split across multiple orders
- [ ] Multiple payments can be allocated to one order
- [ ] Allocations must sum to payment amount (no over-allocation)
- [ ] Partial payments are supported (order remains `PARTIAL`)
- [ ] Refunds create negative allocations
- [ ] Deposits and remaining balance are supported

**Business rules:**
- Allocation is many-to-many through payment_allocations table
- Each allocation has amount, order_id, payment_id, and audit trail

**Edge cases:**
- Over-payment: excess amount flagged as exception
- Under-payment: order remains `PARTIAL` status

**Traces to:** BR-002, USR-RECON-005

---

## Tax & Compliance

### FR-TAX-001: Tax-readiness checklist

**Description:** The system displays a checklist showing whether merchant data is ready for tax process, including reconciliation rate, cash session closure, unclassified transactions, and missing invoices.

**Acceptance criteria:**
- [ ] Checklist shows: bank reconciliation %, cash session closure %, unclassified transaction count, orders missing invoice count, current rule version
- [ ] Each item has a pass/fail status with threshold
- [ ] When all items pass, system displays "Data ready for draft export and accounting/tax process"
- [ ] Checklist references the rule version in effect

**Business rules:**
- Reconciliation threshold: ≥95% for "pass"
- Cash session closure: 100% required
- Unclassified transactions: 0 required
- Missing invoices: 0 required

**Edge cases:**
- No data for period: all items show "No data"
- Rule version expired: warning displayed

**Traces to:** BR-006, USR-TAX-001

---

### FR-TAX-002: Rule version in report

**Description:** Every tax-readiness report includes the rule version, effective date, legal source, approver, and generation timestamp.

**Acceptance criteria:**
- [ ] Report header includes: rule_version (e.g., `2026.07`), effective_from, effective_to, legal_source, approved_by, generated_at
- [ ] Report is reproducible: same data + same rule version = same output
- [ ] LLM does not compute tax formulas; it only retrieves and explains rules

**Business rules:**
- Tax Rules Engine is deterministic and separate from LLM (see DEC-004)
- Rule versions are immutable once approved

**Edge cases:**
- Rule version not found: error, no report generated
- Data spans multiple rule versions: report uses version in effect at period end

**Traces to:** BR-006, BR-014, USR-TAX-002

---

### FR-TAX-003: Missing invoice detection

**Description:** The system detects orders that have been paid but do not have a corresponding invoice.

**Acceptance criteria:**
- [ ] Paid orders (payment_status = `PAID`) without linked invoice are flagged
- [ ] Flagged orders appear in Exception Inbox as `MISSING_INVOICE` type
- [ ] Count of missing invoices appears in tax-readiness checklist

**Business rules:**
- Invoice linkage is through order_id reference in invoices table
- Orders with `invoice_status = EXEMPT` are not flagged

**Edge cases:**
- Invoice exists but is for wrong amount: flagged as `INVOICE_MISMATCH`
- No invoice system connected: all paid orders flagged (warning)

**Traces to:** BR-006, USR-TAX-003

---

### FR-TAX-004: Draft export

**Description:** The system exports clean, reconciled data in a standard format suitable for import into MISA or other accounting systems.

**Acceptance criteria:**
- [ ] Export includes: merchant info, period, reconciled transactions, sales, allocations, tax classifications
- [ ] Export format: JSON and CSV
- [ ] Export includes rule version and generation timestamp
- [ ] Export excludes unresolved exceptions
- [ ] Export is downloadable from UI

**Business rules:**
- Only data from merchants with tax-readiness "pass" status can be exported
- Export is a draft, not a tax filing

**Edge cases:**
- No reconciled data: empty export with header
- Partial readiness: export blocked with explanation

**Traces to:** BR-008, USR-TAX-004

---

## Merchant Operations

### FR-OPS-001: Case creation

**Description:** The Merchant Operations Agent creates cases for unresolved exceptions with merchant, period, issue type, and priority.

**Acceptance criteria:**
- [ ] Case is created for each unresolved exception after reconciliation
- [ ] Case includes: case_id, merchant_id, period, exception references, status, priority
- [ ] Case status starts as `OPEN`
- [ ] Case is visible in SHB case-management UI (or mock)

**Business rules:**
- One case per merchant per period for batch exceptions
- Individual high-priority exceptions may get separate cases

**Edge cases:**
- No exceptions: no cases created
- Case management API unavailable: cases stored locally with sync flag

**Traces to:** BR-007, USR-OPS-001

---

### FR-OPS-002: Draft merchant message

**Description:** The AI drafts a message in Vietnamese asking the merchant to confirm a transaction classification.

**Acceptance criteria:**
- [ ] Message is in Vietnamese
- [ ] Message includes: transaction amount, sender, date, AI suggestion, and a clear question
- [ ] Message is saved as draft; not sent without RM review
- [ ] RM can edit message before sending
- [ ] Message includes confirmation link (if applicable)

**Business rules:**
- Message tone: polite, simple, non-technical
- Message must not include internal system IDs or agent names

**Edge cases:**
- Merchant has no contact info: case flagged for phone follow-up
- Multiple exceptions for same merchant: consolidated message

**Traces to:** BR-007, USR-OPS-002

---

### FR-OPS-003: RM assignment

**Description:** The system assigns cases to the appropriate Relationship Manager based on merchant assignment.

**Acceptance criteria:**
- [ ] Case is assigned to RM mapped to the merchant
- [ ] Assignment is visible in case details
- [ ] RM receives notification (in MVP: dashboard notification)
- [ ] Unassigned merchants: case assigned to default queue

**Business rules:**
- RM-merchant mapping is maintained in users/merchants relationship
- Reassignment requires manager approval

**Edge cases:**
- RM inactive: case reassigned to backup RM
- No RM mapping: default queue

**Traces to:** BR-007, USR-OPS-003

---

## Mini POS & Payments

### FR-POS-001: Mini POS sale creation

**Description:** A minimal POS interface allows staff to select products/services, adjust quantities, calculate total, and create a sale order.

**Acceptance criteria:**
- [ ] Staff can select product or service from catalog
- [ ] Staff can adjust quantity
- [ ] System calculates gross_amount, discount, and net_amount
- [ ] Sale record includes: sale_id, merchant_id, store_id, device_id, staff_id, created_at, items, gross_amount, discount, net_amount, payment_status, invoice_status
- [ ] Staff can choose `Cash` or `Generate QR` for payment
- [ ] Cancel/refund creates audit log entry

**Business rules:**
- Mini POS is not a full POS: no CRM, attendance, marketing, loyalty, HR, advanced purchasing, or production modules
- Sale creation is idempotent (same request does not create duplicate)

**Edge cases:**
- Empty catalog: staff can enter custom item with name and price
- Network offline: sale cached locally, synced when online (post-MVP)

**Traces to:** BR-011, USR-POS-001

---

### FR-POS-002: Dynamic QR generation

**Description:** The system generates a dynamic QR code containing the merchant account, amount, and a unique payment reference for each payment intent.

**Acceptance criteria:**
- [ ] QR contains: SHB merchant account, exact amount, payment_reference (e.g., `PAY-X7K92P`)
- [ ] Payment intent expires after 15 minutes
- [ ] QR is displayed on screen for customer to scan
- [ ] Webhook from bank/SePay matching the reference auto-updates order status to `PAID`
- [ ] Expired QR: payment intent marked `EXPIRED`, no match accepted

**Business rules:**
- Reference format: `PAY-` + 6 alphanumeric characters
- Reference is unique per payment intent
- One reference per order per payment attempt

**Edge cases:**
- Customer pays after expiry: transaction goes to fuzzy matching
- Multiple scans: same QR shown; first webhook wins

**Traces to:** BR-010, USR-POS-002

---

### FR-POS-003: Cash payment recording

**Description:** Staff can record a cash payment with a single tap, linking it to the current sale order.

**Acceptance criteria:**
- [ ] Cash payment creates a cash_session entry or appends to active session
- [ ] Order payment_status updates to `PAID`
- [ ] Cash entry includes: amount, staff_id, timestamp, sale_id
- [ ] Cash session tracks: opening_cash, expected_cash, counted_cash, discrepancy

**Business rules:**
- Cash session is per store per shift
- Only one active cash session per store

**Edge cases:**
- No active session: system creates one automatically
- Amount mismatch with order: flagged for review

**Traces to:** BR-012, USR-POS-003

---

### FR-POS-004: Cash reconciliation at shift end

**Description:** At shift end, the system compares expected cash (opening + sales - expenses) with counted cash and reports any discrepancy.

**Acceptance criteria:**
- [ ] System displays: opening cash, cash revenue per POS, cash expenses, expected cash, counted cash (input), discrepancy
- [ ] Discrepancy >0 or <0 is flagged
- [ ] Staff must provide a reason for discrepancy
- [ ] Cash session is closed and locked after reconciliation
- [ ] Discrepancy appears in tax-readiness checklist if unresolved

**Business rules:**
- System cannot determine which specific cash transaction is missing if staff didn't create an order
- Discrepancy reason is logged in audit_events

**Edge cases:**
- Counted cash not entered: session remains open
- Discrepancy = 0: session closes cleanly

**Traces to:** BR-012, USR-POS-004

---

## Agent Orchestration & Trace

### FR-AGENT-001: Natural language request to Planner

**Description:** The user types a natural language request (e.g., "Check if Salon Hoa is ready for July reporting"), and the Planner Agent decomposes it into a multi-step execution plan.

**Acceptance criteria:**
- [ ] Planner accepts Vietnamese or English input
- [ ] Planner generates a plan with numbered steps and dependencies
- [ ] Plan includes: fetch merchant profile, fetch transactions, fetch orders/cash, reconcile, check invoices, run tax rules, create exceptions, open cases, draft report
- [ ] Plan is visible to user before execution
- [ ] Planner delegates each step to the appropriate specialist agent
- [ ] Planner does not perform detailed classification or data correction itself

**Business rules:**
- Planner may only delegate; it may not call specialist tools directly
- Plan state is persisted in agent_runs table

**Edge cases:**
- Ambiguous request: Planner asks for clarification
- Missing merchant: Planner returns error with suggestion

**Traces to:** BR-001, USR-AGENT-001

---

### FR-AGENT-002: Agent trace display

**Description:** The system displays a full trace of agent actions including planner decomposition, agent assignments, tool calls, data accessed, decisions, confidence scores, rule versions, and human approval steps.

**Acceptance criteria:**
- [ ] Trace shows: plan steps, which agent executed each step, which tools were called, input/output hashes, confidence, rule version, timestamp
- [ ] Trace indicates which steps are waiting for human approval
- [ ] Trace is visible in real-time during execution
- [ ] Trace is persisted and viewable after completion
- [ ] Trace is linked to audit_events records

**Business rules:**
- Trace data comes from agent_runs and tool_calls tables
- Trace is read-only after agent run completes

**Edge cases:**
- Agent run failed: trace shows failure point and error
- No agent runs: empty trace view

**Traces to:** BR-015, USR-AGENT-002

---

### FR-AGENT-003: Audit log export

**Description:** The system exports the full audit log as JSON or CSV.

**Acceptance criteria:**
- [ ] Export includes all audit_events for a specified merchant and period
- [ ] Export fields: actor_type, actor_id, agent_name, action, tool_name, input_hash, output_hash, rule_version, confidence, approval_status, timestamp
- [ ] JSON export is valid JSON
- [ ] CSV export is valid CSV with headers
- [ ] Export is downloadable from UI

**Business rules:**
- Audit events are append-only; export reflects all events
- Export requires compliance or admin role

**Edge cases:**
- No events: empty export with headers only
- Large export: pagination or streaming (post-MVP)

**Traces to:** BR-009, USR-AGENT-003

---

## Merchant Confirmation

### FR-MERCHANT-001: Transaction confirmation link

**Description:** A merchant receives a link to confirm or correct a transaction classification without accessing SHB internal systems.

**Acceptance criteria:**
- [ ] Link displays: transaction amount, sender, date, AI suggestion, and options (confirm/correct)
- [ ] Merchant can select from suggested classifications or provide their own
- [ ] Merchant response is logged in audit_events
- [ ] Link expires after 7 days
- [ ] Link does not require SHB login

**Business rules:**
- Link is token-based, not session-based
- One link per exception
- Response updates exception status and may close the case

**Edge cases:**
- Expired link: "Link expired, please contact your RM"
- Already responded: "Already confirmed"
- Invalid token: "Invalid link"

**Traces to:** BR-004, BR-005, USR-MERCHANT-001

---

## Data Ingestion

### FR-DATA-001: Canonical Event Ledger ingestion

**Description:** All data sources are normalized into the Canonical Event Ledger through adapters.

**Acceptance criteria:**
- [ ] SHB transactions are ingested via SHB adapter (sandbox/mock)
- [ ] POS orders are ingested via POS adapter or Mini POS
- [ ] Cash sessions are ingested from Mini POS cash entries
- [ ] Invoices are ingested via invoice adapter (mock)
- [ ] CSV/Excel import is supported for legacy data
- [ ] Each ingested record has a source, source_id, and ingestion timestamp
- [ ] Duplicate source records are detected and skipped

**Business rules:**
- Adapters map external schemas to canonical schema (see `10-integration.md`)
- Ingestion is idempotent: same source record ingested twice does not create duplicate

**Edge cases:**
- Malformed source data: logged and skipped with error record
- Adapter unavailable: ingestion queued for retry

**Traces to:** BR-001

---

## Verification

### Automated

- `pytest tests/test_reconciliation.py -v` — verifies matching logic
- `pytest tests/test_tax_rules.py -v` — verifies tax-readiness checks
- `pytest tests/test_agents.py -v` — verifies agent orchestration
- `pytest tests/test_audit.py -v` — verifies audit log export

### Manual

- Create sale in Mini POS → generate QR → simulate webhook → verify auto-match
- Create ambiguous transaction → verify it appears in Exception Inbox
- Run tax-readiness check → verify checklist and rule version
- Export audit log → verify JSON and CSV format

### Evidence

- Agent trace screenshot showing planner decomposition and tool calls
- Audit log export file

---

*Last updated: 2026-07-17*
