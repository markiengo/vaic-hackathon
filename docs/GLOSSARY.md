# Glossary — KHỚP

> **Status:** Canonical
> **Authority:** Informative
> **Owner:** PM
> **Applies to:** All KHỚP documentation
> **Implementation state:** Current
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Term definitions (alphabetical)

| Term | Definition |
|---|---|
| Adapter | A module that converts data from an external source (SHB, SePay, POS, CSV) into the Canonical Event Ledger schema |
| Agent | An AI-powered component with a specific role, tool allowlist, and output schema |
| Agent run | A single execution of a multi-agent workflow, tracked in agent_runs table |
| Agent trace | A visual timeline showing planner decomposition, agent assignments, tool calls, and decisions |
| Allocation | The assignment of a payment amount to one or more orders via payment_allocations |
| Audit event | An append-only record of an agent or human action, stored in audit_events |
| Canonical Event Ledger | The unified database schema into which all source data is normalized |
| Candidate matching | Probabilistic matching of transactions to orders using weighted scoring factors |
| Cash session | A per-store, per-shift record of cash transactions with opening, expected, and counted amounts |
| Case | A structured workflow item for unresolved exceptions, tracked in reconciliation_cases |
| Confidence score | A 0.0–1.0 value indicating how certain the AI is about a suggestion |
| Đối soát | Reconciliation — the process of matching transactions to orders |
| Dynamic QR | A QR code generated per payment intent containing amount and payment reference |
| Exception | A transaction or order that requires human decision, displayed in Exception Inbox |
| Exact matching | Deterministic matching using payment reference, amount, and order status |
| Hóa đơn | Invoice — an electronic tax invoice issued for a sale |
| Hộ kinh doanh | Household business — a Vietnamese business registration type for small businesses |
| Kê khai | Tax declaration/filing — the process of submitting tax reports |
| Match score | A weighted score (0–100) for candidate matching, computed from multiple factors |
| Mini POS | A minimal point-of-sale interface for creating sales and generating QR codes |
| MCP | Model Context Protocol — a standard for connecting AI systems with external tools |
| Payment intent | A record of an expected payment with a unique reference, amount, and expiry |
| Payment reference | A system-generated unique code (e.g., PAY-A8F21X) linking orders to bank transactions |
| Planner Agent | The agent that decomposes requests and delegates to specialist agents |
| RAG | Retrieval-Augmented Generation — querying a vector database for relevant context |
| Reconciliation | The process of matching bank transactions, cash, and invoices to sales orders |
| Reconciliation Agent | The specialist agent responsible for matching and exception creation |
| RM | Relationship Manager — SHB staff member who manages merchant relationships |
| Rule version | A versioned set of tax rules (e.g., 2026.07), immutable once approved |
| SHB | Saigon-Hanoi Bank — the bank partner for KHỚP |
| Specialist agent | One of three agents: Reconciliation, Tax & Compliance, or Merchant Operations |
| Tax-readiness | The state where all data is complete, consistent, and ready for tax process |
| Tax-readiness report | A report showing checklist items with pass/fail status and rule version |
| Tax Rules Engine | A deterministic service that validates data against versioned tax rules |
| Three-layer note handling | Storing raw_note, normalized_note, and ai_interpretation separately |
| Tool allowlist | The set of tools an agent is permitted to call; enforced at tool layer |
| Tool call | A single invocation of a tool by an agent, logged in tool_calls table |

## Acronyms and abbreviations

| Acronym | Expansion |
|---|---|
| COD | Cash on Delivery |
| CSV | Comma-Separated Values |
| JWT | JSON Web Token |
| MCP | Model Context Protocol |
| NFR | Non-Functional Requirement |
| ORM | Object-Relational Mapping |
| POS | Point of Sale |
| QR | Quick Response (code) |
| RBAC | Role-Based Access Control |
| RAG | Retrieval-Augmented Generation |
| RM | Relationship Manager |
| RLS | Row-Level Security |
| SHB | Saigon-Hanoi Bank (Ngân hàng Sài Gòn – Hà Nội) |
| SSR | Server-Side Rendering |
| TLS | Transport Layer Security |
| TDE | Transparent Data Encryption |
| VPC | Virtual Private Cloud |

## Domain-specific concepts with examples

### Payment reference linkage

```text
POS order_id:        ORDER-1842
    ↓ create payment intent
Payment reference:   PAY-A8F21X
    ↓ embed in dynamic QR
Customer transfers money
    ↓ webhook receives note with PAY-A8F21X
Bank transaction_id: SHB-902194810
```

All three IDs are stored and linked through `payment_reference`.

### Three-layer note handling

```json
{
  "raw_note": "nhap hang 20/10",
  "normalized_note": "nhập hàng 20/10",
  "ai_interpretation": {
    "suggested_type": "purchase_payment",
    "probable_date": "20/10",
    "confidence": 0.62
  }
}
```

### Match scoring example

```text
Transaction: 350,000₫, no reference, 2 minutes after order

Score:
  Amount match:        +50
  Time <5 min:         +10
  No reference:         +0
  Familiar sender:      +0
  No same-amount:       +0
  ────────────────────────
  Total:               60 → UNMATCHED (<75)
```

## Verification

### Automated

- `grep -r "đối soát\|hóa đơn\|kê khai\|hộ kinh doanh" docs/` — verify Vietnamese terms are in glossary

### Manual

- Review glossary with team — every term used in docs is defined
- Verify definitions are concise (1-2 sentences)

---

*Last updated: 2026-07-17*
