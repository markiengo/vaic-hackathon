# Non-Functional Requirements — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Performance

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-PERF-001 | Initial workflow status response | <5 seconds | API timing from request to first status |
| NFR-PERF-002 | Full case completion on demo data | <30 seconds | End-to-end timing from request to completion |
| NFR-PERF-003 | Exact match lookup | <100ms per transaction | Database query timing |
| NFR-PERF-004 | Fuzzy match candidate generation | <500ms per transaction | Algorithm execution timing |
| NFR-PERF-005 | UI page load | <2 seconds | Browser performance metric |
| NFR-PERF-006 | Audit log export (1000 events) | <5 seconds | Export generation timing |

## Availability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-AVAIL-001 | MVP demo availability | 99% during demo window | Uptime monitoring |
| NFR-AVAIL-002 | Agent run recovery | Failed runs are retried once, then marked as FAILED | Agent run log |

## Scalability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-SCALE-001 | MVP data volume | 30 orders, 20 transfers, 8 cash payments, 2 non-revenue, 2 ambiguous, 1 refund | Demo dataset |
| NFR-SCALE-002 | Pilot data volume | 30–200 transactions per merchant per day | Pilot monitoring |
| NFR-SCALE-003 | Concurrent users (MVP) | 5 simultaneous users | Load test |

## Security NFRs

See `11-security.md` for security requirements. This document references, not duplicates, security specs.

## Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-COMPAT-001 | Browser support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| NFR-COMPAT-002 | Screen size | Desktop 1280px+, tablet 768px+ (MVP: desktop only) |
| NFR-COMPAT-003 | Language | Vietnamese (primary), English (documentation) |

## Limits

| ID | Limit | Value |
|---|---|---|
| NFR-LIMIT-001 | QR expiry | 15 minutes |
| NFR-LIMIT-002 | Merchant confirmation link expiry | 7 days |
| NFR-LIMIT-003 | Max transactions per reconciliation run | 10,000 (MVP: 100) |
| NFR-LIMIT-004 | Max export rows | 50,000 (MVP: 1,000) |

## Data retention

| Data | Retention | Purge mechanism |
|---|---|---|
| audit_events | 7 years (banking requirement) | Archive to cold storage after 7 years |
| agent_runs | 2 years | Delete after 2 years |
| tool_calls | 2 years | Delete with associated agent_run |
| reconciliation_cases | 5 years | Archive after 5 years |
| payment_intents (expired) | 90 days | Automatic deletion after expiry |
| merchant confirmation tokens | 7 days | Automatic deletion after expiry |

## Verification

### Automated

- `pytest tests/test_performance.py -v` — verifies latency targets
- `pytest tests/test_limits.py -v` — verifies boundary conditions

### Manual

- Time a full demo workflow end-to-end
- Verify UI loads within 2 seconds on target browser
- Verify export of 1000 audit events completes within 5 seconds

---

*Last updated: 2026-07-17*
