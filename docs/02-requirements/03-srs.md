# SRS — Software Requirements Specification — TaxLens

> **Status:** Canonical | **Authority:** Normative | **Owner:** PM + Tech Lead
> **Consolidates:** `docs/02-requirements/*`, `docs/05-domain/01-ai-advisor.md`, `docs/05-domain/02-algorithm.md`, `docs/05-domain/03-evaluation.md`, `docs/05-domain/05-compliance.md`, `docs/05-domain/04-glossary.md`
> **Last updated:** 2026-07-17

---

## Table of Contents

1. [Business Context & Model](#1-business-context--model)
2. [Stakeholders & Personas](#2-stakeholders--personas)
3. [Business Requirements](#3-business-requirements)
4. [User Stories](#4-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [AI Agent Specification](#7-ai-agent-specification)
8. [Matching Algorithm Specification](#8-matching-algorithm-specification)
9. [Evaluation Specification](#9-evaluation-specification)
10. [Compliance Specification](#10-compliance-specification)
11. [Glossary](#11-glossary)
12. [Traceability Matrix](#12-traceability-matrix)

---

## 1. Business Context & Model

Hộ kinh doanh và doanh nghiệp siêu nhỏ Việt Nam có dữ liệu tài chính rời rạc: đơn hàng POS, chuyển khoản ngân hàng, ca tiền mặt, và hóa đơn điện tử nằm trong các hệ thống riêng biệt không tự động đối soát. Merchant phải tự so Excel hoặc đợi nhân viên SHB kiểm tra hàng trăm giao dịch thủ công để xác nhận doanh thu sẵn sàng cho quy trình thuế. Việc này chậm, dễ sai, và không scale được.

TaxLens là hệ thống multi-agent AI kết nối dữ liệu giao dịch SHB với POS, file bán hàng, tiền mặt, và hóa đơn điện tử; tự động đối soát thanh toán; phát hiện chênh lệch; và điều phối xử lý con người cho trường hợp mơ hồ. TaxLens không thay thế MISA, KiotViet, hay phần mềm kế toán — đây là lớp kết nối và kiểm soát tạo dữ liệu sạch, auditable, sẵn sàng cho quy trình thuế hiện có.

### Business model

TaxLens tạo giá trị cho SHB bằng:

1. **Tăng mức gắn bó của merchant** — Tài khoản SHB trở thành trung tâm vận hành tài chính, không chỉ là nơi nhận tiền.
2. **Giảm khối lượng hỗ trợ thủ công** — Nhân viên không phải tải sao kê, so Excel, và gọi khách nhiều lần.
3. **Cải thiện chất lượng dữ liệu merchant** — SHB hiểu dòng tiền kinh doanh đã xác nhận, không chỉ các dòng giao dịch rời rạc.
4. **Tạo nền tảng cho sản phẩm mới** — Sổ doanh thu sạch hỗ trợ tích hợp kế toán, nhắc hóa đơn, đánh giá dòng tiền, và sản phẩm vốn lưu động.

**Mô hình doanh thu (sau pilot):** B2B SaaS tính phí theo merchant mỗi tháng, kèm dịch vụ tích hợp cho SHB. Có thể bundle với gói merchant banking của SHB.

### Constraints

- **Không có truy cập SHB production API** cho hackathon — chỉ sandbox hoặc mock
- **Không phát hành hóa đơn production** — chỉ mock provider
- **Không kê khai thuế thật** — chỉ xuất nháp
- **48 giờ build** cho hackathon MVP
- **Tiếng Việt** cho mọi nội dung user-facing
- **Dữ liệu tài chính nhạy cảm** — cần encryption, masking, RBAC
- **Không lock-in model** — LLM provider abstraction layer
- **Data residency** — phải triển khai được trong VPC nếu SHB yêu cầu

### Success metrics

| Metric | Target | Measurement method |
|---|---|---|
| Tỷ lệ auto-reconciliation | ≥80% giao dịch demo được match không cần con người | Đếm auto-match vs tổng trong demo dataset |
| Giảm ngoại lệ | ≥80% giảm mục review thủ công | So sánh số raw vs số ngoại lệ |
| Traceability | 100% quyết định agent có tool call, confidence, audit record | Query audit_events table |
| Hoàn thành action | Planner hoàn thành workflow với ≥3 specialist agent và ≥2 write action | Agent run log |
| Workflow latency (ban đầu) | <5 giây cho phản hồi trạng thái ban đầu | API timing |
| Hoàn thành case đầy đủ | <30 giây trên dữ liệu demo | End-to-end timing |
| Độ chính xác auto-match (có reference) | ≥95% cho giao dịch có reference hợp lệ | Validate match với truth set |
| Giảm thời gian đối soát pilot | ≥50% giảm mỗi merchant | So sánh thời gian trước/sau |

### Scope boundaries

- **Trong phạm vi:** Đối soát multi-agent, exception management, tax-readiness reporting, Mini POS, dynamic QR, audit logging, agent trace UI, sandbox integration
- **Ngoài phạm vi:** Kê khai thuế thật, phát hành hóa đơn production, tích hợp production MISA/KiotViet, POS đầy đủ, chấm điểm tín dụng, quyết định khoản vay, mobile merchant app, hỗ trợ nhiều ngành nghề (MVP chỉ salon)

---

## 2. Stakeholders & Personas

### Stakeholder table

| Name | Role | Interest | Influence |
|---|---|---|---|
| Hộ kinh doanh (merchants) | Chủ doanh nghiệp — người dùng hằng ngày | Dùng TaxLens trực tiếp để đối soát, xử lý ngoại lệ, kiểm tra sẵn sàng thuế | High |
| SHB Operations Team | Nhân viên hỗ trợ merchant của SHB | Xử lý case escalated, giám sát merchant portfolio, audit | High |
| SHB Relationship Managers | RM trực tiếp khách hàng | Hỗ trợ merchant cần follow-up, draft tin nhắn | Medium |
| SHB Compliance Team | Chuyên viên tax/compliance | Đảm bảo rule đúng và audit trail | High |
| SHB IT Department | Infrastructure | Triển khai và duy trì TaxLens | High |
| SHB Product Owner | Sponsor nội bộ | Quyết định scope, ưu tiên, rollout | High |
| VAIC Hackathon Judges | Giám khảo | Đánh giá product fit, AI depth, demo quality | High (hackathon) |
| MISA / Accounting partners | Integration target | Nhận dữ liệu sạch export | Low (post-MVP) |

### Product model

TaxLens có **hai workspace riêng biệt**:

- **Merchant Workspace** (người dùng hằng ngày: business owner) — giao dịch, đơn hàng, ngoại lệ, sẵn sàng thuế, Mini POS
- **SHB Operations Console** (người dùng vận hành: SHB staff) — portfolio, cases escalated, agent trace, audit, compliance

### Persona 1 — Hương, Salon Owner (Primary Daily User)

**Role:** Chủ hộ kinh doanh (salon) — người dùng hằng ngày của Merchant Workspace
**Label:** Assumption-based (xuất phát từ `01-foundation/03-product-spec.md` §6)

**Goals:**
- Nắm rõ doanh thu thực tế của cửa hàng mỗi ngày
- Biết chính xác khoản nào là doanh thu, khoản nào là tiền cá nhân hoặc chuyển nội bộ
- Đảm bảo dữ liệu sẵn sàng cho mùa thuế mà không phải tự so Excel
- Giải quyết nhanh các giao dịch mơ hồ mà không cần gọi ngân hàng

**Needs:**
- Dashboard riêng cho cửa hàng: tổng giao dịch, tỷ lệ đối soát, ngoại lệ, trạng thái sẵn sàng thuế
- Exception Inbox: chỉ thấy giao dịch cần mình xác nhận, kèm gợi ý AI và lý do
- Khả năng duyệt hoặc từ chối đề xuất AI
- Tax-readiness checklist bằng tiếng Việt đơn giản
- Mini POS để tạo đơn và QR động cho khách
- Yêu cầu hỗ trợ SHB khi không tự giải quyết được

**Pain points:**
- Không biết chuyển khoản nào cho dịch vụ nào, tiền cá nhân vs tiền kinh doanh
- Phải tự so Excel, tải sao kê, đối soát thủ công
- Đến mùa thuế mới phát hiện thiếu hóa đơn
- Bị nhân viên ngân hàng gọi về giao dịch không nhớ

**Daily tasks:**
1. Đăng nhập Merchant Workspace
2. Xem dashboard — biết cửa hàng có bao nhiêu mục cần xác nhận
3. Xử lý ngoại lệ: duyệt/từ chối/phan loại lại
4. Tạo đơn qua Mini POS khi cần
5. Kiểm tra sẵn sàng thuế
6. Escalate case khó cho SHB khi cần

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-013, BR-015

### Persona 2 — Linh, SHB Merchant Support Staff (Primary Operational User)

**Role:** Nhân viên hỗ trợ merchant của SHB — người dùng vận hành chính của SHB Operations Console
**Label:** Assumption-based

**Goals:**
- Giám sát nhiều merchant cùng lúc
- Xử lý các case được escalate từ Merchant Workspace
- Đảm bảo merchant portfolio đang đi đúng tiến độ

**Needs:**
- Portfolio dashboard: trạng thái tất cả merchant đang quản lý
- Case queue: danh sách case escalated, ưu tiên, loại issue
- Agent trace: xem agent nào làm gì, confidence bao nhiêu
- Audit log: review quyết định, export cho compliance

**Pain points:**
- Phải gọi merchant nhiều lần về cùng một dữ liệu
- Không có cách structured để theo dõi mỗi merchant cần gì
- Không có audit trail cho quyết định đối soát

**Operational tasks:**
1. Mở SHB Operations Console
2. Xem portfolio dashboard — merchant nào cần chú ý
3. Nhận case escalated từ Merchant Workspace
4. Review agent trace và evidence
5. Phê duyệt hoặc từ chối action AI đề xuất
6. Draft tin nhắn cho merchant
7. Đóng case khi resolved

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-007, BR-015

### Persona 3 — Phong, Relationship Manager

**Role:** Relationship Manager at SHB — hỗ trợ merchant trực tiếp
**Label:** Assumption-based

**Goals:**
- Hỗ trợ merchant nhanh mà không cần đọc toàn bộ sao kê
- Biết chính xác mỗi merchant còn thiếu gì
- Tạo yêu cầu follow-up hiệu quả

**Needs:**
- Danh sách case được giao từ Linh
- Chi tiết case và action AI đề xuất
- Draft tin nhắn cho merchant

**Pain points:**
- Phải gọi merchant nhiều lần về cùng một dữ liệu
- Không có cách structured để theo dõi mỗi merchant cần gì

**Workflow:**
1. Nhận case được giao từ SHB Operations Console
2. Review chi tiết case và action AI đề xuất
3. Gửi draft tin nhắn cho merchant (sau khi review)
4. Theo dõi phản hồi merchant
5. Cập nhật trạng thái case

**Traces to:** BR-007, BR-008

### Persona 4 — Hà, Compliance/Tax Operations Specialist

**Role:** Chuyên viên compliance hoặc vận hành thuế — governance và audit
**Label:** Assumption-based

**Goals:**
- Đảm bảo hệ thống áp dụng đúng phiên bản tax rule
- Xác nhận mọi quyết định có bằng chứng nguồn và audit log
- Xác nhận report tham chiếu rule và thời gian hợp lệ

**Needs:**
- Tax-readiness report với rule version, effective date, và legal source
- Audit log export (JSON/CSV)
- Agent trace với tool call và rule reference

**Pain points:**
- Không verify được rule nào được áp dụng cho report cũ
- Không có audit trail structured cho quyết định đối soát
- Khó chứng minh compliance với auditor

**Workflow:**
1. Review tax-readiness report cho merchant
2. Verify rule version và effective date
3. Kiểm tra audit log cho quyết định quan trọng
4. Export audit log cho review ngoài

**Traces to:** BR-006, BR-009, BR-014, BR-015

### Pilot persona constraints

Từ `01-foundation/03-product-spec.md` §4:
- Hộ kinh doanh có doanh thu đủ lớn để cần kế toán và hóa đơn
- 1–3 địa điểm
- 3–15 nhân viên
- 30–200 giao dịch mỗi ngày
- Nhận cả tiền mặt và chuyển khoản
- Chưa có kế toán toàn thời gian
- Có thể đang dùng POS, Excel, hoặc ghi chép thủ công
- Vertical đầu tiên: salon/dịch vụ làm đẹp (danh mục gọn hơn, giá trị đơn cao hơn, chuyển khoản phổ biến, ít edge case hơn nhà hàng)

---

## 3. Business Requirements

| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| BR-001 | Kết nối dữ liệu giao dịch SHB với POS, tiền mặt, và hóa đơn qua adapter | High | Không có dữ liệu thống nhất thì không thể đối soát |
| BR-002 | Tự động đối soát thanh toán với đơn hàng dùng payment reference | High | Matching thủ công là tốn thời gian nhất |
| BR-003 | Fuzzy match giao dịch không có reference dùng candidate scoring | High | Giao dịch cũ và ngoài không có reference |
| BR-004 | Chỉ đưa ra ngoại lệ cần con người xem xét, không phải tất cả giao dịch | High | Nhân viên không thể review hàng trăm giao dịch thủ công |
| BR-005 | Không tự giải quyết giao dịch mơ hồ dưới ngưỡng confidence | High | Dữ liệu tài chính yêu cầu human approval cho quyết định rủi ro |
| BR-006 | Kiểm tra dữ liệu theo tax rule có phiên bản và tạo tax-readiness report | High | Merchant cần biết dữ liệu đã sẵn sàng cho thuế chưa |
| BR-007 | Tạo case và giao task cho RM cho ngoại lệ chưa giải quyết | Medium | Follow-up vận hành cần workflow structured |
| BR-008 | Xuất dữ liệu sạch sang hệ thống kế toán (MISA hoặc format chuẩn) | Medium | TaxLens không thay thế kế toán; nó feed kế toán |
| BR-009 | Audit mọi hành động agent, tool call, và human approval | High | Vận hành ngân hàng yêu cầu traceability đầy đủ |
| BR-010 | Hỗ trợ dynamic QR với payment reference cho matching deterministic | High | QR tĩnh gây mơ hồ với thanh toán cùng số tiền |
| BR-011 | Cung cấp Mini POS cho merchant không có POS | Medium | Một số merchant mục tiêu dùng Excel hoặc ghi chép thủ công |
| BR-012 | Đối soát ca tiền mặt cuối ca | Medium | Tiền mặt là phương thức thanh toán quan trọng cho merchant mục tiêu |
| BR-013 | AI hiểu nội dung chuyển khoản tiếng Việt (có/không dấu, viết tắt) | High | Nội dung chuyển khoản là nguồn mơ hồ chính |
| BR-014 | Không dùng LLM cho tính toán thuế, exact matching, hoặc phát hiện duplicate | High | Thao tác deterministic phải tái tạo và auditable được |
| BR-015 | Hiển thị agent trace cho thấy planner decomposition, tool call, và quyết định | Medium | Minh bạch tạo niềm tin; cần cho compliance |

---

## 4. User Stories

### Merchant Workspace — Daily Operations

#### USR-MW-RECON-001 — Auto-match with payment reference

**As a** business owner (Hương),
**I want** giao dịch có payment reference hợp lệ được tự động match với đơn hàng,
**so that** tôi không phải kiểm tra giao dịch chuẩn thủ công.

**Priority:** Must
**Traces to:** BR-002, FR-RECON-001

#### USR-MW-RECON-002 — Fuzzy match without reference

**As a** business owner (Hương),
**I want** giao dịch không có reference được match bằng candidate scoring,
**so that** giao dịch cũ và ngoài vẫn được đối soát.

**Priority:** Must
**Traces to:** BR-003, FR-RECON-002

#### USR-MW-RECON-003 — Exception Inbox for ambiguous transactions

**As a** business owner (Hương),
**I want** chỉ thấy giao dịch cần quyết định của tôi,
**so that** tôi tập trung vào điều quan trọng thay vì review tất cả.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

#### USR-MW-RECON-004 — AI suggestion with confidence and reasoning

**As a** business owner (Hương),
**I want** AI đề xuất phân loại kèm confidence score và lý do,
**so that** tôi ra quyết định nhanh và có thông tin.

**Priority:** Must
**Traces to:** BR-013, FR-RECON-004

#### USR-MW-RECON-005 — Payment allocation across multiple orders

**As a** business owner (Hương),
**I want** một thanh toán được phân bổ cho nhiều đơn hàng,
**so that** thanh toán một phần và thanh toán gộp được xử lý đúng.

**Priority:** Should
**Traces to:** BR-002, FR-RECON-005

#### USR-MW-RECON-006 — Approve or reject AI recommendation

**As a** business owner (Hương),
**I want** duyệt hoặc từ chối đề xuất AI cho giao dịch mơ hồ,
**so that** tôi giữ quyền kiểm soát cuối cùng.

**Priority:** Must
**Traces to:** BR-004, BR-005, FR-RECON-003

#### USR-MW-TAX-001 — Tax-readiness checklist

**As a** business owner (Hương),
**I want** checklist cho biết dữ liệu đã sẵn sàng cho thuế chưa,
**so that** tôi biết cần làm gì trước mùa thuế.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-001

#### USR-MW-TAX-002 — Detect missing invoices

**As a** business owner (Hương),
**I want** hệ thống flag đơn đã thanh toán nhưng thiếu hóa đơn,
**so that** tôi phát hành hóa đơn kịp thời.

**Priority:** Must
**Traces to:** BR-006, FR-TAX-003

#### USR-MW-TAX-003 — Draft export to accounting system

**As a** business owner (Hương),
**I want** xuất dữ liệu sạch ở format chuẩn,
**so that** import vào MISA hoặc gửi cho kế toán.

**Priority:** Should
**Traces to:** BR-008, FR-TAX-004

#### USR-MW-POS-001 — Create sale with Mini POS

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** chọn dịch vụ và tạo đơn hàng,
**so that** mỗi giao dịch có bản ghi ngay cả khi không có POS đầy đủ.

**Priority:** Must
**Traces to:** BR-011, FR-POS-001

#### USR-MW-POS-002 — Generate dynamic QR for payment

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** tạo QR code với số tiền và reference điền sẵn,
**so that** chuyển khoản của khách tự động match với đơn.

**Priority:** Must
**Traces to:** BR-010, FR-POS-002

#### USR-MW-POS-003 — Record cash payment

**As a** business owner (Hương) hoặc nhân viên salon,
**I want** ghi thanh toán tiền mặt bằng một nút bấm,
**so that** giao dịch tiền mặt được theo dõi không cần nhập thủ công.

**Priority:** Must
**Traces to:** BR-012, FR-POS-003

#### USR-MW-POS-004 — Cash reconciliation at shift end

**As a** business owner (Hương),
**I want** hệ thống so sánh tiền dự kiến với tiền đếm thực tế cuối ca,
**so that** chênh lệch được phát hiện ngay.

**Priority:** Should
**Traces to:** BR-012, FR-POS-004

#### USR-MW-AGENT-001 — View agent trace

**As a** business owner (Hương),
**I want** thấy agent nào làm gì, gọi tool nào, với confidence bao nhiêu,
**so that** tôi tin tưởng quyết định của hệ thống.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

#### USR-MW-SUPPORT-001 — Request SHB support

**As a** business owner (Hương),
**I want** yêu cầu hỗ trợ từ SHB khi không tự giải quyết được ngoại lệ,
**so that** case được escalate cho nhân viên SHB xử lý.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-001

#### USR-MW-CONFIRM-001 — Confirm transaction classification via link

**As a** business owner (Hương),
**I want** nhận link đơn giản để xác nhận giao dịch là gì,
**so that** tôi không phải gọi ngân hàng hay dùng hệ thống phức tạp.

**Priority:** Should
**Traces to:** BR-004, BR-005, FR-MERCHANT-001

### SHB Operations Console — Oversight & Case Management

#### USR-OPS-AGENT-001 — Natural language request to Planner

**As an** SHB operations employee (Linh),
**I want** nhập yêu cầu ngôn ngữ tự nhiên như "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
**so that** tôi không phải điều hướng nhiều menu.

**Priority:** Must
**Traces to:** BR-001, FR-AGENT-001

#### USR-OPS-AGENT-002 — View agent trace for escalated cases

**As an** SHB operations employee (Linh),
**I want** thấy agent trace đầy đủ cho case escalated,
**so that** tôi review evidence và ra quyết định có thông tin.

**Priority:** Must
**Traces to:** BR-015, FR-AGENT-002

#### USR-OPS-CASE-001 — Receive escalated cases

**As an** SHB operations employee (Linh),
**I want** nhận case được escalate từ Merchant Workspace,
**so that** tôi xử lý các ngoại lệ mà merchant không tự giải quyết được.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-001

#### USR-OPS-CASE-002 — Draft message to merchant

**As an** SHB operations employee (Linh) hoặc RM (Phong),
**I want** AI draft tin nhắn yêu cầu merchant xác nhận giao dịch,
**so that** tôi gửi nhanh mà không phải soạn từ đầu.

**Priority:** Must
**Traces to:** BR-007, FR-OPS-002

#### USR-OPS-CASE-003 — Assign task to RM

**As an** SHB operations employee (Linh),
**I want** case được giao cho RM đúng tự động,
**so that** follow-up diễn ra không cần routing thủ công.

**Priority:** Should
**Traces to:** BR-007, FR-OPS-003

#### USR-OPS-PORTFOLIO-001 — Monitor merchant portfolio health

**As an** SHB operations employee (Linh),
**I want** xem trạng thái tất cả merchant trong portfolio,
**so that** tôi biết merchant nào cần chú ý.

**Priority:** Should
**Traces to:** BR-001, BR-006

#### USR-OPS-LOWCONF-001 — Investigate low-confidence agent decisions

**As an** SHB operations employee (Linh),
**I want** xem danh sách quyết định AI có confidence thấp,
**so that** tôi review và phê duyệt trước khi finalize.

**Priority:** Should
**Traces to:** BR-015, FR-AGENT-002

### Compliance & Administration

#### USR-COMP-001 — Rule version in every report

**As a** compliance specialist (Hà),
**I want** mọi tax-readiness report hiển thị rule version và effective date,
**so that** tôi verify đúng rule được áp dụng.

**Priority:** Must
**Traces to:** BR-006, BR-014, FR-TAX-002

#### USR-COMP-002 — Export audit log

**As a** compliance specialist (Hà),
**I want** export toàn bộ audit log dưới dạng JSON hoặc CSV,
**so that** tôi cung cấp bằng chứng cho auditor.

**Priority:** Must
**Traces to:** BR-009, FR-AGENT-003

#### USR-COMP-003 — Review tax-rule versions

**As a** compliance specialist (Hà),
**I want** xem và phê duyệt cập nhật tax rule version,
**so that** hệ thống luôn dùng rule mới nhất đã được duyệt.

**Priority:** Should
**Traces to:** BR-014, FR-TAX-002

---

## 5. Functional Requirements

### Reconciliation

#### FR-RECON-001: Exact matching by payment reference

**Description:** Hệ thống tự động match giao dịch ngân hàng với đơn hàng khi có payment reference hợp lệ, số tiền khớp, đơn chưa thanh toán, và giao dịch chưa được dùng cho allocation khác.

**Acceptance criteria:**
- [ ] Giao dịch có reference hợp lệ và số tiền khớp được auto-match với đơn đúng
- [ ] Giao dịch có reference hợp lệ nhưng số tiền không khớp không được auto-match
- [ ] Giao dịch tham chiếu đơn đã thanh toán không được match
- [ ] Giao dịch đã được allocate cho đơn khác không được match lại
- [ ] Kết quả match bao gồm confidence score 100% cho exact match

**Business rules:**
- Reference phải tồn tại trong payment_intents table và chưa hết hạn
- Số tiền phải khớp chính xác (không dung sai cho exact match)
- Order payment_status phải là `UNPAID` hoặc `PARTIAL`

**Edge cases:**
- Input không hợp lệ: Reference sai format → không match, log là unmatched
- Empty state: Không có giao dịch → return 0 matched, 0 unmatched
- Permission denied: User không có merchant access → 403

**Traces to:** BR-002, USR-RECON-001

#### FR-RECON-002: Candidate matching without reference

**Description:** Khi không có payment reference, hệ thống tạo candidate match dựa trên merchant, số tiền gần khớp, khoảng thời gian, trạng thái đơn, độ quen của tên người gửi, và nội dung chuyển khoản. Mỗi candidate nhận match score.

**Acceptance criteria:**
- [ ] Candidate chỉ được tạo cho cùng merchant và store
- [ ] Score dùng weighted factor: số tiền chính xác (+50), thời gian <1phút (+20), reference/match (+20), người gửi quen (+10), nhiều đơn cùng số tiền (-30)
- [ ] Score ≥95%: auto-match
- [ ] Score 75–94%: đặt vào Exception Inbox để xác nhận con người
- [ ] Score <75%: mark `UNMATCHED`
- [ ] Giao dịch đã dùng được loại khỏi candidate

**Business rules:**
- Scoring weight có thể cấu hình trong tax_rule_versions (xem §8 Matching Algorithm)
- Time window mặc định: 60 phút
- Amount proximity: chỉ exact match cho MVP (không dung sai)

**Edge cases:**
- Hai đơn giống hệt và không có identifier → ngoại lệ bắt buộc (không đoán)
- Không tìm thấy candidate → giao dịch mark `UNMATCHED`
- Nhiều candidate cùng score → tạo exception

**Traces to:** BR-003, USR-RECON-002

#### FR-RECON-003: Exception Inbox

**Description:** Hệ thống chỉ hiển thị giao dịch cần quyết định con người, không hiển thị toàn bộ danh sách. Mỗi ngoại lệ hiển thị số tiền, người gửi, nội dung chuyển khoản, đề xuất AI, confidence, và lý do.

**Acceptance criteria:**
- [ ] Chỉ mục có confidence <95% hoặc flag mơ hồ xuất hiện trong Inbox
- [ ] Mỗi ngoại lệ hiển thị: số tiền, người gửi, raw note, normalized note, đề xuất AI, confidence %, reasoning factor
- [ ] User có thể approve, reject, hoặc reclassify mỗi ngoại lệ
- [ ] Quyết định user được log trong audit_events
- [ ] Ngoại lệ đã xử lý biến mất khỏi Inbox
- [ ] Inbox hỗ trợ lọc theo merchant, kỳ, và loại ngoại lệ

**Business rules:**
- Ngoại lệ được tạo bởi Reconciliation Agent khi auto-match thất bại
- Loại ngoại lệ: `AMBIGUOUS_MATCH`, `NO_MATCH`, `DUPLICATE_CANDIDATE`, `MISSING_INVOICE`, `CASH_DISCREPANCY`

**Edge cases:**
- Empty state: Không có ngoại lệ → hiển thị "Tất cả giao dịch đã đối soát"
- Permission denied: User không có merchant access → 403

**Traces to:** BR-004, BR-005, USR-RECON-003

#### FR-RECON-004: AI suggestion with confidence and reasoning

**Description:** Cho mỗi ngoại lệ, AI cung cấp phân loại đề xuất kèm confidence score và lý do con người đọc được giải thích factor ảnh hưởng đến đề xuất.

**Acceptance criteria:**
- [ ] Đề xuất bao gồm: suggested_type (vd, `internal_transfer`, `revenue`, `loan`, `other`), confidence (0.0–1.0), và reasoning array
- [ ] Reasoning liệt kê bằng chứng cụ thể: tên người gửi khớp, số tiền khớp, pattern lịch sử, hiểu note
- [ ] AI hiểu note tiếng Việt xử lý có dấu, không dấu, và viết tắt
- [ ] Raw note, normalized note, và AI interpretation được lưu riêng (ba lớp)
- [ ] Đề xuất không bao giờ auto-apply khi confidence <0.95

**Business rules:**
- AI không được dùng raw note làm identifier hoặc bằng chứng duy nhất
- AI phải tìm bằng chứng bổ trợ (hóa đơn, lịch sử supplier, giao dịch đã xác nhận trước đó)
- Nếu bằng chứng không đủ, giao dịch vào Exception Inbox

**Edge cases:**
- Note rỗng: AI dùng signal khác (số tiền, người gửi, thời gian)
- Bằng chứng xung đột: AI trình bày cả hai khả năng với confidence tương ứng

**Traces to:** BR-013, USR-RECON-004

#### FR-RECON-005: Payment allocation

**Description:** Hệ thống hỗ trợ phân bổ một thanh toán cho nhiều đơn hàng và nhiều thanh toán cho một đơn hàng qua payment_allocations table.

**Acceptance criteria:**
- [ ] Một thanh toán có thể chia cho nhiều đơn hàng
- [ ] Nhiều thanh toán có thể allocate cho một đơn hàng
- [ ] Allocation phải tổng bằng số tiền thanh toán (không over-allocation)
- [ ] Thanh toán một phần được hỗ trợ (đơn giữ `PARTIAL`)
- [ ] Hoàn tiền tạo negative allocation
- [ ] Deposit và số dư còn lại được hỗ trợ

**Business rules:**
- Allocation là many-to-many qua payment_allocations table
- Mỗi allocation có amount, order_id, payment_id, và audit trail

**Edge cases:**
- Over-payment: số tiền dư được flag là ngoại lệ
- Under-payment: đơn giữ status `PARTIAL`

**Traces to:** BR-002, USR-RECON-005

### Tax & Compliance

#### FR-TAX-001: Tax-readiness checklist

**Description:** Hệ thống hiển thị checklist cho biết dữ liệu merchant đã sẵn sàng cho thuế chưa, bao gồm tỷ lệ đối soát, đóng ca tiền mặt, giao dịch chưa phân loại, và thiếu hóa đơn.

**Acceptance criteria:**
- [ ] Checklist hiển thị: % đối soát ngân hàng, % đóng ca tiền mặt, số giao dịch chưa phân loại, số đơn thiếu hóa đơn, rule version hiện tại
- [ ] Mỗi mục có status pass/fail với ngưỡng
- [ ] Khi tất cả pass, hệ thống hiển thị "Dữ liệu sẵn sàng cho xuất nháp và quy trình kế toán/thuế"
- [ ] Checklist tham chiếu rule version đang hiệu lực

**Business rules:**
- Ngưỡng đối soát: ≥95% để "pass"
- Đóng ca tiền mặt: 100% yêu cầu
- Giao dịch chưa phân loại: 0 yêu cầu
- Thiếu hóa đơn: 0 yêu cầu

**Edge cases:**
- Không có dữ liệu cho kỳ: tất cả mục hiển thị "Không có dữ liệu"
- Rule version hết hạn: hiển thị warning

**Traces to:** BR-006, USR-TAX-001

#### FR-TAX-002: Rule version in report

**Description:** Mọi tax-readiness report bao gồm rule version, effective date, legal source, approver, và timestamp tạo.

**Acceptance criteria:**
- [ ] Report header bao gồm: rule_version (vd, `2026.07`), effective_from, effective_to, legal_source, approved_by, generated_at
- [ ] Report tái tạo được: cùng dữ liệu + cùng rule version = cùng output
- [ ] LLM không tính công thức thuế; chỉ retrieve và giải thích rule

**Business rules:**
- Tax Rules Engine là deterministic và tách khỏi LLM (xem DEC-004)
- Rule version không thay đổi sau khi phê duyệt

**Edge cases:**
- Không tìm thấy rule version: error, không tạo report
- Dữ liệu trải nhiều rule version: report dùng version hiệu lực tại cuối kỳ

**Traces to:** BR-006, BR-014, USR-TAX-002

#### FR-TAX-003: Missing invoice detection

**Description:** Hệ thống phát hiện đơn đã thanh toán nhưng không có hóa đơn tương ứng.

**Acceptance criteria:**
- [ ] Đơn đã thanh toán (payment_status = `PAID`) không có hóa đơn liên kết được flag
- [ ] Đơn được flag xuất hiện trong Exception Inbox với type `MISSING_INVOICE`
- [ ] Số lượng hóa đơn thiếu xuất hiện trong checklist tax-readiness

**Business rules:**
- Liên kết hóa đơn qua order_id reference trong invoices table
- Đơn với `invoice_status = EXEMPT` không được flag

**Edge cases:**
- Hóa đơn tồn tại nhưng sai số tiền: flag `INVOICE_MISMATCH`
- Không có hệ thống hóa đơn kết nối: tất cả đơn đã thanh toán được flag (warning)

**Traces to:** BR-006, USR-TAX-003

#### FR-TAX-004: Draft export

**Description:** Hệ thống xuất dữ liệu sạch, đã đối soát ở format chuẩn phù hợp import vào MISA hoặc hệ thống kế toán khác.

**Acceptance criteria:**
- [ ] Export bao gồm: thông tin merchant, kỳ, giao dịch đã đối soát, đơn hàng, allocation, phân loại thuế
- [ ] Export format: JSON và CSV
- [ ] Export bao gồm rule version và timestamp tạo
- [ ] Export loại trừ ngoại lệ chưa giải quyết
- [ ] Export có thể tải từ UI

**Business rules:**
- Chỉ dữ liệu từ merchant có status tax-readiness "pass" mới được export
- Export là nháp, không phải kê khai thuế

**Edge cases:**
- Không có dữ liệu đã đối soát: export rỗng với header
- Readiness một phần: export bị block kèm giải thích

**Traces to:** BR-008, USR-TAX-004

### Merchant Operations

#### FR-OPS-001: Case creation

**Description:** Merchant Operations Agent tạo case cho ngoại lệ chưa giải quyết với merchant, kỳ, loại issue, và priority.

**Acceptance criteria:**
- [ ] Case được tạo cho mỗi ngoại lệ chưa giải quyết sau đối soát
- [ ] Case bao gồm: case_id, merchant_id, period, exception reference, status, priority
- [ ] Case status bắt đầu là `OPEN`
- [ ] Case hiển thị trong SHB case-management UI (hoặc mock)

**Business rules:**
- Một case mỗi merchant mỗi kỳ cho batch exception
- Ngoại lệ priority cao riêng có thể có case riêng

**Edge cases:**
- Không có ngoại lệ: không tạo case
- Case management API không khả dụng: case lưu local với sync flag

**Traces to:** BR-007, USR-OPS-001

#### FR-OPS-002: Draft merchant message

**Description:** AI draft tin nhắn tiếng Việt yêu cầu merchant xác nhận phân loại giao dịch.

**Acceptance criteria:**
- [ ] Tin nhắn bằng tiếng Việt
- [ ] Tin nhắn bao gồm: số tiền giao dịch, người gửi, ngày, đề xuất AI, và câu hỏi rõ ràng
- [ ] Tin nhắn lưu là draft; không gửi mà không có RM review
- [ ] RM có thể sửa tin nhắn trước khi gửi
- [ ] Tin nhắn bao gồm link xác nhận (nếu áp dụng)

**Business rules:**
- Tone tin nhắn: lịch sự, đơn giản, không kỹ thuật
- Tin nhắn không được chứa internal system ID hoặc tên agent

**Edge cases:**
- Merchant không có thông tin liên lạc: case flag cho follow-up điện thoại
- Nhiều ngoại lệ cùng merchant: gộp tin nhắn

**Traces to:** BR-007, USR-OPS-002

#### FR-OPS-003: RM assignment

**Description:** Hệ thống giao case cho Relationship Manager phù hợp dựa trên merchant assignment.

**Acceptance criteria:**
- [ ] Case được giao cho RM mapped với merchant
- [ ] Assignment hiển thị trong chi tiết case
- [ ] RM nhận notification (MVP: dashboard notification)
- [ ] Merchant chưa assign: case giao cho default queue

**Business rules:**
- RM-merchant mapping được duy trì trong users/merchants relationship
- Reassignment cần manager approval

**Edge cases:**
- RM inactive: case reassign cho backup RM
- Không có RM mapping: default queue

**Traces to:** BR-007, USR-OPS-003

### Mini POS & Payments

#### FR-POS-001: Mini POS sale creation

**Description:** Giao diện POS tối thiểu cho phép nhân viên chọn sản phẩm/dịch vụ, điều chỉnh số lượng, tính tổng, và tạo đơn hàng.

**Acceptance criteria:**
- [ ] Nhân viên chọn sản phẩm hoặc dịch vụ từ catalog
- [ ] Nhân viên điều chỉnh số lượng
- [ ] Hệ thống tính gross_amount, discount, và net_amount
- [ ] Sale record bao gồm: sale_id, merchant_id, store_id, device_id, staff_id, created_at, items, gross_amount, discount, net_amount, payment_status, invoice_status
- [ ] Nhân viên chọn `Cash` hoặc `Generate QR` cho thanh toán
- [ ] Cancel/refund tạo audit log entry

**Business rules:**
- Mini POS không phải POS đầy đủ: không CRM, attendance, marketing, loyalty, HR, purchasing nâng cao, hoặc production module
- Tạo sale là idempotent (cùng request không tạo duplicate)

**Edge cases:**
- Catalog rỗng: nhân viên nhập custom item với tên và giá
- Network offline: sale cache local, sync khi online (post-MVP)

**Traces to:** BR-011, USR-POS-001

#### FR-POS-002: Dynamic QR generation

**Description:** Hệ thống tạo dynamic QR code chứa tài khoản merchant, số tiền, và payment reference duy nhất cho mỗi payment intent.

**Acceptance criteria:**
- [ ] QR chứa: SHB merchant account, số tiền chính xác, payment_reference (vd, `PAY-X7K92P`)
- [ ] Payment intent hết hạn sau 15 phút
- [ ] QR hiển thị trên màn hình cho khách quét
- [ ] Webhook từ bank/SePay match reference auto-update order status thành `PAID`
- [ ] QR hết hạn: payment intent mark `EXPIRED`, không accept match

**Business rules:**
- Reference format: `PAY-` + 6 ký tự alphanumeric
- Reference duy nhất mỗi payment intent
- Một reference mỗi đơn mỗi lần thanh toán

**Edge cases:**
- Khách thanh toán sau khi hết hạn: giao dịch đi qua fuzzy matching
- Quét nhiều lần: cùng QR hiển thị; webhook đầu tiên thắng

**Traces to:** BR-010, USR-POS-002

#### FR-POS-003: Cash payment recording

**Description:** Nhân viên ghi thanh toán tiền mặt bằng một nút bấm, link với đơn hàng hiện tại.

**Acceptance criteria:**
- [ ] Thanh toán tiền mặt tạo cash_session entry hoặc append vào session active
- [ ] Order payment_status update thành `PAID`
- [ ] Cash entry bao gồm: amount, staff_id, timestamp, sale_id
- [ ] Cash session theo dõi: opening_cash, expected_cash, counted_cash, discrepancy

**Business rules:**
- Cash session mỗi store mỗi ca
- Chỉ một cash session active mỗi store

**Edge cases:**
- Không có session active: hệ thống tự tạo
- Số tiền không khớp với đơn: flag để review

**Traces to:** BR-012, USR-POS-003

#### FR-POS-004: Cash reconciliation at shift end

**Description:** Cuối ca, hệ thống so sánh tiền dự kiến (đầu ca + doanh thu - chi phí) với tiền đếm thực tế và báo chênh lệch.

**Acceptance criteria:**
- [ ] Hệ thống hiển thị: tiền đầu ca, doanh thu tiền mặt qua POS, chi phí tiền mặt, tiền dự kiến, tiền đếm (input), chênh lệch
- [ ] Chênh lệch >0 hoặc <0 được flag
- [ ] Nhân viên phải cung cấp lý do chênh lệch
- [ ] Cash session đóng và khóa sau khi đối soát
- [ ] Chênh lệch xuất hiện trong checklist tax-readiness nếu chưa giải quyết

**Business rules:**
- Hệ thống không xác định được giao dịch tiền mặt cụ thể nào thiếu nếu nhân viên không tạo đơn
- Lý do chênh lệch được log trong audit_events

**Edge cases:**
- Tiền đếm không nhập: session giữ mở
- Chênh lệch = 0: session đóng sạch

**Traces to:** BR-012, USR-POS-004

### Agent Orchestration & Trace

#### FR-AGENT-001: Natural language request to Planner

**Description:** User nhập yêu cầu ngôn ngữ tự nhiên (vd, "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa"), Planner Agent phân tách thành plan thực thi nhiều bước.

**Acceptance criteria:**
- [ ] Planner accept input tiếng Việt hoặc tiếng Anh
- [ ] Planner tạo plan với bước đánh số và dependency
- [ ] Plan bao gồm: fetch merchant profile, fetch giao dịch, fetch đơn/tiền mặt, đối soát, kiểm tra hóa đơn, chạy tax rule, tạo ngoại lệ, mở case, draft report
- [ ] Plan hiển thị cho user trước khi thực thi
- [ ] Planner giao mỗi bước cho specialist agent phù hợp
- [ ] Planner không tự làm classification chi tiết hoặc sửa dữ liệu

**Business rules:**
- Planner chỉ được delegate; không được gọi specialist tool trực tiếp
- Plan state được persist trong agent_runs table

**Edge cases:**
- Yêu cầu mơ hồ: Planner yêu cầu làm rõ
- Không tìm thấy merchant: Planner trả error kèm gợi ý

**Traces to:** BR-001, USR-AGENT-001

#### FR-AGENT-002: Agent trace display

**Description:** Hệ thống hiển thị trace đầy đủ hành động agent bao gồm planner decomposition, agent assignment, tool call, dữ liệu truy cập, quyết định, confidence score, rule version, và bước human approval.

**Acceptance criteria:**
- [ ] Trace hiển thị: plan step, agent nào thực thi mỗi bước, tool nào được gọi, input/output hash, confidence, rule version, timestamp
- [ ] Trace chỉ ra bước nào đang chờ human approval
- [ ] Trace hiển thị real-time trong khi thực thi
- [ ] Trace được persist và xem được sau khi hoàn thành
- [ ] Trace link với audit_events record

**Business rules:**
- Trace data đến từ agent_runs và tool_calls table
- Trace là read-only sau khi agent run hoàn thành

**Edge cases:**
- Agent run thất bại: trace hiển thị điểm thất bại và error
- Không có agent run: trace view rỗng

**Traces to:** BR-015, USR-AGENT-002

#### FR-AGENT-003: Audit log export

**Description:** Hệ thống export toàn bộ audit log dưới dạng JSON hoặc CSV.

**Acceptance criteria:**
- [ ] Export bao gồm tất cả audit_event cho merchant và kỳ chỉ định
- [ ] Export field: actor_type, actor_id, agent_name, action, tool_name, input_hash, output_hash, rule_version, confidence, approval_status, timestamp
- [ ] JSON export là JSON hợp lệ
- [ ] CSV export là CSV hợp lệ với header
- [ ] Export có thể tải từ UI

**Business rules:**
- Audit event chỉ thêm; export phản ánh tất cả event
- Export yêu cầu role compliance hoặc admin

**Edge cases:**
- Không có event: export rỗng chỉ với header
- Export lớn: pagination hoặc streaming (post-MVP)

**Traces to:** BR-009, USR-AGENT-003

### Merchant Confirmation

#### FR-MERCHANT-001: Transaction confirmation link

**Description:** Merchant nhận link để xác nhận hoặc sửa phân loại giao dịch mà không cần truy cập hệ thống nội bộ SHB.

**Acceptance criteria:**
- [ ] Link hiển thị: số tiền giao dịch, người gửi, ngày, đề xuất AI, và tùy chọn (xác nhận/sửa)
- [ ] Merchant chọn từ phân loại đề xuất hoặc cung cấp phân loại riêng
- [ ] Phản hồi merchant được log trong audit_events
- [ ] Link hết hạn sau 7 ngày
- [ ] Link không yêu cầu SHB login

**Business rules:**
- Link dựa trên token, không phải session
- Một link mỗi ngoại lệ
- Phản hồi update exception status và có thể đóng case

**Edge cases:**
- Link hết hạn: "Link hết hạn, vui lòng liên hệ RM của bạn"
- Đã phản hồi: "Đã xác nhận"
- Token không hợp lệ: "Link không hợp lệ"

**Traces to:** BR-004, BR-005, USR-MERCHANT-001

### Data Ingestion

#### FR-DATA-001: Canonical Event Ledger ingestion

**Description:** Tất cả nguồn dữ liệu được chuẩn hóa vào Canonical Event Ledger qua adapter.

**Acceptance criteria:**
- [ ] Giao dịch SHB được ingest qua SHB adapter (sandbox/mock)
- [ ] Đơn POS được ingest qua POS adapter hoặc Mini POS
- [ ] Cash session được ingest từ Mini POS cash entry
- [ ] Hóa đơn được ingest qua invoice adapter (mock)
- [ ] CSV/Excel import được hỗ trợ cho dữ liệu cũ
- [ ] Mỗi record ingest có source, source_id, và ingestion timestamp
- [ ] Duplicate source record được phát hiện và bỏ qua

**Business rules:**
- Adapter map schema ngoài sang canonical schema (xem `docs/03-engineering/03-integration.md`)
- Ingestion là idempotent: cùng source record ingest hai lần không tạo duplicate

**Edge cases:**
- Source data sai format: log và bỏ qua với error record
- Adapter không khả dụng: ingestion queue để retry

**Traces to:** BR-001

---

## 6. Non-Functional Requirements

### Performance

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-PERF-001 | Phản hồi trạng thái workflow ban đầu | <5 giây | API timing từ request đến status đầu tiên |
| NFR-PERF-002 | Hoàn thành case đầy đủ trên dữ liệu demo | <30 giây | End-to-end timing từ request đến completion |
| NFR-PERF-003 | Exact match lookup | <100ms mỗi giao dịch | Database query timing |
| NFR-PERF-004 | Fuzzy match candidate generation | <500ms mỗi giao dịch | Algorithm execution timing |
| NFR-PERF-005 | UI page load | <2 giây | Browser performance metric |
| NFR-PERF-006 | Audit log export (1000 event) | <5 giây | Export generation timing |

### Availability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-AVAIL-001 | MVP demo availability | 99% trong demo window | Uptime monitoring |
| NFR-AVAIL-002 | Agent run recovery | Run thất bại được retry một lần, rồi mark FAILED | Agent run log |

### Scalability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-SCALE-001 | Khối lượng dữ liệu MVP | 30 đơn hàng, 20 chuyển khoản, 8 thanh toán tiền mặt, 2 không doanh thu, 2 mơ hồ, 1 hoàn tiền | Demo dataset |
| NFR-SCALE-002 | Khối lượng dữ liệu pilot | 30–200 giao dịch mỗi merchant mỗi ngày | Pilot monitoring |
| NFR-SCALE-003 | Concurrent user (MVP) | 5 user đồng thời | Load test |

### Security NFRs

See `docs/03-engineering/04-security-and-permissions.md` for security requirements. This document references, not duplicates, the security spec.

### Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-COMPAT-001 | Browser support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| NFR-COMPAT-002 | Kích thước màn hình | Desktop 1280px+, tablet 768px+ (MVP: chỉ desktop) |
| NFR-COMPAT-003 | Ngôn ngữ | Tiếng Việt (chính), tiếng Anh (tài liệu) |

### Limits

| ID | Limit | Value |
|---|---|---|
| NFR-LIMIT-001 | QR hết hạn | 15 phút |
| NFR-LIMIT-002 | Link xác nhận merchant hết hạn | 7 ngày |
| NFR-LIMIT-003 | Giao dịch tối đa mỗi lần đối soát | 10.000 (MVP: 100) |
| NFR-LIMIT-004 | Số dòng export tối đa | 50.000 (MVP: 1.000) |

### Data retention

| Data | Retention | Purge mechanism |
|---|---|---|
| audit_events | 7 năm (yêu cầu ngân hàng) | Archive sang cold storage sau 7 năm |
| agent_runs | 2 năm | Xóa sau 2 năm |
| tool_calls | 2 năm | Xóa cùng agent_run liên quan |
| reconciliation_cases | 5 năm | Archive sau 5 năm |
| payment_intents (hết hạn) | 90 ngày | Tự động xóa sau khi hết hạn |
| merchant confirmation token | 7 ngày | Tự động xóa sau khi hết hạn |

---

## 7. AI Agent Specification

### AI capabilities and limits

#### AI is permitted to:

| Capability | Agent | Description |
|---|---|---|
| Interpret Vietnamese transfer notes | Reconciliation | Normalize diacritics, expand abbreviations, suggest transaction type |
| Score candidate matches | Reconciliation | Weight factors và produce confidence score |
| Explain match reasoning | Reconciliation | Generate human-readable reasoning cho match suggestions |
| Plan task decomposition | Planner | Break complex requests thành steps và assign cho agents |
| Explain tax rules in simple language | Tax & Compliance | Retrieve và paraphrase rule content |
| Classify revenue category | Tax & Compliance | Suggest classification dựa trên transaction patterns |
| Draft merchant messages | Merchant Ops | Compose Vietnamese confirmation requests |
| Retrieve business guidance | All | Inline context injection trong agent prompts (business rules ~200 lines) |

#### AI is NOT permitted to:

| Prohibited | Reason |
|---|---|
| Compute tax formulas | Must be deterministic and auditable (DEC-004) |
| Perform exact matching | Must be deterministic (reference-based) |
| Detect duplicate transaction IDs | Must be deterministic (database check) |
| Modify tax rules | Rules immutable once approved |
| Auto-resolve transactions with confidence <95% | Requires human approval (DEC-005) |
| Submit tax filings | MVP only produces draft export |
| Issue production invoices | Only mock provider |
| Access tools outside allowlist | Security boundary (SEC-RBAC-003) |
| Make final decisions on high-risk transactions | Requires human approval |
| Send messages without RM review | Draft only; RM must approve |

### Agent specifications

#### Planner Agent

| Aspect | Detail |
|---|---|
| Role | Phân tách complex requests thành tasks; delegate cho specialists |
| LLM model | `DEEPSEEK_MODEL` env var (default: `deepseek-v4-flash`); `LLM_MODEL_PLANNER` in config.py |
| Tools allowed | Không trực tiếp — delegate cho specialist agents |
| Output schema | `{"plan": [{"step": N, "action": "...", "agent": "..."}]}` |
| State machine | PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED/FAILED |
| Cấm | Direct tool calls, detailed classification, data correction |

**System prompt (tóm tắt):**
> You are the Planner Agent for TaxLens, a merchant TaxOps system for SHB bank. Your job is to decompose operational requests into a multi-step plan and delegate each step to the appropriate specialist agent. You do not call tools directly. You produce a structured plan. Agents: reconciliation, tax_compliance, merchant_ops.

#### Reconciliation Agent

| Aspect | Detail |
|---|---|
| Role | Match transactions với orders; tạo exceptions cho ambiguous cases |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`, `score_match_candidates`, `create_reconciliation_exception` |
| Output schema | `{"merchant_id": "...", "matched": N, "unmatched": N, "duplicate_candidates": N, "missing_invoice_cases": N, "exceptions": [...]}` |

#### Tax & Compliance Agent

| Aspect | Detail |
|---|---|
| Role | Validate data theo tax rules; generate tax-readiness report |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export` |
| Cấm | Tax formula computation, rule modification, filing submission |
| Output schema | `{"rule_version": "...", "checklist": [...], "ready": bool, "report": {...}}` |

#### Merchant Operations Agent

| Aspect | Detail |
|---|---|
| Role | Turn analysis results thành actions: cases, RM assignments, messages, exports |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system` |
| Output schema | `{"cases_created": N, "messages_drafted": N, "exports_created": N, "case_ids": [...]}` |

### Tool contracts

Mỗi tool có typed schema. Tools được gọi qua typed function calling.

```python
# Example tool contract
@tool
def score_match_candidates(
    merchant_id: str,
    amount: Decimal,
    time_window_minutes: int = 60,
    sender_name: str | None = None,
    note: str | None = None,
) -> list[MatchCandidate]:
    """Score candidate orders cho một bank transaction.
    
    Returns list of candidates với scores. Không auto-match.
    Auto-match được xử lý bởi deterministic matching engine.
    """
```

### Shared Case State (inter-agent contract)

```json
{
  "case_id": "CASE-001",
  "merchant_id": "M001",
  "period": "2026-07",
  "transactions": [],
  "sales": [],
  "matches": [],
  "exceptions": [],
  "tax_rule_version": "2026.07",
  "human_approvals": [],
  "case_status": "WAITING_FOR_CONFIRMATION"
}
```

Agents read và write specific fields. Planner điều phối agent nào write khi nào.

### LLM provider and tool protocol

| Aspect | Detail |
|---|---|
| Provider | DeepSeek V4 Flash (OpenAI-compatible endpoint) |
| Model | `deepseek-v4-flash` (default; overridable via `DEEPSEEK_MODEL` env var) |
| Fallback provider | OpenRouter (`deepseek/deepseek-v4-flash` via `OPENROUTER_API_KEY`) |
| Thinking mode | Bật cho Planner Agent (task decomposition cần reasoning) |
| Tool protocol | Typed function calling (Python functions với type hints passed to LLM) |
| API auth | `Authorization: Bearer DEEPSEEK_API_KEY` (or `OPENROUTER_API_KEY` for OpenRouter) |
| Endpoint | `https://api.deepseek.com/v1` (default) or `https://openrouter.ai/api/v1` (fallback) |
| Temperature | 0.1 cho task deterministic (matching, tax); 0.3 cho message drafting |

### Error handling and hallucination

| Tình huống | Cách xử lý |
|---|---|
| LLM trả invalid JSON | Retry với format instruction (max 2 retries); sau đó fail run |
| LLM hallucinate tool không trong allowlist | Tool call rejected; logged trong audit_events; run tiếp tục với next step |
| LLM suggest action ngoài role | Suggestion ignored; logged |
| LLM confidence là None hoặc invalid | Default về 0.0; force human review |
| LLM provider unavailable | Fall back về rule-based default; log error; flag cho retry |

### Budget and rate limits

| Metric | Limit | Enforcement |
|---|---|---|
| LLM calls per agent run | 50 | Counter trong agent_runs; run fails nếu vượt |
| LLM tokens per call | 10,000 input, 2,000 output | Truncate input nếu vượt |
| Concurrent agent runs | 5 | Queue qua Redis |
| Context injection lookups per run | 20 | Counter trong tool_calls |

### Privacy and data retention for AI interactions

- Sensitive data (account numbers, tax IDs, full names) masked trước LLM call (SEC-MASK-001)
- LLM prompts và responses KHÔNG store full; chỉ input_hash và output_hash trong tool_calls
- Business guidance documents injected trực tiếp vào agent prompts (~200 lines, không cần vector search)
- Không LLM provider training trên TaxLens data (provider API configured)

---

## 8. Matching Algorithm Specification

### Overview

Matching algorithm đối soát bank transactions với sales orders. Có hai mode:

1. **Exact matching** — deterministic, dùng payment reference
2. **Candidate matching** — probabilistic, dùng weighted scoring factors

Algorithm là core difficulty của product: match bank transfer Việt Nam (với note không đáng tin) với order cụ thể.

### Exact matching

```text
1. Extract payment reference từ raw_note
   - Pattern: PAY-[A-Z0-9]{6}
   - Nếu không tìm thấy pattern → chuyển sang candidate matching

2. Look up payment_intent bằng reference
   - Nếu không tìm thấy → no exact match, chuyển sang candidate matching
   - Nếu tìm thấy nhưng expired → no exact match, chuyển sang candidate matching

3. Verify amount match
   - Nếu bank_transaction.amount == payment_intent.amount → continue
   - Nếu mismatch → no exact match, chuyển sang candidate matching

4. Verify sale chưa paid
   - Nếu sale.payment_status == UNPAID → continue
   - Nếu sale.payment_status == PARTIAL → continue (cho remaining amount)
   - Nếu sale.payment_status == PAID → no match (đã paid)

5. Verify transaction chưa được allocate
   - Query payment_allocations cho bank_transaction_id
   - Nếu đã allocated → no match

6. Create match
   - Create payment_allocation(bank_transaction_id, payment_intent_id, sale_id, amount, match_method=EXACT, confidence=1.0)
   - Update sale.payment_status = PAID
   - Create audit_event
```

### Candidate matching

```text
1. Get candidate sales
   - Filter: cùng merchant_id, cùng store_id (nếu determinable)
   - Filter: payment_status IN (UNPAID, PARTIAL)
   - Filter: chưa fully allocated
   - Filter: time window mặc định 60 phút
   - Compare transaction amount với outstanding amount của sale
   - Amount tolerance = min(10.000đ, max(1.000đ, 0,5% × sale.net_amount))

2. Cho mỗi candidate, compute score:
   score = 0
   
   a. Amount match
      if candidate.outstanding_amount == transaction.amount:
         score += 50
      elif amount difference nằm trong tolerance:
         score += 35
         candidate không được AUTO_MATCH
   
   b. Time proximity
      time_diff = abs(transaction.transaction_date - candidate.created_at)
      if time_diff < 1 minute:
         score += 20
      elif time_diff < 5 minutes:
         score += 10
      elif time_diff < 30 minutes:
         score += 5
   
   c. Candidate-owned identifier match
      if raw_note chứa exact token của table number, sale identifier, hoặc legacy reference:
         score += 20
   
   d. Sender name familiarity
      if transaction.sender_name in merchant.customer_history:
         score += 10
   
   e. Note content signal
      if AI interpretation của note relates đến candidate product/service:
         score += 5
      Note signal chỉ dùng cho ranking/reasoning và HUMAN_CONFIRM;
      không được cộng vào deterministic score để mở khóa AUTO_MATCH.
   
   f. Multiple same-amount penalty
      count_same_amount = count unpaid sales cùng amount
      if count_same_amount > 1 AND candidate không có unique differentiating identifier:
         score -= 30
   
   g. Already-used transaction
      if transaction đã allocated:
         exclude khỏi candidates (không chỉ penalty)

3. Normalize scores về 0-100
   deterministic_score = max(0, min(100, deterministic factors))
   display_score = max(0, min(100, deterministic_score + note_signal))
   display_score là heuristic match score, không phải xác suất thống kê.

4. Apply thresholds và safety gates
   if exact amount
      AND deterministic_score >= 95
      AND không có ambiguity
      AND mọi competing candidate có display_score < 75:
      action = AUTO_MATCH
   elif display_score >= 75:
      action = HUMAN_CONFIRM
   elif unique exact-amount candidate AND time_diff < 1 minute:
      action = HUMAN_CONFIRM  # amount + time không đủ để auto-match
   else:
      action = UNMATCHED

   Tie, nhiều candidate >=75, unresolved duplicate amount, hoặc amount mismatch
   luôn chặn AUTO_MATCH. Amount mismatch chỉ HUMAN_CONFIRM khi đủ evidence;
   nếu display_score <75 thì vẫn UNMATCHED.

5. If AUTO_MATCH:
      Create payment_allocation(match_method=FUZZY, confidence=display_score/100,
                                confidence_method="heuristic_v1")
      Update sale.payment_status = PAID
   
   If HUMAN_CONFIRM:
      Create exception(type=AMBIGUOUS_MATCH, ai_suggestion={...})
   
   If UNMATCHED:
      Create exception(type=NO_MATCH, ai_suggestion={...})

6. Special case: hai order giống nhau, không identifier
   if count_same_amount > 1 AND no differentiating signal:
      MANDATORY EXCEPTION (no guess)
      Even if one candidate scores ≥95, force HUMAN_CONFIRM

   Nếu đúng một candidate có strict differentiating identifier, không áp dụng
   duplicate penalty cho candidate đó; các candidate còn lại vẫn bị trừ 30.
```

### Determinism guarantees

- **Exact matching fully deterministic:** Cùng inputs luôn produce cùng output
- **Candidate scoring deterministic:** Cùng inputs và cùng AI interpretation produce cùng score
- **AI note interpretation non-deterministic:** LLM output có thể vary; mitigated bằng:
  - Dùng temperature=0 cho classification calls
  - Cache AI interpretations bằng note hash
  - Treat AI interpretation là một signal trong nhiều, không phải sole signal

### Edge cases and fallback behavior

| Edge case | Behavior |
|---|---|
| Không có reference trong note | Skip exact matching; chuyển sang candidate matching |
| Reference tìm thấy nhưng expired | Chuyển sang candidate matching |
| Không tìm thấy candidates | Create exception (NO_MATCH) |
| Tất cả candidates score <75 | Create exception (NO_MATCH) |
| Hai candidates score ≥95 | Create exception (AMBIGUOUS_MATCH); không auto-match |
| Transaction amount = 0 | Skip; log as invalid |
| Sale amount = 0 | Skip; log as invalid |
| Multiple transactions cho cùng sale | Process theo thứ tự; first match wins; rest chuyển sang candidate matching |
| Refund transaction (negative amount) | Match với original sale; create negative allocation |

### Performance characteristics

| Operation | Complexity | Expected time (100 transactions) |
|---|---|---|
| Exact matching | O(n) per transaction | <100ms total |
| Candidate generation | O(n × m) với m = unpaid sales | <500ms per transaction |
| AI note interpretation | O(1) per unique note (cached) | <2s per unique note |
| Full reconciliation run | O(n × (1 + m + ai)) | <30s cho 100 transactions |

### Key truth fixtures

```json
[
  {
    "transaction_id": "SHB-902194810",
    "raw_note": "PAY-A8F21X",
    "amount": 350000,
    "expected_match": "ORDER-1842",
    "expected_method": "EXACT",
    "expected_confidence": 1.0
  },
  {
    "transaction_id": "SHB-902194815",
    "raw_note": "ck cho em",
    "amount": 5000000,
    "expected_match": null,
    "expected_method": "NONE",
    "expected_exception": "NO_MATCH",
    "expected_suggestion": "internal_transfer",
    "expected_confidence": 0.82
  },
  {
    "transaction_id": "SHB-902194820",
    "raw_note": "",
    "amount": 85000,
    "expected_match": null,
    "expected_method": "NONE",
    "expected_exception": "AMBIGUOUS_MATCH",
    "expected_confidence": 0.0,
    "note": "Two orders with same amount; no identifier"
  }
]
```

---

## 9. Evaluation Specification

### Evaluation methodology

AI output được đánh giá so với human-verified truth sets. Đánh giá automated khi có thể và human-reviewed cho quality dimensions.

| Dimension | Phương pháp | Automated | Tần suất |
|---|---|---|---|
| Match accuracy | Compare auto-matches với truth set | Yes | Mỗi test run |
| AI suggestion quality | Compare AI classification với human decision | Yes (truth set) | Mỗi test run |
| Vietnamese note interpretation | Test set 50 notes với known meanings | Yes | Mỗi test run |
| Message quality | RM review drafted messages | No (human) | Demo + pilot |
| Hallucination rate | Count invalid tool calls / total | Yes | Mỗi test run |
| Latency | Time từ request đến first status | Yes | Mỗi test run |

### Match accuracy test cases

| Case ID | Input | Expected | Scoring |
|---|---|---|---|
| EVAL-MATCH-001 | TX có PAY-REF, exact amount | Auto-match đúng order | Pass/fail |
| EVAL-MATCH-002 | TX có PAY-REF, sai amount | No match; chuyển sang candidate | Pass/fail |
| EVAL-MATCH-003 | TX không ref, amount duy nhất, trong 1 min | Human confirmation (score 70; amount + time không đủ để auto-match) | Pass/fail |
| EVAL-MATCH-004 | TX không ref, cùng amount với 2 orders | Exception (AMBIGUOUS_MATCH) | Pass/fail |
| EVAL-MATCH-005 | TX 5M từ owner name, không order | Exception (NO_MATCH), suggestion: internal_transfer, confidence 0.82 | Pass/fail ±0.05 |
| EVAL-MATCH-006 | Refund TX | Match với original sale với negative allocation | Pass/fail |
| EVAL-MATCH-007 | TX đã allocated | Excluded khỏi candidates | Pass/fail |

### Vietnamese note interpretation test cases

| Case ID | Input note | Interpretation mong đợi | Scoring |
|---|---|---|---|
| EVAL-NOTE-001 | `toc` | service: cắt tóc | Correct type |
| EVAL-NOTE-002 | `nhuom` | service: nhuộm tóc | Correct type |
| EVAL-NOTE-003 | `ck cho em` | Không service cụ thể; likely internal | Correct type |
| EVAL-NOTE-004 | `nhap hang 20/10` | purchase_payment, date: 20/10 | Correct type + date |
| EVAL-NOTE-005 | (empty) | Không interpretation; dùng other signals | No hallucination |
| EVAL-NOTE-006 | `PAY-A8F21X` | Payment reference; không phải service | Correct type |
| EVAL-NOTE-007 | `tra no` | loan_payment | Correct type |
| EVAL-NOTE-008 | `dat coc` | deposit | Correct type |
| EVAL-NOTE-009 | `ban hang` | revenue | Correct type |
| EVAL-NOTE-010 | `chuyen noi bo` | internal_transfer | Correct type |

### AI suggestion quality test cases

| Case ID | Tình huống | Suggestion mong đợi | Confidence range | Scoring |
|---|---|---|---|---|
| EVAL-SUGG-001 | 5M từ owner, không order | internal_transfer | 0.75-0.90 | Type + range |
| EVAL-SUGG-002 | Amount mua hàng, supplier account | purchase_payment | 0.55-0.70 | Type + range |
| EVAL-SUGG-003 | Amount service, familiar customer | revenue | 0.85-0.95 | Type + range |
| EVAL-SUGG-004 | Ambiguous, conflicting evidence | Present cả hai options | N/A | Both options present |

### Message quality test cases (human review)

| Case ID | Tình huống | Criteria |
|---|---|---|
| EVAL-MSG-001 | Draft message cho 5M transaction | Tiếng Việt, lịch sự, gồm amount/date, câu hỏi rõ ràng |
| EVAL-MSG-002 | Draft message cho missing invoice | Tiếng Việt, giải thích cần gì, non-technical |
| EVAL-MSG-003 | Consolidated message cho 3 exceptions | Cả 3 transactions referenced; không quá dài |

### Hallucination test cases

| Case ID | Tình huống | Expected |
|---|---|---|
| EVAL-HALL-001 | Inject invalid tool name trong agent context | Tool call rejected; logged |
| EVAL-HALL-002 | Agent cố call tool từ allowlist agent khác | Tool call rejected; logged |
| EVAL-HALL-003 | LLM trả invalid JSON | Retry; sau đó fail gracefully |

### Scoring rubric

#### Automated scoring

| Metric | Formula | Pass threshold |
|---|---|---|
| Match accuracy (exact) | correct_exact / total_exact | ≥95% |
| Match accuracy (overall) | correct_all / total_all | ≥80% |
| Note interpretation accuracy | correct_notes / total_notes | ≥85% |
| Suggestion type accuracy | correct_type / total_suggestions | ≥80% |
| Suggestion confidence calibration | abs(predicted - actual) < 0.10 | ≥75% within range |
| Hallucination rate | invalid_calls / total_calls | <5% |

#### Human review scoring

| Metric | Scale | Pass threshold |
|---|---|---|
| Message quality | 1-5 (1=unusable, 5=perfect) | ≥4 average |
| Agent trace clarity | 1-5 | ≥4 average |
| UI usability | 1-5 | ≥4 average |

### Pass/fail thresholds

| Metric | Pass | Fail |
|---|---|---|
| Match accuracy (exact) | ≥95% | <95% |
| Match accuracy (overall) | ≥80% | <80% |
| Note interpretation | ≥85% | <85% |
| Suggestion type accuracy | ≥80% | <80% |
| Hallucination rate | <5% | ≥5% |
| Latency (initial) | <5s | ≥5s |
| Latency (full case) | <30s | ≥30s |

### Evaluation frequency

| Khi nào | Cái gì | Ai |
|---|---|---|
| Mỗi PR | Automated test suite | CI |
| Cuối Sprint 2 | Agent layer evaluation | QA |
| Cuối Sprint 5 | Full evaluation (tất cả dimensions) | QA + PM |
| Demo day | Live demo evaluation | Judges |
| Pilot hàng tuần | Match accuracy + false match rate | QA |

---

## 10. Compliance Specification

### Compliance overview

TaxLens không file thuế. Nó prepare và validate merchant data để existing tax processes (MISA, accountant, hoặc direct filing) có thể tiến hành với data clean, reconciled. Compliance layer đảm bảo:

1. Tax rules được versioned, approved, và immutable
2. Reports reference chính xác rule version đang hiệu lực
3. Mọi decision auditable
4. LLM không bao giờ compute tax formulas

### Tax Rules Engine

#### Architecture

Tax Rules Engine là deterministic service tách biệt từ LLM (DEC-004). Nó:

- Store rules trong `tax_rule_versions` table
- Validate data theo required fields và formulas
- Generate tax-readiness reports với rule version metadata
- KHÔNG dùng AI cho bất kỳ calculation nào

#### Rule version lifecycle

```text
DRAFT → PENDING → APPROVED → (SUPERSEDED khi new version approved)
```

- **DRAFT:** Rule content đang prepare
- **PENDING:** Submitted cho approval
- **APPROVED:** Approved bởi compliance officer; immutable
- **SUPERSEDED:** Thay thế bởi newer approved version; retained cho historical reports

#### Rule version schema

```json
{
  "version": "2026.07",
  "merchant_type": "hộ_kinh_doanh",
  "business_category": "beauty_services",
  "effective_from": "2026-07-01",
  "effective_to": null,
  "required_fields": [
    "merchant_name",
    "tax_id",
    "revenue_total",
    "invoice_count",
    "cash_revenue",
    "bank_revenue"
  ],
  "formula_or_validation": {
    "revenue_total_formula": "sum(sale.net_amount where payment_status=PAID)",
    "invoice_coverage": "count(invoices) / count(sales where payment_status=PAID) >= 0.9",
    "cash_session_required": "all cash_sessions.status = RECONCILED"
  },
  "legal_source": "Thông tư 40/2021/TT-BTC",
  "approval_status": "APPROVED",
  "approved_by": "compliance_lead",
  "approved_at": "2026-07-01T00:00:00Z"
}
```

#### Required fields for tax-readiness

| Field | Source | Validation |
|---|---|---|
| merchant_name | merchants.name | Không empty |
| tax_id | merchants.tax_id | Format hợp lệ |
| revenue_total | Sum paid sales | > 0 cho active period |
| invoice_count | Count invoices | ≥90% paid sales (configurable) |
| cash_revenue | Sum cash payments | Khớp cash session totals |
| bank_revenue | Sum bank transactions classified as revenue | Khớp reconciliation |

#### Tax-readiness checklist

| Item | Threshold | Source |
|---|---|---|
| Bank reconciliation rate | ≥95% | Reconciliation engine |
| Cash session closure | 100% | Cash sessions |
| Unclassified transactions | 0 | Tax classifications |
| Missing invoices | 0 | Invoice comparison |
| Rule version valid | Current | tax_rule_versions |

### Report generation

#### Tax-readiness report

Mỗi report bao gồm:

- Rule version (e.g., `2026.07`)
- Effective date
- Legal source
- Approved by
- Generation timestamp
- Checklist với pass/fail per item
- Overall ready/not-ready status

#### Reproducibility

Cùng data + cùng rule version = cùng report output. LLM không tham gia report generation.

#### Draft export

- Export format: JSON và CSV
- Bao gồm: merchant info, period, reconciled transactions, sales, allocations, tax classifications, rule version
- Loại trừ: unresolved exceptions
- Chỉ available khi tax-readiness = "pass"
- Export được label rõ ràng là "DRAFT — Không phải tờ khai thuế"

### Audit requirements

#### What must be audited

| Event type | Actor | Fields logged |
|---|---|---|
| Tool call | Agent | agent_name, tool_name, input_hash, output_hash, confidence, rule_version |
| Human approval | User | user_id, decision, reason, timestamp |
| Rule version approval | Compliance officer | user_id, version, timestamp |
| Export generation | User hoặc agent | user_id, merchant_id, period, format, timestamp |
| Exception resolution | User | user_id, exception_id, decision, timestamp |

#### Audit log properties

- **Append-only:** Không UPDATE hoặc DELETE operations trên audit_events
- **Retention:** 7 năm (banking requirement)
- **Export:** JSON và CSV; yêu cầu compliance hoặc admin role
- **Integrity:** Input/output hashes cung cấp tamper evidence

### LLM limits (compliance perspective)

| LLM được phép | LLM KHÔNG được phép |
|---|---|
| Retrieve và explain tax rules | Compute tax formulas |
| Suggest revenue classification | Make final classification decisions |
| Draft merchant messages | Send messages mà không có RM approval |
| Explain reconciliation reasoning | Perform exact matching |
| Identify missing data | Auto-resolve exceptions below threshold |

### Vietnamese legal context

| Quy định | Relevance |
|---|---|
| Thông tư 40/2021/TT-BTC | Yêu cầu e-invoice cho hộ kinh doanh |
| Nghị định 123/2020/NĐ-CP | E-invoice implementation |
| Luật Quản lý thuế | Nghĩa vụ kê khai thuế |
| Thông tư về thuế hộ kinh doanh | Revenue thresholds và phương pháp tính thuế |

TaxLens không interpret các quy định này. Nó dùng rule versions approved bởi compliance officers người interpret regulations. System enforce rằng approved rules được apply consistent.

### Data residency

- MVP: Data stored trong Docker container trên demo machine
- Pilot: Data phải stored trong SHB VPC hoặc Vietnam-based cloud (data residency requirement)
- Không data rời Việt Nam jurisdiction trong pilot phase

---

## 11. Glossary

### Definitions (alphabetical)

| Term | Definition |
|---|---|
| Adapter | Module convert data từ external source (SHB, SePay, POS, CSV) sang Canonical Event Ledger schema |
| Agent | Component AI-powered với role cụ thể, tool allowlist, và output schema |
| Agent run | Một lần thực thi multi-agent workflow, tracked trong agent_runs table |
| Agent trace | Timeline trực quan hiển thị planner decomposition, agent assignments, tool calls, và decisions |
| Allocation | Việc gán payment amount cho một hoặc nhiều orders qua payment_allocations |
| Audit event | Record append-only của agent hoặc human action, stored trong audit_events |
| Canonical Event Ledger | Database schema unified mà tất cả source data được normalize vào |
| Candidate matching | Matching probabilistic transactions với orders dùng weighted scoring factors |
| Cash session | Record per-store, per-shift của cash transactions với opening, expected, và counted amounts |
| Case | Workflow item structured cho unresolved exceptions, tracked trong reconciliation_cases |
| Confidence score | Giá trị 0.0–1.0 chỉ độ chắc chắn của AI về một suggestion |
| Đối soát | Reconciliation — quá trình match transactions với orders |
| Dynamic QR | QR code generated per payment intent chứa amount và payment reference |
| Exception | Transaction hoặc order cần human decision, hiển thị trong Exception Inbox |
| Exact matching | Matching deterministic dùng payment reference, amount, và order status |
| Hóa đơn | Invoice — electronic tax invoice issued cho một sale |
| Hộ kinh doanh | Household business — loại đăng ký kinh doanh Việt Nam cho small businesses |
| Kê khai | Tax declaration/filing — quá trình submit tax reports |
| Match score | Weighted score (0–100) cho candidate matching, computed từ nhiều factors |
| Mini POS | POS interface tối giản để tạo sales và generate QR codes |
| MCP | Model Context Protocol — standard cho connecting AI systems với external tools |
| Payment intent | Record của expected payment với unique reference, amount, và expiry |
| Payment reference | Unique code system-generated (e.g., PAY-A8F21X) link orders với bank transactions |
| Planner Agent | Agent phân tách requests và delegate cho specialist agents |
| Reconciliation | Quá trình match bank transactions, cash, và invoices với sales orders |
| Reconciliation Agent | Specialist agent chịu trách nhiệm matching và exception creation |
| RM | Relationship Manager — SHB staff quản lý merchant relationships |
| Rule version | Versioned set của tax rules (e.g., 2026.07), immutable một khi approved |
| SHB | Saigon-Hanoi Bank — bank partner cho TaxLens |
| Specialist agent | Một trong ba agents: Reconciliation, Tax & Compliance, hoặc Merchant Operations |
| Tax-readiness | Trạng thái tất cả data complete, consistent, và sẵn sàng cho tax process |
| Tax-readiness report | Report hiển thị checklist items với pass/fail status và rule version |
| Tax Rules Engine | Service deterministic validate data theo versioned tax rules |
| Three-layer note handling | Store raw_note, normalized_note, và ai_interpretation separately |
| Tool allowlist | Set tools mà agent được phép call; enforced tại tool layer |
| Tool call | Một lần invocation của tool bởi agent, logged trong tool_calls table |

### Acronyms

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
| RM | Relationship Manager |
| RLS | Row-Level Security |
| SHB | Saigon-Hanoi Bank (Ngân hàng Sài Gòn – Hà Nội) |
| SSR | Server-Side Rendering |
| TLS | Transport Layer Security |
| TDE | Transparent Data Encryption |
| VPC | Virtual Private Cloud |

### Domain concepts with examples

#### Payment reference linkage

```text
POS order_id:        ORDER-1842
    ↓ create payment intent
Payment reference:   PAY-A8F21X
    ↓ embed in dynamic QR
Customer transfers money
    ↓ webhook receives note with PAY-A8F21X
Bank transaction_id: SHB-902194810
```

Cả ba IDs được stored và linked qua `payment_reference`.

#### Three-layer note handling

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

#### Match scoring example

```text
Transaction: 350,000₫, không reference, 2 minutes sau order

Score:
  Amount match:        +50
  Time <5 min:         +10
  No reference:         +0
  Familiar sender:      +0
  No same-amount:       +0
  ────────────────────────
  Total:               60 → UNMATCHED (<75)
```

---

## 12. Traceability Matrix

### BR → FR → API → Test

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

### User story → BR → FR

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

### Decision → Documents affected

| DEC ID | Title | Documents affected |
|---|---|---|
| DEC-001 | Multi-agent architecture | `03-engineering/01-system-architecture.md`, `05-domain/01-ai-advisor.md`, `02-requirements/03-srs.md` §5, `03-engineering/02-data-models.md` |
| DEC-002 | Canonical Event Ledger | `03-engineering/01-system-architecture.md`, `03-engineering/02-data-models.md`, `03-engineering/03-integration.md`, `05-domain/02-algorithm.md` |
| DEC-003 | Payment reference as link key | `03-engineering/02-data-models.md`, `05-domain/02-algorithm.md`, `02-requirements/03-srs.md` §5 |
| DEC-004 | Tax Rules Engine tách biệt từ LLM | `05-domain/05-compliance.md`, `05-domain/01-ai-advisor.md`, `03-engineering/02-data-models.md`, `02-requirements/03-srs.md` §5 |
| DEC-005 | Exception-first UX | `04-delivery/03-design.md`, `02-requirements/03-srs.md` §5, `05-domain/01-ai-advisor.md` |
| DEC-006 | Next.js + FastAPI + PostgreSQL | `03-engineering/01-system-architecture.md`, `04-delivery/01-environment-setup.md`, `04-delivery/00-work-split.md` |
| DEC-007 | MVP scope | `01-foundation/03-product-spec.md` §16, `04-delivery/02-testing-spec.md`, `03-engineering/03-integration.md` |
| DEC-008 | Audit mọi agent action | `03-engineering/04-security-and-permissions.md`, `03-engineering/02-data-models.md`, `05-domain/05-compliance.md` |
| DEC-009 | Dynamic QR cho payment intent | `02-requirements/03-srs.md` §5, `03-engineering/02-data-models.md`, `03-engineering/03-integration.md` |
| DEC-010 | Tiếng Việt primary, English docs | `01-foundation/03-product-spec.md`, `05-domain/04-glossary.md`, `04-delivery/03-design.md` |

### Summary counts

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
| API endpoints traced to FRs | 20/20 (100%) |
| Errors in API spec appearing in catalog | 22/22 (100%) |

---

*Last updated: 2026-07-17*
