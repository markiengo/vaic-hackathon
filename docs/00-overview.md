# KHỚP — Merchant TaxOps Agents for SHB

> KHỚP is a multi-agent AI system that helps SHB bank reconcile merchant transactions, orders, cash, and invoices into a clean, auditable revenue ledger ready for tax processes.

## Business context

Vietnamese household businesses (hộ kinh doanh) have fragmented financial data across POS, bank transfers, cash, and e-invoices. No single system reconciles these sources automatically. SHB staff spend significant time manually checking transactions. KHỚP automates reconciliation, surfaces only exceptions for human review, and produces tax-ready data exports.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js + TypeScript | 14+ |
| Backend | FastAPI (Python) | 0.110+ |
| Database | PostgreSQL + pgvector | 16+ |
| Agent orchestration | LangGraph | latest |
| Tool protocol | MCP or typed function calling | — |
| LLM | Provider abstraction (no lock-in) | — |
| Queue | Redis + background worker | 7+ |
| Deployment | Docker | — |

## Scope

### MVP / Current phase (Hackathon)

- 1 salon merchant, 1 store
- 30 orders, 20 bank transfers, 8 cash payments
- 2 non-revenue transactions, 2 ambiguous same-amount, 1 refund
- 2 orders missing invoices, 1 cash discrepancy
- SHB sandbox/mock API, SePay sandbox, Mini POS, invoice mock, mock case-management API
- Tax Rules Engine with versioned rules
- Dynamic QR with payment reference
- Exact + fuzzy matching
- Exception Inbox with human confirmation
- Tax-readiness report
- Agent trace + audit log export

### Out of scope (MVP)

- Real tax filing or submission
- Production invoice issuance
- Production MISA or KiotViet integration
- Full POS system
- Credit scoring or loan decisions
- Mobile app for merchants
- Multi-vertical support beyond salon

## Document map

| Document | Purpose | Audience | Owner | Authority | Status | Written |
|---|---|---|---|---|---|---|
| `00-overview.md` | Executive summary | All | Project Lead | Normative | Canonical | Phase 1 |
| `AGENTS.md` | Agent operating rules | AI agents, devs | Project Lead | Normative | Canonical | Phase 1 |
| `DECISIONS.md` | Decision register | All | Project Lead | Normative | Canonical | Phase 1 |
| `01-business-requirements.md` | Business context, model | PM, stakeholders | PM | Normative | Canonical | Phase 1 |
| `02-stakeholders-and-personas.md` | Personas | PM, design | PM | Normative | Canonical | Phase 1 |
| `03-user-stories.md` | User stories | PM, eng | PM | Normative | Canonical | Phase 1 |
| `04-functional-requirements.md` | Feature contract | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `05-non-functional-requirements.md` | NFRs | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `06-system-architecture.md` | Architecture | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `07-data-models.md` | Data schema | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `08-api-specifications.md` | API endpoints | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `09-permissions-matrix.md` | RBAC | Eng, security | Security Lead | Normative | Canonical | Phase 2 |
| `10-integration.md` | External integrations | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `11-security.md` | Security contract | Eng, security | Security Lead | Normative | Canonical | Phase 2 |
| `12-error-codes.md` | Error catalog | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `13-environment-setup.md` | Setup guide | New devs | DevOps | Informative | Canonical | Phase 3 |
| `testing-spec.md` | Verification | Eng, QA | QA Lead | Normative | Canonical | Phase 2 |
| `DESIGN.md` | UI specification | Design, frontend | Design Lead | Normative | Canonical | Phase 3 |
| `IMPLEMENTATION-PLAN.md` | Implementation order | Eng | Tech Lead | Normative | Draft | Phase 3 |
| `15-roadmap.md` | Roadmap | PM, eng | Tech Lead | Normative | Draft | Phase 3 |
| `AI-ADVISOR.md` | AI agent spec | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `ALGORITHM.md` | Matching algorithm | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `EVALUATION.md` | AI evaluation | Eng, QA | QA Lead | Normative | Canonical | Phase 2 |
| `GLOSSARY.md` | Domain vocabulary | All | PM | Informative | Canonical | Phase 1 |
| `COMPLIANCE.md` | Tax compliance | Eng, compliance | Compliance Lead | Normative | Canonical | Phase 2 |

