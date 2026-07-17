# Business Requirements — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Business context

Vietnamese household businesses (hộ kinh doanh) and micro-enterprises have fragmented financial data: POS orders, bank transfers, cash sessions, and e-invoices exist in separate systems with no automatic reconciliation. SHB bank staff manually check hundreds of transactions to verify merchant revenue readiness for tax processes. This is slow, error-prone, and does not scale.

KHỚP is a multi-agent AI system that connects SHB transaction data with POS, sales files, cash, and e-invoices; automatically reconciles payments; detects discrepancies; and coordinates human handling of ambiguous cases. It does not replace MISA, KiotViet, or accounting software — it is a connection and control layer that produces clean, auditable data ready for existing tax processes.

## Business model

KHỚP creates value for SHB by:

1. **Increasing merchant stickiness** — SHB account becomes the operational financial hub, not just a place to receive money.
2. **Reducing manual support workload** — Staff no longer download statements, compare Excel files, and call customers repeatedly.
3. **Improving merchant data quality** — SHB understands verified business cash flow, not just isolated transaction lines.
4. **Enabling new products** — A clean revenue ledger supports future accounting integrations, invoice reminders, cash flow assessment, and working capital products.

**Revenue model (post-pilot):** B2B SaaS priced per merchant per month, with integration services for SHB. Potential bundling with SHB merchant banking packages.

## Core business requirements

| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| BR-001 | Connect SHB transaction data with POS, cash, and invoice sources through adapters | High | Without unified data, reconciliation is impossible |
| BR-002 | Automatically reconcile payments to orders using payment references | High | Manual matching is the primary time sink |
| BR-003 | Fuzzy match transactions without references using candidate scoring | High | Legacy and external transactions lack references |
| BR-004 | Surface only exceptions for human review, not all transactions | High | Staff cannot review hundreds of transactions manually |
| BR-005 | Never auto-resolve ambiguous transactions below confidence threshold | High | Financial data requires human approval for risky decisions |
| BR-006 | Validate data against versioned tax rules and produce tax-readiness report | High | Merchants need to know if data is ready for tax process |
| BR-007 | Create cases and assign tasks to RM for unresolved exceptions | Medium | Operational follow-up requires structured workflow |
| BR-008 | Export clean data to accounting systems (MISA or standard format) | Medium | KHỚP does not replace accounting; it feeds it |
| BR-009 | Audit every agent action, tool call, and human approval | High | Banking operations require full traceability |
| BR-010 | Support dynamic QR with payment reference for deterministic matching | High | Static QR causes ambiguity with same-amount payments |
| BR-011 | Provide Mini POS for merchants without POS systems | Medium | Some target merchants use Excel or manual recording |
| BR-012 | Reconcile cash sessions at shift end | Medium | Cash is a significant payment method for target merchants |
| BR-013 | AI interprets Vietnamese transfer notes (with/without diacritics, abbreviations) | High | Transfer notes are the primary ambiguity source |
| BR-014 | Do not use LLM for tax calculations, exact matching, or duplicate detection | High | Deterministic operations must be reproducible and auditable |
| BR-015 | Display agent trace showing planner decomposition, tool calls, and decisions | Medium | Transparency builds trust; required for compliance |

## Constraints

- **No production SHB API access** for hackathon — sandbox or mock only
- **No production invoice issuance** — mock provider only
- **No real tax filing** — draft export only
- **48-hour build window** for hackathon MVP
- **Vietnamese language** for all user-facing content
- **Financial data sensitivity** — encryption, masking, RBAC required
- **No model lock-in** — LLM provider abstraction layer
- **Data residency** — must be deployable in VPC if required by SHB

## Success metrics

| Metric | Target | Measurement method |
|---|---|---|
| Auto-reconciliation rate | ≥80% of demo transactions matched without human | Count auto-matched vs total in demo dataset |
| Exception reduction | ≥80% reduction in manual review items | Compare raw count vs exception count |
| Traceability | 100% of agent decisions have tool call, confidence, audit record | Query audit_events table |
| Action completion | Planner completes workflow with ≥3 specialist agents and ≥2 write actions | Agent run log |
| Workflow latency (initial) | <5 seconds for initial status response | API timing |
| Full case completion | <30 seconds on demo data | End-to-end timing |
| Auto-match accuracy (with reference) | ≥95% for transactions with valid reference | Validate matches against truth set |
| Pilot reconciliation time reduction | ≥50% reduction per merchant | Compare before/after timing |

## Scope boundaries

- **In scope:** Multi-agent reconciliation, exception management, tax-readiness reporting, Mini POS, dynamic QR, audit logging, agent trace UI, sandbox integrations
- **Out of scope:** Real tax filing, production invoice issuance, production MISA/KiotViet integration, full POS, credit scoring, loan decisions, mobile merchant app, multi-vertical support (MVP is salon only)

## Verification

### Automated

- N/A — business document

### Manual

- Review with stakeholders: every BR has acknowledged owner
- Every success metric has a measurement method
- Scope boundaries match product.md §17 (MVP) and §22 (pilot roadmap)

---

*Last updated: 2026-07-17*
