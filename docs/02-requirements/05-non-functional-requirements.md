# Non-Functional Requirements — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Performance

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-PERF-001 | Phản hồi trạng thái workflow ban đầu | <5 giây | API timing từ request đến status đầu tiên |
| NFR-PERF-002 | Hoàn thành case đầy đủ trên dữ liệu demo | <30 giây | End-to-end timing từ request đến completion |
| NFR-PERF-003 | Exact match lookup | <100ms mỗi giao dịch | Database query timing |
| NFR-PERF-004 | Fuzzy match candidate generation | <500ms mỗi giao dịch | Algorithm execution timing |
| NFR-PERF-005 | UI page load | <2 giây | Browser performance metric |
| NFR-PERF-006 | Audit log export (1000 event) | <5 giây | Export generation timing |

## Availability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-AVAIL-001 | MVP demo availability | 99% trong demo window | Uptime monitoring |
| NFR-AVAIL-002 | Agent run recovery | Run thất bại được retry một lần, rồi mark FAILED | Agent run log |

## Scalability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-SCALE-001 | Khối lượng dữ liệu MVP | 30 đơn hàng, 20 chuyển khoản, 8 thanh toán tiền mặt, 2 không doanh thu, 2 mơ hồ, 1 hoàn tiền | Demo dataset |
| NFR-SCALE-002 | Khối lượng dữ liệu pilot | 30–200 giao dịch mỗi merchant mỗi ngày | Pilot monitoring |
| NFR-SCALE-003 | Concurrent user (MVP) | 5 user đồng thời | Load test |

## Security NFRs

Xem `03-engineering/06-security.md` cho security requirement. Tài liệu này tham chiếu, không trùng lặp, security spec.

## Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-COMPAT-001 | Browser support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| NFR-COMPAT-002 | Kích thước màn hình | Desktop 1280px+, tablet 768px+ (MVP: chỉ desktop) |
| NFR-COMPAT-003 | Ngôn ngữ | Tiếng Việt (chính), tiếng Anh (tài liệu) |

## Limits

| ID | Limit | Value |
|---|---|---|
| NFR-LIMIT-001 | QR hết hạn | 15 phút |
| NFR-LIMIT-002 | Link xác nhận merchant hết hạn | 7 ngày |
| NFR-LIMIT-003 | Giao dịch tối đa mỗi lần đối soát | 10.000 (MVP: 100) |
| NFR-LIMIT-004 | Số dòng export tối đa | 50.000 (MVP: 1.000) |

## Data retention

| Data | Retention | Purge mechanism |
|---|---|---|
| audit_events | 7 năm (yêu cầu ngân hàng) | Archive sang cold storage sau 7 năm |
| agent_runs | 2 năm | Xóa sau 2 năm |
| tool_calls | 2 năm | Xóa cùng agent_run liên quan |
| reconciliation_cases | 5 năm | Archive sau 5 năm |
| payment_intents (hết hạn) | 90 ngày | Tự động xóa sau khi hết hạn |
| merchant confirmation token | 7 ngày | Tự động xóa sau khi hết hạn |

## Verification

### Automated

- `pytest tests/test_performance.py -v` — verify latency target
- `pytest tests/test_limits.py -v` — verify boundary condition

### Manual

- Bấm thời gian workflow demo end-to-end
- Verify UI load trong 2 giây trên browser mục tiêu
- Verify export 1000 audit event hoàn thành trong 5 giây

---

*Last updated: 2026-07-17*
