# User Stories — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Epic 1: Reconciliation

### USR-RECON-001 — Auto-match with payment reference

**As a** nhân viên vận hành SHB (Linh),
**I want** giao dịch có payment reference hợp lệ được tự động match với đơn hàng,
**so that** tôi không phải kiểm tra giao dịch chuẩn thủ công.

**Priority:** Must
**Traces to:** BR-002, FR-RECON-001

---

### USR-RECON-002 — Fuzzy match without reference

**As a** nhân viên vận hành SHB (Linh),
**I want** giao dịch không có reference được match bằng candidate scoring,
**so that** giao dịch cũ và ngoài vẫn được đối soát.

**Priority:** Must
**Traces to:** BR-003, FR-RECON-002

---

### USR-RECON-003 — Exception Inbox for ambiguous transactions

**As a** nhân viên vận hành SHB (Linh),
**I want** chỉ thấy giao dịch cần quyết định của tôi,
**so that** tôi tập trung vào điều quan trọng thay vì review tất cả.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

---

### USR-RECON-004 — AI suggestion with confidence and reasoning

**As a** nhân viên vận hành SHB (Linh),
**I want** AI đề xuất phân loại kèm confidence score và lý do,
**so that** tôi ra quyết định nhanh và có thông tin.

**Priority:** Must
**Traces to:** BR-013, FR-RECON-004

---

### USR-RECON-005 — Payment allocation across multiple orders

**As a** nhân viên vận hành SHB (Linh),
**I want** một thanh toán được phân bổ cho nhiều đơn hàng,
**so that** thanh toán một phần và thanh toán gộp được xử lý đúng.

**Priority:** Should
**Traces to:** BR-002, FR-RECON-005

---

## Epic 2: Tax & Compliance

### USR-TAX-001 — Tax-readiness checklist

**As a** chuyên viên compliance SHB (Hà),
**I want** checklist cho biết dữ liệu đã sẵn sàng cho thuế chưa,
**so that** tôi biết merchant có thể chuyển sang kê khai chưa.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-001

---

### USR-TAX-002 — Rule version in every report

**As a** chuyên viên compliance SHB (Hà),
**I want** mọi tax-readiness report hiển thị rule version và effective date,
**so that** tôi verify đúng rule được áp dụng.

**Priority:** Must
**Traces to:** BR-006, BR-014, FR-TAX-002

---

### USR-TAX-003 — Detect missing invoices

**As a** nhân viên vận hành SHB (Linh),
**I want** hệ thống flag đơn đã thanh toán nhưng thiếu hóa đơn,
**so that** tôi follow-up trước mùa thuế.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-003

---

### USR-TAX-004 — Draft export to accounting system

**As a** nhân viên vận hành SHB (Linh),
**I want** xuất dữ liệu sạch ở format chuẩn,
**so that** import vào MISA hoặc hệ thống kế toán khác.

**Priority:** Should
**Traces to:** BR-008, FR-TAX-004

---

## Epic 3: Merchant Operations

### USR-OPS-001 — Create case for unresolved exceptions

**As a** RM SHB (Phong),
**I want** case được tạo tự động cho ngoại lệ chưa giải quyết,
**so that** tôi theo dõi và follow-up từng issue.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-001

---

### USR-OPS-002 — Draft message to merchant

**As a** RM SHB (Phong),
**I want** AI draft tin nhắn yêu cầu merchant xác nhận giao dịch,
**so that** tôi gửi nhanh mà không phải soạn từ đầu.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-002

---

### USR-OPS-003 — Assign task to RM

**As a** nhân viên vận hành SHB (Linh),
**I want** ngoại lệ được giao cho RM đúng tự động,
**so that** follow-up diễn ra không cần routing thủ công.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-003

---

## Epic 4: Mini POS & Payments

### USR-POS-001 — Create sale with Mini POS

**As a** nhân viên salon,
**I want** chọn dịch vụ và tạo đơn hàng,
**so that** mỗi giao dịch có bản ghi ngay cả khi không có POS đầy đủ.

**Priority:** Must
**Traces to:** BR-011, FR-POS-001

---

### USR-POS-002 — Generate dynamic QR for payment

**As a** nhân viên salon,
**I want** tạo QR code với số tiền và reference điền sẵn,
**so that** chuyển khoản của khách tự động match với đơn.

**Priority:** Must
**Traces to:** BR-010, FR-POS-002

---

### USR-POS-003 — Record cash payment

**As a** nhân viên salon,
**I want** ghi thanh toán tiền mặt bằng một nút bấm,
**so that** giao dịch tiền mặt được theo dõi không cần nhập thủ công.

**Priority:** Must
**Traces to:** BR-012, FR-POS-003

---

### USR-POS-004 — Cash reconciliation at shift end

**As a** chủ salon (Hương),
**I want** hệ thống so sánh tiền dự kiến với tiền đếm thực tế cuối ca,
**so that** chênh lệch được phát hiện ngay.

**Priority:** Should
**Traces to:** BR-012, FR-POS-004

---

## Epic 5: Agent Orchestration & Trace

### USR-AGENT-001 — Natural language request to Planner

**As a** nhân viên vận hành SHB (Linh),
**I want** nhập yêu cầu ngôn ngữ tự nhiên như "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
**so that** tôi không phải điều hướng nhiều menu.

**Priority:** Must
**Traces to:** BR-001, FR-AGENT-001

---

### USR-AGENT-002 — View agent trace

**As a** nhân viên vận hành SHB (Linh),
**I want** thấy agent nào làm gì, gọi tool nào, với confidence bao nhiêu,
**so that** tôi tin tưởng quyết định của hệ thống.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

---

### USR-AGENT-003 — Export audit log

**As a** chuyên viên compliance SHB (Hà),
**I want** export toàn bộ audit log dưới dạng JSON hoặc CSV,
**so that** tôi cung cấp bằng chứng cho auditor.

**Priority:** Must
**Traces to:** BR-009, FR-AGENT-003

---

## Epic 6: Merchant Confirmation

### USR-MERCHANT-001 — Confirm transaction classification

**As a** chủ salon (Hương),
**I want** nhận link đơn giản để xác nhận giao dịch là gì,
**so that** tôi không phải gọi ngân hàng hay dùng hệ thống phức tạp.

**Priority:** Should
**Traces to:** BR-004, BR-005, FR-MERCHANT-001

---

## Verification

### Automated

- N/A — tài liệu user story

### Manual

- Mọi story có ID duy nhất ✓
- Mọi story có priority ✓
- Mọi story trace tới ít nhất một BR và một FR ✓
- Story được nhóm theo epic ✓

---

*Last updated: 2026-07-17*
