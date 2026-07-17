# User Stories — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Current — user stories reflect actual product scope
> **Last verified against code:** 2026-07-17
> **Verification:** Xem § Verification bên dưới

---

## Merchant Workspace — Daily Operations

### USR-MW-RECON-001 — Auto-match with payment reference

**As a** business owner (Hương),
**I want** giao dịch có payment reference hợp lệ được tự động match với đơn hàng,
**so that** tôi không phải kiểm tra giao dịch chuẩn thủ công.

**Priority:** Must
**Traces to:** BR-002, FR-RECON-001

---

### USR-MW-RECON-002 — Fuzzy match without reference

**As a** business owner (Hương),
**I want** giao dịch không có reference được match bằng candidate scoring,
**so that** giao dịch cũ và ngoài vẫn được đối soát.

**Priority:** Must
**Traces to:** BR-003, FR-RECON-002

---

### USR-MW-RECON-003 — Exception Inbox for ambiguous transactions

**As a** business owner (Hương),
**I want** chỉ thấy giao dịch cần quyết định của tôi,
**so that** tôi tập trung vào điều quan trọng thay vì review tất cả.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

---

### USR-MW-RECON-004 — AI suggestion with confidence and reasoning

**As a** business owner (Hương),
**I want** AI đề xuất phân loại kèm confidence score và lý do,
**so that** tôi ra quyết định nhanh và có thông tin.

**Priority:** Must
**Traces to:** BR-013, FR-RECON-004

---

### USR-MW-RECON-005 — Payment allocation across multiple orders

**As a** business owner (Hương),
**I want** một thanh toán được phân bổ cho nhiều đơn hàng,
**so that** thanh toán một phần và thanh toán gộp được xử lý đúng.

**Priority:** Should
**Traces to:** BR-002, FR-RECON-005

---

### USR-MW-RECON-006 — Approve or reject AI recommendation

**As a** business owner (Hương),
**I want** duyệt hoặc từ chối đề xuất AI cho giao dịch mơ hồ,
**so that** tôi giữ quyền kiểm soát cuối cùng.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

---

### USR-MW-TAX-001 — Tax-readiness checklist

**As a** business owner (Hương),
**I want** checklist cho biết dữ liệu đã sẵn sàng cho thuế chưa,
**so that** tôi biết cần làm gì trước mùa thuế.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-001

---

### USR-MW-TAX-002 — Detect missing invoices

**As a** business owner (Hương),
**I want** hệ thống flag đơn đã thanh toán nhưng thiếu hóa đơn,
**so that** tôi phát hành hóa đơn kịp thời.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-003

---

### USR-MW-TAX-003 — Draft export to accounting system

**As a** business owner (Hương),
**I want** xuất dữ liệu sạch ở format chuẩn,
**so that** import vào MISA hoặc gửi cho kế toán.

**Priority:** Should
**Traces to:** BR-008, FR-TAX-004

---

### USR-MW-POS-001 — Create sale with Mini POS

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** chọn dịch vụ và tạo đơn hàng,
**so that** mỗi giao dịch có bản ghi ngay cả khi không có POS đầy đủ.

**Priority:** Must
**Traces to:** BR-011, FR-POS-001

---

### USR-MW-POS-002 — Generate dynamic QR for payment

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** tạo QR code với số tiền và reference điền sẵn,
**so that** chuyển khoản của khách tự động match với đơn.

**Priority:** Must
**Traces to:** BR-010, FR-POS-002

---

### USR-MW-POS-003 — Record cash payment

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** ghi thanh toán tiền mặt bằng một nút bấm,
**so that** giao dịch tiền mặt được theo dõi không cần nhập thủ công.

**Priority:** Must
**Traces to:** BR-012, FR-POS-003

---

### USR-MW-POS-004 — Cash reconciliation at shift end

**As a** business owner (Hương),
**I want** hệ thống so sánh tiền dự kiến với tiền đếm thực tế cuối ca,
**so that** chênh lệch được phát hiện ngay.

**Priority:** Should
**Traces to:** BR-012, FR-POS-004

---

### USR-MW-AGENT-001 — View agent trace

**As a** business owner (Hương),
**I want** thấy agent nào làm gì, gọi tool nào, với confidence bao nhiêu,
**so that** tôi tin tưởng quyết định của hệ thống.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

---

### USR-MW-SUPPORT-001 — Request SHB support

**As a** business owner (Hương),
**I want** yêu cầu hỗ trợ từ SHB khi không tự giải quyết được ngoại lệ,
**so that** case được escalate cho nhân viên SHB xử lý.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-001

---

