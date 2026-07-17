# User Stories — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Epic 1: Reconciliation

### USR-RECON-001 — Auto-match with payment reference

**As a** SHB operations staff member (Linh),
**I want** transactions with valid payment references to be automatically matched to orders,
**so that** I don't have to manually check standard transactions.

**Priority:** Must
**Traces to:** BR-002, FR-RECON-001

---

### USR-RECON-002 — Fuzzy match without reference

**As a** SHB operations staff member (Linh),
**I want** transactions without references to be matched using candidate scoring,
**so that** legacy and external transactions are still reconciled.

**Priority:** Must
**Traces to:** BR-003, FR-RECON-002

---

### USR-RECON-003 — Exception Inbox for ambiguous transactions

**As a** SHB operations staff member (Linh),
**I want** to see only transactions that need my decision,
**so that** I can focus on what matters instead of reviewing everything.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

---

### USR-RECON-004 — AI suggestion with confidence and reasoning

**As a** SHB operations staff member (Linh),
**I want** AI to suggest a classification with confidence score and reasoning,
**so that** I can make an informed decision quickly.

**Priority:** Must
**Traces to:** BR-013, FR-RECON-004

---

### USR-RECON-005 — Payment allocation across multiple orders

**As a** SHB operations staff member (Linh),
**I want** a single payment to be allocated across multiple orders,
**so that** partial payments and combined payments are handled correctly.

**Priority:** Should
**Traces to:** BR-002, FR-RECON-005

---

## Epic 2: Tax & Compliance

### USR-TAX-001 — Tax-readiness checklist

**As a** SHB compliance specialist (Hà),
**I want** a checklist showing whether data is ready for tax process,
**so that** I can tell if a merchant can proceed to filing.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-001

---

### USR-TAX-002 — Rule version in every report

**As a** SHB compliance specialist (Hà),
**I want** every tax-readiness report to show the rule version and effective date,
**so that** I can verify the correct rules were applied.

**Priority:** Must
**Traces to:** BR-006, BR-014, FR-TAX-002

---

### USR-TAX-003 — Detect missing invoices

**As a** SHB operations staff member (Linh),
**I want** the system to flag orders that have been paid but lack invoices,
**so that** I can follow up before tax season.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-003

---

### USR-TAX-004 — Draft export to accounting system

**As a** SHB operations staff member (Linh),
**I want** to export clean data in a standard format,
**so that** it can be imported into MISA or another accounting system.

**Priority:** Should
**Traces to:** BR-008, FR-TAX-004

---

## Epic 3: Merchant Operations

### USR-OPS-001 — Create case for unresolved exceptions

**As a** SHB RM (Phong),
**I want** cases to be created automatically for unresolved exceptions,
**so that** I can track and follow up on each issue.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-001

---

### USR-OPS-002 — Draft message to merchant

**As a** SHB RM (Phong),
**I want** AI to draft a message asking the merchant to confirm a transaction,
**so that** I can send it quickly without composing from scratch.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-002

---

### USR-OPS-003 — Assign task to RM

**As a** SHB operations staff member (Linh),
**I want** exceptions to be assigned to the right RM automatically,
**so that** follow-up happens without manual routing.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-003

---

## Epic 4: Mini POS & Payments

### USR-POS-001 — Create sale with Mini POS

**As a** salon staff member,
**I want** to select services and create a sale order,
**so that** each transaction has a record even without a full POS.

**Priority:** Must
**Traces to:** BR-011, FR-POS-001

---

### USR-POS-002 — Generate dynamic QR for payment

**As a** salon staff member,
**I want** to generate a QR code with amount and reference pre-filled,
**so that** the customer's transfer is automatically matched to the order.

**Priority:** Must
**Traces to:** BR-010, FR-POS-002

---

### USR-POS-003 — Record cash payment

**As a** salon staff member,
**I want** to record a cash payment with one tap,
**so that** cash transactions are tracked without manual entry.

**Priority:** Must
**Traces to:** BR-012, FR-POS-003

---

### USR-POS-004 — Cash reconciliation at shift end

**As a** salon owner (Hương),
**I want** the system to compare expected cash with counted cash at shift end,
**so that** discrepancies are caught immediately.

**Priority:** Should
**Traces to:** BR-012, FR-POS-004

---

## Epic 5: Agent Orchestration & Trace

### USR-AGENT-001 — Natural language request to Planner

**As a** SHB operations staff member (Linh),
**I want** to type a natural language request like "Check if Salon Hoa is ready for July reporting",
**so that** I don't have to navigate multiple menus.

**Priority:** Must
**Traces to:** BR-001, FR-AGENT-001

---

### USR-AGENT-002 — View agent trace

**As a** SHB operations staff member (Linh),
**I want** to see which agent did what, called which tools, and with what confidence,
**so that** I can trust the system's decisions.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

---

### USR-AGENT-003 — Export audit log

**As a** SHB compliance specialist (Hà),
**I want** to export the full audit log as JSON or CSV,
**so that** I can provide evidence to auditors.

**Priority:** Must
**Traces to:** BR-009, FR-AGENT-003

---

## Epic 6: Merchant Confirmation

### USR-MERCHANT-001 — Confirm transaction classification

**As a** salon owner (Hương),
**I want** to receive a simple link to confirm what a transaction was for,
**so that** I don't have to call the bank or use complex systems.

**Priority:** Should
**Traces to:** BR-004, BR-005, FR-MERCHANT-001

---

## Verification

### Automated

- N/A — user story document

### Manual

- Every story has a unique ID ✓
- Every story has a priority ✓
- Every story traces to at least one BR and one FR ✓
- Stories are grouped by epic ✓

---

*Last updated: 2026-07-17*
