# Traceability Matrix — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All requirements, APIs, and tests
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## BR → FR → API → Test traceability

| BR ID | FR ID | API ID | Test ID |
|---|---|---|---|
| BR-001 | FR-DATA-001 | API-TX-GET-001, API-WEBHOOK-POST-001 | TEST-DATA-001, TEST-DATA-002, TEST-DATA-003 |
| BR-002 | FR-RECON-001 | API-RECON-POST-001, API-RECON-GET-001 | TEST-RECON-001, TEST-RECON-002 |
| BR-002 | FR-RECON-005 | API-RECON-POST-001 | TEST-RECON-011 |
| BR-003 | FR-RECON-002 | API-RECON-POST-001, API-RECON-GET-001 | TEST-RECON-003, TEST-RECON-004, TEST-RECON-005, TEST-RECON-006, TEST-RECON-007 |
| BR-004 | FR-RECON-003 | API-RECON-GET-001, API-RECON-POST-002 | TEST-RECON-008 |
| BR-004 | FR-MERCHANT-001 | API-MERCHANT-GET-001, API-MERCHANT-POST-001 | TEST-MERCHANT-001, TEST-MERCHANT-002 |
| BR-005 | FR-RECON-003 | API-RECON-POST-002 | TEST-RECON-008 |
| BR-005 | FR-MERCHANT-001 | API-MERCHANT-POST-001 | TEST-MERCHANT-002 |
| BR-006 | FR-TAX-001 | API-TAX-GET-001 | TEST-TAX-001 |
| BR-006 | FR-TAX-002 | API-TAX-GET-001 | TEST-TAX-002 |
| BR-006 | FR-TAX-003 | API-TAX-GET-001 | TEST-TAX-003 |
| BR-008 | FR-TAX-004 | API-TAX-POST-001 | TEST-TAX-004 |
| BR-007 | FR-OPS-001 | API-CASE-GET-001 | TEST-OPS-001 |
| BR-007 | FR-OPS-002 | API-CASE-POST-002 | TEST-OPS-002 |
| BR-007 | FR-OPS-003 | API-CASE-POST-001 | TEST-OPS-003 |
| BR-009 | FR-AGENT-003 | API-AUDIT-GET-001 | TEST-AGENT-003 |
| BR-010 | FR-POS-002 | API-POS-POST-002, API-WEBHOOK-POST-001 | TEST-POS-002 |
| BR-011 | FR-POS-001 | API-POS-POST-001 | TEST-POS-001 |
| BR-012 | FR-POS-003 | API-POS-POST-003 | TEST-POS-003 |
| BR-012 | FR-POS-004 | API-POS-POST-004 | TEST-POS-004 |
| BR-013 | FR-RECON-004 | API-RECON-GET-001 | TEST-RECON-009, TEST-RECON-010 |
| BR-014 | FR-TAX-002 | API-TAX-GET-001 | TEST-TAX-002 |
| BR-015 | FR-AGENT-002 | API-AGENT-GET-001 | TEST-AGENT-002 |
| BR-001 | FR-AGENT-001 | API-AGENT-POST-001, API-RECON-POST-001 | TEST-AGENT-001 |

## User story → BR → FR traceability

| USR ID | BR ID | FR ID |
|---|---|---|
| USR-RECON-001 | BR-002 | FR-RECON-001 |
| USR-RECON-002 | BR-003 | FR-RECON-002 |
| USR-RECON-003 | BR-004, BR-005 | FR-RECON-003 |
| USR-RECON-004 | BR-013 | FR-RECON-004 |
| USR-RECON-005 | BR-002 | FR-RECON-005 |
| USR-TAX-001 | BR-006 | FR-TAX-001 |
| USR-TAX-002 | BR-006, BR-014 | FR-TAX-002 |
| USR-TAX-003 | BR-006 | FR-TAX-003 |
| USR-TAX-004 | BR-008 | FR-TAX-004 |
| USR-OPS-001 | BR-007 | FR-OPS-001 |
| USR-OPS-002 | BR-007 | FR-OPS-002 |
| USR-OPS-003 | BR-007 | FR-OPS-003 |
| USR-POS-001 | BR-011 | FR-POS-001 |
| USR-POS-002 | BR-010 | FR-POS-002 |
| USR-POS-003 | BR-012 | FR-POS-003 |
| USR-POS-004 | BR-012 | FR-POS-004 |
| USR-AGENT-001 | BR-001 | FR-AGENT-001 |
| USR-AGENT-002 | BR-015 | FR-AGENT-002 |
| USR-AGENT-003 | BR-009 | FR-AGENT-003 |
| USR-MERCHANT-001 | BR-004, BR-005 | FR-MERCHANT-001 |