### USR-MW-CONFIRM-001 — Confirm transaction classification via link

**As a** business owner (Hương),
**I want** nhận link đơn giản để xác nhận giao dịch là gì,
**so that** tôi không phải gọi ngân hàng hay dùng hệ thống phức tạp.

**Priority:** Should
**Traces to:** BR-004, BR-005, FR-MERCHANT-001

---

## SHB Operations Console — Oversight & Case Management

### USR-OPS-AGENT-001 — Natural language request to Planner

**As an** SHB operations employee (Linh),
**I want** nhập yêu cầu ngôn ngữ tự nhiên như "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
**so that** tôi không phải điều hướng nhiều menu.

**Priority:** Must
**Traces to:** BR-001, FR-AGENT-001

---

### USR-OPS-AGENT-002 — View agent trace for escalated cases

**As an** SHB operations employee (Linh),
**I want** thấy agent trace đầy đủ cho case escalated,
**so that** tôi review evidence và ra quyết định có thông tin.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

---

### USR-OPS-CASE-001 — Receive escalated cases

**As an** SHB operations employee (Linh),
**I want** nhận case được escalate từ Merchant Workspace,
**so that** tôi xử lý các ngoại lệ mà merchant không tự giải quyết được.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-001

---

### USR-OPS-CASE-002 — Draft message to merchant

**As an** SHB operations employee (Linh) hoặc RM (Phong),
**I want** AI draft tin nhắn yêu cầu merchant xác nhận giao dịch,
**so that** tôi gửi nhanh mà không phải soạn từ đầu.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-002

---

### USR-OPS-CASE-003 — Assign task to RM

**As an** SHB operations employee (Linh),
**I want** case được giao cho RM đúng tự động,
**so that** follow-up diễn ra không cần routing thủ công.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-003

---

### USR-OPS-PORTFOLIO-001 — Monitor merchant portfolio health

**As an** SHB operations employee (Linh),
**I want** xem trạng thái tất cả merchant trong portfolio,
**so that** tôi biết merchant nào cần chú ý.

**Priority:** Should
**Traces to:** BR-001, BR-006

---

### USR-OPS-PORTFOLIO-002 — Track unresolved cases

**As an** SHB operations employee (Linh),
**I want** xem danh sách case chưa giải quyết với aging,
**so that** tôi ưu tiên xử lý case lâu nhất.

**Priority:** Should
**Traces to:** BR-007

---

### USR-OPS-PORTFOLIO-003 — View tax-readiness distribution

**As an** SHB operations employee (Linh),
**I want** xem tỷ lệ tax-ready trên toàn portfolio,
**so that** tôi biết portfolio đang đi đúng tiến độ.

**Priority:** Should
**Traces to:** BR-006

---

### USR-OPS-LOWCONF-001 — Investigate low-confidence agent decisions

**As an** SHB operations employee (Linh),
**I want** xem danh sách quyết định AI có confidence thấp,
**so that** tôi review và phê duyệt trước khi finalize.

**Priority:** Should
**Traces to:** BR-015, FR-AGENT-002

---

## Compliance & Administration

### USR-COMP-001 — Rule version in every report

**As a** compliance specialist (Hà),
**I want** mọi tax-readiness report hiển thị rule version và effective date,
**so that** tôi verify đúng rule được áp dụng.

**Priority:** Must
**Traces to:** BR-006, BR-014, FR-TAX-002

---

### USR-COMP-002 — Export audit log

**As a** compliance specialist (Hà),
**I want** export toàn bộ audit log dưới dạng JSON hoặc CSV,
**so that** tôi cung cấp bằng chứng cho auditor.

**Priority:** Must
**Traces to:** BR-009, FR-AGENT-003

---

### USR-COMP-003 — Review tax-rule versions

**As a** compliance specialist (Hà),
**I want** xem và phê duyệt cập nhật tax rule version,
**so that** hệ thống luôn dùng rule mới nhất đã được duyệt.

**Priority:** Should
**Traces to:** BR-014, FR-TAX-002

---

## Verification

### Automated

- N/A — tài liệu user story

### Manual

- Mọi story có ID duy nhất ✓
- Mọi story có priority ✓
- Mọi story trace tới ít nhất một BR và một FR ✓
- Story được nhóm theo workspace (Merchant / SHB Operations / Compliance) ✓
- Merchant Workspace stories bắt đầu bằng "As a business owner" ✓
- SHB Operations stories bắt đầu bằng "As an SHB operations employee" ✓
- SHB staff không responsible cho mọi transaction merchant ✓

---

*Last updated: 2026-07-17*
