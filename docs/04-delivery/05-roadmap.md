# Roadmap — TaxLens

> **Status:** Draft
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả phase TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Phase 1: Hackathon MVP (48 giờ)

**Mục tiêu:** Demo multi-agent reconciliation end-to-end với 1 salon merchant trên sandbox data.

### Sprint 1 (Hours 1-8): Data layer + adapters

| Item | Exit criteria |
|---|---|
| Database models và migrations | `alembic upgrade head` succeeds |
| SHB mock adapter | Transactions ingested vào canonical ledger |
| SePay webhook handler | Webhook tạo bank_transaction record |
| CSV import adapter | CSV file produce canonical records |
| Invoice mock adapter | Invoice records tạo |
| Seed data migration | 1 salon, 30 orders, 20 transfers, 8 cash, edge cases loaded |

**Dependencies:** Không (starting point)
**Owner:** Backend team

### Sprint 2 (Hours 9-16): Agent layer

| Item | Exit criteria |
|---|---|
| Tool implementations | Tất cả tools callable với schemas đúng |
| Reconciliation Agent | Exact + fuzzy matching produce kết quả đúng trên seed data |
| Tax & Compliance Agent | Tax-readiness report generated với rule version |
| Merchant Operations Agent | Cases tạo và messages drafted |
| Planner Agent | Natural language request phân tách thành plan |
| Agent run state machine | State transitions logged trong agent_runs |
| Audit logging | Mỗi tool call có audit_event record |

**Dependencies:** Sprint 1 hoàn thành
**Owner:** Backend team

### Sprint 3 (Hours 17-24): API layer

| Item | Exit criteria |
|---|---|
| Auth endpoints | Login trả JWT; protected routes enforce roles |
| Merchant endpoints | Dashboard trả summary data |
| Reconciliation endpoints | Start run, get result, resolve exception working |
| Tax endpoints | Readiness report và export working |
| Case endpoints | List, assign, draft message working |
| Agent endpoints | Start run và get trace working |
| Audit endpoint | Export JSON và CSV working |
| POS endpoints | Sale, QR, cash, session close working |
| Merchant confirmation endpoints | Token-based get và submit working |
| WebSocket | Agent trace updates real-time |

**Dependencies:** Sprint 2 hoàn thành
**Owner:** Backend team

### Sprint 4 (Hours 25-36): Frontend

| Item | Exit criteria |
|---|---|
| App shell + routing | Sidebar navigation hoạt động |
| Auth page | Login functional |
| Dashboard | Summary cards hiển thị real data |
| Exception Inbox | List, AI reasoning, resolve flow working |
| Agent Trace | Timeline với real-time updates |
| Tax-Readiness | Checklist với rule version và export |
| Cases | List, assign, draft message |
| Audit Export | Filter và download |
| Mini POS | Product selection, cart, QR display, cash |
| Merchant Confirmation | Token-based page, submit classification |

**Dependencies:** Sprint 3 hoàn thành (APIs available)
**Owner:** Frontend team

### Sprint 5 (Hours 37-48): Integration & polish

| Item | Exit criteria |
|---|---|
| End-to-end demo flow | Tất cả 6 demo scenes chạy thành công |
| Performance | Initial response <5s; full case <30s |
| Error handling | Tất cả error codes trả response đúng |
| Vietnamese rendering | Toàn bộ UI text và AI messages bằng tiếng Việt |
| Demo data validation | Truth set khớp với expected outcomes |

**Dependencies:** Sprint 4 hoàn thành
**Owner:** Full team

### Phase 1 exit criteria

- [ ] Tất cả 9 MVP features từ product.md §17 demo
- [ ] Auto-reconciliation rate ≥80% trên demo data
- [ ] Exception reduction ≥80%
- [ ] 100% agent decisions có audit records
- [ ] Demo runs end-to-end từ request đến action trong <30s
- [ ] Tất cả acceptance criteria từ product.md §20 met

---

## Phase 2: Pilot — Discovery & Data Standardization (2 tuần)

**Mục tiêu:** Chuẩn bị cho internal pilot với SHB staff.

| Item | Exit criteria |
|---|---|
| Chọn vertical: salon | Confirmed |
| Finalize SHB sandbox schema | Schema documented và tested |
| Finalize canonical ledger | Schema stable; no breaking changes |
| Định nghĩa first tax-readiness rules | Rule version approved và loaded |
| Tạo 50 anonymized historical cases | Cases loaded và validated |

**Dependencies:** Phase 1 hoàn thành
**Owner:** PM + Tech Lead

---

## Phase 3: Pilot — Internal Read-Only (4 tuần)

**Mục tiêu:** Chạy read-only pilot với SHB staff trên simulated hoặc consenting merchants.

| Item | Exit criteria |
|---|---|
| 5 SHB staff trained | Training hoàn thành |
| 20 merchants loaded | Merchant profiles tạo |
| Read-only mode active | Không write actions without approval |
| Auto-match và false-match measured | Metrics reported |
| Processing time measured | Baseline established |

**Dependencies:** Phase 2 hoàn thành
**Owner:** PM + SHB Operations

---

## Phase 4: Pilot — Human-in-the-Loop (4 tuần)

**Mục tiêu:** Enable case creation, draft messages, và export với human approval.

| Item | Exit criteria |
|---|---|
| Case creation và draft messaging enabled | RM có thể send messages |
| Merchant confirmation links active | Merchants confirming qua link |
| Export to accounting sandbox | Export file validated |
| RM workload reduction measured | ≥50% reduction demonstrated |

**Dependencies:** Phase 3 hoàn thành
**Owner:** PM + SHB Operations

---

## Phase 5: Expansion (ongoing)

**Mục tiêu:** Mở rộng sang verticals và integrations mới.

| Item | Exit criteria |
|---|---|
| Thêm café hoặc retail vertical | New vertical tested |
| Additional POS adapters | KiotViet adapter working |
| COD và multi-account support | COD import functional |
| New policy và rule versions | Versioning workflow tested |
| VPC deployment evaluation | Deployment plan documented |

**Dependencies:** Phase 4 hoàn thành
**Owner:** Tech Lead + SHB IT

---

## Checkpoints và review points

| Checkpoint | Khi nào | Participants | Decision |
|---|---|---|---|
| MVP demo review | Cuối Phase 1 | Full team + judges | Go/no-go cho pilot |
| Pilot readiness review | Cuối Phase 2 | PM, Tech Lead, SHB | Go/no-go cho internal pilot |
| Pilot mid-point review | Giữa Phase 3 | PM, SHB Operations | Adjust metrics, thêm merchants |
| Pilot completion review | Cuối Phase 4 | PM, Tech Lead, SHB | Go/no-go cho expansion |
| Expansion review | Cuối Phase 5 | Full team + SHB | Prioritize next verticals |

## Rollback plan

| Phase | Rollback action |
|---|---|
| Phase 1 | Revert về last working commit; demo với mock data |
| Phase 2 | Không cần rollback (discovery only) |
| Phase 3 | Disable read-only access; revert về Phase 2 state |
| Phase 4 | Disable write actions; revert về read-only (Phase 3) |
| Phase 5 | Disable new verticals; revert về Phase 4 state |

## Verification

### Automated

- N/A — tài liệu roadmap

### Manual

- Mỗi phase có exit criteria ✓
- Exit criteria trace đến FRs và tests ✓
- Dependencies giữa các phases được map ✓
- Mỗi phase có owner ✓

---

*Last updated: 2026-07-17*
