# Business Requirements — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Business context

Hộ kinh doanh và doanh nghiệp siêu nhỏ Việt Nam có dữ liệu tài chính rời rạc: đơn hàng POS, chuyển khoản ngân hàng, ca tiền mặt, và hóa đơn điện tử nằm trong các hệ thống riêng biệt không tự động đối soát. Nhân viên SHB kiểm tra hàng trăm giao dịch thủ công để xác nhận doanh thu merchant sẵn sàng cho quy trình thuế. Việc này chậm, dễ sai, và không scale được.

TaxLens là hệ thống multi-agent AI kết nối dữ liệu giao dịch SHB với POS, file bán hàng, tiền mặt, và hóa đơn điện tử; tự động đối soát thanh toán; phát hiện chênh lệch; và điều phối xử lý con người cho trường hợp mơ hồ. TaxLens không thay thế MISA, KiotViet, hay phần mềm kế toán — đây là lớp kết nối và kiểm soát tạo dữ liệu sạch, auditable, sẵn sàng cho quy trình thuế hiện có.

## Business model

TaxLens tạo giá trị cho SHB bằng:

1. **Tăng mức gắn bó của merchant** — Tài khoản SHB trở thành trung tâm vận hành tài chính, không chỉ là nơi nhận tiền.
2. **Giảm khối lượng hỗ trợ thủ công** — Nhân viên không phải tải sao kê, so Excel, và gọi khách nhiều lần.
3. **Cải thiện chất lượng dữ liệu merchant** — SHB hiểu dòng tiền kinh doanh đã xác nhận, không chỉ các dòng giao dịch rời rạc.
4. **Tạo nền tảng cho sản phẩm mới** — Sổ doanh thu sạch hỗ trợ tích hợp kế toán, nhắc hóa đơn, đánh giá dòng tiền, và sản phẩm vốn lưu động.

**Mô hình doanh thu (sau pilot):** B2B SaaS tính phí theo merchant mỗi tháng, kèm dịch vụ tích hợp cho SHB. Có thể bundle với gói merchant banking của SHB.

## Core business requirements

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

## Constraints

- **Không có truy cập SHB production API** cho hackathon — chỉ sandbox hoặc mock
- **Không phát hành hóa đơn production** — chỉ mock provider
- **Không kê khai thuế thật** — chỉ xuất nháp
- **48 giờ build** cho hackathon MVP
- **Tiếng Việt** cho mọi nội dung user-facing
- **Dữ liệu tài chính nhạy cảm** — cần encryption, masking, RBAC
- **Không lock-in model** — LLM provider abstraction layer
- **Data residency** — phải triển khai được trong VPC nếu SHB yêu cầu

## Success metrics

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

## Scope boundaries

- **Trong phạm vi:** Đối soát multi-agent, exception management, tax-readiness reporting, Mini POS, dynamic QR, audit logging, agent trace UI, sandbox integration
- **Ngoài phạm vi:** Kê khai thuế thật, phát hành hóa đơn production, tích hợp production MISA/KiotViet, POS đầy đủ, chấm điểm tín dụng, quyết định khoản vay, mobile merchant app, hỗ trợ nhiều ngành nghề (MVP chỉ salon)

## Verification

### Automated

- N/A — tài liệu business

### Manual

- Review với stakeholder: mỗi BR có owner được xác nhận
- Mỗi success metric có phương pháp đo
- Scope boundary khớp product.md §17 (MVP) và §22 (pilot roadmap)

---

*Last updated: 2026-07-17*
