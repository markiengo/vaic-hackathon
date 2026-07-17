# Roadmap — KHỚP

> **Status:** Draft
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All KHỚP phases
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Phase 1: Hackathon MVP (48 hours)

**Goal:** Demonstrate multi-agent reconciliation end-to-end with 1 salon merchant on sandbox data.

### Sprint 1 (Hours 1-8): Data layer + adapters

| Item | Exit criteria |
|---|---|
| Database models and migrations | `alembic upgrade head` succeeds |
| SHB mock adapter | Transactions ingested into canonical ledger |
| SePay webhook handler | Webhook creates bank_transaction record |
| CSV import adapter | CSV file produces canonical records |
| Invoice mock adapter | Invoice records created |
| Seed data migration | 1 salon, 30 orders, 20 transfers, 8 cash, edge cases loaded |

**Dependencies:** None (starting point)
**Owner:** Backend team

### Sprint 2 (Hours 9-16): Agent layer

| Item | Exit criteria |
|---|---|
| Tool implementations | All tools callable with correct schemas |
| Reconciliation Agent | Exact + fuzzy matching produces correct results on seed data |
| Tax & Compliance Agent | Tax-readiness report generated with rule version |
| Merchant Operations Agent | Cases created and messages drafted |
| Planner Agent | Natural language request decomposed into plan |
| Agent run state machine | State transitions logged in agent_runs |
| Audit logging | Every tool call has audit_event record |

**Dependencies:** Sprint 1 complete
**Owner:** Backend team

### Sprint 3 (Hours 17-24): API layer

| Item | Exit criteria |
|---|---|
| Auth endpoints | Login returns JWT; protected routes enforce roles |
| Merchant endpoints | Dashboard returns summary data |
| Reconciliation endpoints | Start run, get result, resolve exception working |
| Tax endpoints | Readiness report and export working |
| Case endpoints | List, assign, draft message working |
| Agent endpoints | Start run and get trace working |
| Audit endpoint | Export JSON and CSV working |
| POS endpoints | Sale, QR, cash, session close working |
| Merchant confirmation endpoints | Token-based get and submit working |
| WebSocket | Agent trace updates in real-time |

**Dependencies:** Sprint 2 complete
**Owner:** Backend team

### Sprint 4 (Hours 25-36): Frontend

| Item | Exit criteria |
|---|---|
| App shell + routing | Sidebar navigation works |
| Auth page | Login functional |
| Dashboard | Summary cards display real data |
| Exception Inbox | List, AI reasoning, resolve flow working |
| Agent Trace | Timeline with real-time updates |
| Tax-Readiness | Checklist with rule version and export |
| Cases | List, assign, draft message |
| Audit Export | Filter and download |
| Mini POS | Product selection, cart, QR display, cash |
| Merchant Confirmation | Token-based page, submit classification |

**Dependencies:** Sprint 3 complete (APIs available)
**Owner:** Frontend team

### Sprint 5 (Hours 37-48): Integration & polish

| Item | Exit criteria |
|---|---|
| End-to-end demo flow | All 6 demo scenes run successfully |
| Performance | Initial response <5s; full case <30s |
| Error handling | All error codes return correct responses |
| Vietnamese rendering | All UI text and AI messages in Vietnamese |
| Demo data validation | Truth set matches expected outcomes |

**Dependencies:** Sprint 4 complete
**Owner:** Full team

### Phase 1 exit criteria

- [ ] All 9 MVP features from product.md §17 demonstrated
- [ ] Auto-reconciliation rate ≥80% on demo data
- [ ] Exception reduction ≥80%
- [ ] 100% agent decisions have audit records
- [ ] Demo runs end-to-end from request to action in <30s
- [ ] All acceptance criteria from product.md §20 met

---

## Phase 2: Pilot — Discovery & Data Standardization (2 weeks)

**Goal:** Prepare for internal pilot with SHB staff.

| Item | Exit criteria |
|---|---|
| Choose vertical: salon | Confirmed |
| Finalize SHB sandbox schema | Schema documented and tested |
| Finalize canonical ledger | Schema stable; no breaking changes |
| Define first tax-readiness rules | Rule version approved and loaded |
| Create 50 anonymized historical cases | Cases loaded and validated |

**Dependencies:** Phase 1 complete
**Owner:** PM + Tech Lead

---

## Phase 3: Pilot — Internal Read-Only (4 weeks)

**Goal:** Run read-only pilot with SHB staff on simulated or consenting merchants.

| Item | Exit criteria |
|---|---|
| 5 SHB staff trained | Training complete |
| 20 merchants loaded | Merchant profiles created |
| Read-only mode active | No write actions without approval |
| Auto-match and false-match measured | Metrics reported |
| Processing time measured | Baseline established |

**Dependencies:** Phase 2 complete
**Owner:** PM + SHB Operations

---

## Phase 4: Pilot — Human-in-the-Loop (4 weeks)

**Goal:** Enable case creation, draft messages, and export with human approval.

| Item | Exit criteria |
|---|---|
| Case creation and draft messaging enabled | RM can send messages |
| Merchant confirmation links active | Merchants confirming via link |
| Export to accounting sandbox | Export file validated |
| RM workload reduction measured | ≥50% reduction demonstrated |

**Dependencies:** Phase 3 complete
**Owner:** PM + SHB Operations

---

## Phase 5: Expansion (ongoing)

**Goal:** Expand to new verticals and integrations.

| Item | Exit criteria |
|---|---|
| Add café or retail vertical | New vertical tested |
| Additional POS adapters | KiotViet adapter working |
| COD and multi-account support | COD import functional |
| New policy and rule versions | Versioning workflow tested |
| VPC deployment evaluation | Deployment plan documented |

**Dependencies:** Phase 4 complete
**Owner:** Tech Lead + SHB IT

---

## Checkpoints and review points

| Checkpoint | When | Participants | Decision |
|---|---|---|---|
| MVP demo review | End of Phase 1 | Full team + judges | Go/no-go for pilot |
| Pilot readiness review | End of Phase 2 | PM, Tech Lead, SHB | Go/no-go for internal pilot |
| Pilot mid-point review | Mid-Phase 3 | PM, SHB Operations | Adjust metrics, add merchants |
| Pilot completion review | End of Phase 4 | PM, Tech Lead, SHB | Go/no-go for expansion |
| Expansion review | End of Phase 5 | Full team + SHB | Prioritize next verticals |

## Rollback plan

| Phase | Rollback action |
|---|---|
| Phase 1 | Revert to last working commit; demo with mock data |
| Phase 2 | No rollback needed (discovery only) |
| Phase 3 | Disable read-only access; revert to Phase 2 state |
| Phase 4 | Disable write actions; revert to read-only (Phase 3) |
| Phase 5 | Disable new verticals; revert to Phase 4 state |

## Verification

### Automated

- N/A — roadmap document

### Manual

- Every phase has exit criteria ✓
- Exit criteria trace to FRs and tests ✓
- Dependencies between phases are mapped ✓
- Each phase has an owner ✓

---

*Last updated: 2026-07-17*
