# Traceability Matrix — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả requirements, APIs, và tests
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Traceability BR → FR → API → Test

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

## Traceability User story → BR → FR

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

## Traceability Decision → Tài liệu affected

| DEC ID | Tiêu đề | Tài liệu affected |
|---|---|---|
| DEC-001 | Multi-agent architecture | `03-engineering/01-system-architecture.md`, `05-domain/01-ai-advisor.md`, `02-requirements/04-functional-requirements.md`, `03-engineering/02-data-models.md` |
| DEC-002 | Canonical Event Ledger | `03-engineering/01-system-architecture.md`, `03-engineering/02-data-models.md`, `03-engineering/05-integration.md`, `05-domain/02-algorithm.md` |
| DEC-003 | Payment reference as link key | `03-engineering/02-data-models.md`, `05-domain/02-algorithm.md`, `02-requirements/04-functional-requirements.md` |
| DEC-004 | Tax Rules Engine tách biệt từ LLM | `05-domain/05-compliance.md`, `05-domain/01-ai-advisor.md`, `03-engineering/02-data-models.md`, `02-requirements/04-functional-requirements.md` |
| DEC-005 | Exception-first UX | `04-delivery/03-design.md`, `02-requirements/04-functional-requirements.md`, `05-domain/01-ai-advisor.md` |
| DEC-006 | Next.js + FastAPI + PostgreSQL | `03-engineering/01-system-architecture.md`, `04-delivery/01-environment-setup.md`, `04-delivery/04-implementation-plan.md` |
| DEC-007 | MVP scope | `04-delivery/05-roadmap.md`, `04-delivery/02-testing-spec.md`, `03-engineering/05-integration.md` |
| DEC-008 | Audit mọi agent action | `03-engineering/06-security.md`, `03-engineering/02-data-models.md`, `05-domain/05-compliance.md` |
| DEC-009 | Dynamic QR cho payment intent | `02-requirements/04-functional-requirements.md`, `03-engineering/02-data-models.md`, `03-engineering/05-integration.md` |
| DEC-010 | Tiếng Việt primary, English docs | `01-foundation/01-overview.md`, `05-domain/04-glossary.md`, `04-delivery/03-design.md` |

## Traceability Error code → API endpoint

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

## Tóm tắt

| Metric | Count |
|---|---|
| Business requirements (BR) | 15 |
| Functional requirements (FR) | 17 |
| User stories (USR) | 20 |
| API endpoints | 20 |
| Error codes | 22 |
| Test cases | 30 |
| Decisions | 10 |
| FRs có ít nhất một test | 17/17 (100%) |
| API endpoints traced đến FRs | 20/20 (100%) |
| Errors trong API spec appearing trong catalog | 22/22 (100%) |

## Verification

### Automated

- `grep -r "FR-" docs/04-functional-requirements.md | wc -l` — count FRs
- `grep -r "TEST-" docs/testing-spec.md | wc -l` — count test cases
- Script: verify mỗi FR ID trong `02-requirements/04-functional-requirements.md` appears trong traceability matrix

### Manual

- Cross-check: mỗi FR có test case ✓
- Cross-check: mỗi API endpoint traces đến ít nhất một FR ✓
- Cross-check: mỗi error trong API spec appears trong error catalog ✓
- Cross-check: mỗi decision lists affected documents ✓

---

*Last updated: 2026-07-17*