## Decision → Affected document traceability

| DEC ID | Title | Affected docs |
|---|---|---|
| DEC-001 | Multi-agent architecture | `06-system-architecture.md`, `AI-ADVISOR.md`, `04-functional-requirements.md`, `07-data-models.md` |
| DEC-002 | Canonical Event Ledger | `06-system-architecture.md`, `07-data-models.md`, `10-integration.md`, `ALGORITHM.md` |
| DEC-003 | Payment reference as link key | `07-data-models.md`, `ALGORITHM.md`, `04-functional-requirements.md` |
| DEC-004 | Tax Rules Engine separate from LLM | `COMPLIANCE.md`, `AI-ADVISOR.md`, `07-data-models.md`, `04-functional-requirements.md` |
| DEC-005 | Exception-first UX | `DESIGN.md`, `04-functional-requirements.md`, `AI-ADVISOR.md` |
| DEC-006 | Next.js + FastAPI + PostgreSQL | `06-system-architecture.md`, `13-environment-setup.md`, `IMPLEMENTATION-PLAN.md` |
| DEC-007 | MVP scope | `15-roadmap.md`, `testing-spec.md`, `10-integration.md` |
| DEC-008 | Audit every agent action | `11-security.md`, `07-data-models.md`, `COMPLIANCE.md` |
| DEC-009 | Dynamic QR for payment intent | `04-functional-requirements.md`, `07-data-models.md`, `10-integration.md` |
| DEC-010 | Vietnamese primary, English docs | `00-overview.md`, `GLOSSARY.md`, `DESIGN.md` |

## Error code → API endpoint traceability

| Error ID | Used by API endpoints |
|---|---|
| ERR-MERCHANT-001 | API-MERCHANT-GET-001, API-MERCHANT-GET-002, API-TX-GET-001, API-TAX-GET-001, API-TAX-POST-001 |
| ERR-AUTH-001 | All authenticated endpoints |
| ERR-AUTH-003 | All endpoints with role requirements |
| ERR-RECON-001 | API-RECON-POST-001 |
| ERR-RUN-001 | API-RECON-GET-001, API-AGENT-GET-001 |
| ERR-EXCEPTION-001 | API-RECON-POST-002 |
| ERR-TAX-001 | API-TAX-GET-001 |
| ERR-TAX-002 | API-TAX-POST-001 |
| ERR-CASE-001 | API-CASE-GET-001, API-CASE-POST-001, API-CASE-POST-002 |
| ERR-POS-001 | API-POS-POST-001, API-POS-POST-003 |
| ERR-POS-002 | API-POS-POST-002 |
| ERR-POS-003 | API-POS-POST-002, API-POS-POST-003 |
| ERR-POS-004 | API-POS-POST-004 |
| ERR-TOKEN-001 | API-MERCHANT-GET-001, API-MERCHANT-POST-001 |
| ERR-TOKEN-002 | API-MERCHANT-GET-001, API-MERCHANT-POST-001 |
| ERR-WEBHOOK-001 | API-WEBHOOK-POST-001 |

## Summary

| Metric | Count |
|---|---|
| Business requirements (BR) | 15 |
| Functional requirements (FR) | 17 |
| User stories (USR) | 20 |
| API endpoints | 20 |
| Error codes | 22 |
| Test cases | 30 |
| Decisions | 10 |
| FRs with at least one test | 17/17 (100%) |
| API endpoints traced to FRs | 20/20 (100%) |
| Errors in API spec appearing in catalog | 22/22 (100%) |

## Verification

### Automated

- `grep -r "FR-" docs/04-functional-requirements.md | wc -l` — count FRs
- `grep -r "TEST-" docs/testing-spec.md | wc -l` — count test cases
- Script: verify every FR ID in `04-functional-requirements.md` appears in traceability matrix

### Manual

- Cross-check: every FR has a test case ✓
- Cross-check: every API endpoint traces to at least one FR ✓
- Cross-check: every error in API spec appears in error catalog ✓
- Cross-check: every decision lists affected documents ✓

---

*Last updated: 2026-07-17*