## Source-of-truth hierarchy

1. **Latest owner-approved decision** — a decision in `DECISIONS.md` with `Status: Accepted`
2. **Locked decision register** — `DECISIONS.md`
3. **Current canonical product contract** — the normative specification for the area
4. **Domain-specific specification** — `AI-ADVISOR.md`, `ALGORITHM.md`, `COMPLIANCE.md`
5. **Executable schemas and tests** — migration files, test suites
6. **Current implementation where verified** — code confirmed against specs
7. **Git history as supporting evidence** — commits, PRs, diffs
8. **Historical or retired documents** — documents with `Status: Superseded` or `Retired`

When documents conflict, the higher-ranked source wins.

## Capability matrix

| Capability | State | Source | Limitation |
|---|---|---|---|
| Planner Agent | Proposed | `AI-ADVISOR.md` | Not yet implemented |
| Reconciliation Agent | Proposed | `AI-ADVISOR.md` | Not yet implemented |
| Tax & Compliance Agent | Proposed | `AI-ADVISOR.md` | Not yet implemented |
| Merchant Operations Agent | Proposed | `AI-ADVISOR.md` | Not yet implemented |
| Exact matching | Proposed | `ALGORITHM.md` | Not yet implemented |
| Fuzzy/candidate matching | Proposed | `ALGORITHM.md` | Not yet implemented |
| Dynamic QR generation | Proposed | `04-functional-requirements.md` | Not yet implemented |
| Mini POS | Proposed | `04-functional-requirements.md` | Minimal feature set |
| Cash reconciliation | Proposed | `04-functional-requirements.md` | Detects discrepancy only |
| Tax-readiness report | Proposed | `COMPLIANCE.md` | Draft export only, no filing |
| Exception Inbox | Proposed | `DESIGN.md` | Not yet implemented |
| Agent trace UI | Proposed | `DESIGN.md` | Not yet implemented |
| Audit log export | Proposed | `11-security.md` | Not yet implemented |
| SHB transaction adapter | Proposed | `10-integration.md` | Sandbox/mock only |
| SePay webhook adapter | Proposed | `10-integration.md` | Sandbox only |
| Invoice adapter | Proposed | `10-integration.md` | Mock provider |
| Case management | Proposed | `10-integration.md` | Mock SHB API |
| Canonical Event Ledger | Proposed | `07-data-models.md` | Not yet implemented |
| Tax Rules Engine | Proposed | `COMPLIANCE.md` | Deterministic, versioned |
| RBAC | Proposed | `09-permissions-matrix.md` | Not yet implemented |

## Context / anti-drift map

- **What is this product?** A multi-agent AI TaxOps system for SHB bank that reconciles merchant financial data.
- **What is actually implemented today?** Nothing — this is a greenfield project.
- **What is not implemented?** Everything. All capabilities are `Proposed`.
- **Which document owns each system?** See document map above.
- **What must never be changed casually?** Source-of-truth hierarchy, agent tool allowlists, tax rule versioning, audit log schema.
- **Which files are historical?** None yet.
- **Which routes/modules are canonical?** Defined in `06-system-architecture.md` (target state).

### Task-to-doc map

| Task | Required docs |
|---|---|
| Change agent behavior | `AGENTS.md`, `AI-ADVISOR.md`, `04-functional-requirements.md` |
| Change matching logic | `ALGORITHM.md`, `07-data-models.md`, `testing-spec.md` |
| Change tax rules | `COMPLIANCE.md`, `07-data-models.md`, `AI-ADVISOR.md` |
| Change UI screens | `DESIGN.md`, `IMPLEMENTATION-PLAN.md` |
| Add integration | `10-integration.md`, `07-data-models.md`, `06-system-architecture.md` |
| Change security | `11-security.md`, `09-permissions-matrix.md`, `07-data-models.md` |
| Change API endpoints | `08-api-specifications.md`, `12-error-codes.md` |

## Verification

### Automated

- `ls docs/` — verifies all listed documents exist
- `grep -r "Status:" docs/` — verifies every document has metadata

### Manual

- Review document map: every listed document exists and has correct metadata
- Review capability matrix: all states are `Proposed` (greenfield)

---

*Last updated: 2026-07-17*
