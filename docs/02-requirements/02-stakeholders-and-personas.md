# Stakeholders and Personas — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** Tất cả module user-facing của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Stakeholder table

| Name                       | Role                      | Interest                                   | Influence        |
| ----------------------------| ---------------------------| --------------------------------------------| ------------------|
| SHB Operations Team        | Nhân viên vận hành merchant | Dùng TaxLens hàng ngày để đối soát          | High             |
| SHB Relationship Managers  | RM trực tiếp khách hàng      | Hỗ trợ merchant dùng dữ liệu TaxLens          | Medium           |
| SHB Compliance Team        | Chuyên viên tax/compliance   | Đảm bảo rule đúng và audit trail    | High             |
| Hộ kinh doanh (merchants)  | Chủ doanh nghiệp           | Cung cấp dữ liệu, trả lời câu hỏi ngoại lệ   | Medium           |
| SHB IT Department          | Infrastructure            | Triển khai và duy trì TaxLens                   | High             |
| VAIC Hackathon Judges      | Giám khảo                | Đánh giá product fit, AI depth, demo quality | High (hackathon) |
| MISA / Accounting partners | Integration target       | Nhận dữ liệu sạch export                 | Low (post-MVP)   |

## Persona profiles

### Persona 1 — Linh, SHB Merchant Operations Staff (Primary)

**Role:** Nhân viên vận hành merchant của SHB
**Label:** Assumption-based (xuất phát từ product.md §4)

**Goals:**
- Xác nhận dữ liệu doanh thu merchant đầy đủ, nhất quán, và sẵn sàng cho thuế
- Giảm thời gian kiểm tra giao dịch thủ công
- Biết chính xác còn thiếu gì và cần follow-up gì

**Needs:**
- Dashboard hiển thị trạng thái đối soát, ngoại lệ, và tax-readiness
- Exception Inbox với đề xuất AI và confidence score
- Khả năng approve hoặc reject đề xuất AI
- Agent trace cho thấy quyết định được đưa ra thế nào

**Pain points:**
- Hiện tại tải sao kê, so Excel, gọi khách nhiều lần
- Không có view chung cho tất cả nguồn dữ liệu
- Không phân biệt được giao dịch nào là doanh thu vs chuyển nội bộ

**Workflow:**
1. Chọn merchant và kỳ
2. Xem tóm tắt dashboard
3. Xử lý ngoại lệ trong Inbox
4. Approve hoặc sửa đề xuất AI
5. Kiểm tra checklist tax-readiness
6. Xuất dữ liệu sạch hoặc giao case còn lại cho RM

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-015

---

### Persona 2 — Phong, Relationship Manager

**Role:** Relationship Manager at SHB
**Label:** Assumption-based

**Goals:**
- Hỗ trợ merchant nhanh mà không cần đọc toàn bộ sao kê
- Biết chính xác mỗi merchant còn thiếu gì
- Tạo yêu cầu follow-up hiệu quả

**Needs:**
- Danh sách case với merchant, loại issue, và priority
- Draft tin nhắn cho merchant để xác nhận
- Theo dõi trạng thái task được giao

**Pain points:**
- Phải gọi merchant nhiều lần về cùng một dữ liệu
- Không có cách structured để theo dõi mỗi merchant cần gì
- Không thấy trạng thái đối soát nếu không hỏi operations team

**Workflow:**
1. Nhận case được giao từ Merchant Operations Agent
2. Review chi tiết case và action AI đề xuất
3. Gửi draft tin nhắn cho merchant (sau khi review)
4. Theo dõi phản hồi merchant
5. Cập nhật trạng thái case

**Traces to:** BR-007, BR-008

---

### Persona 3 — Hà, Compliance/Tax Operations Specialist

**Role:** Chuyên viên compliance hoặc vận hành thuế
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

---

### Persona 4 — Hương, Salon Owner (Merchant)

**Role:** Chủ hộ kinh doanh (salon)
**Label:** Assumption-based (xuất phát từ product.md §6, User Story 1)

**Goals:**
- Trả lời câu hỏi đơn giản về giao dịch mơ hồ
- Không phải học dashboard ngân hàng phức tạp
- Tiếp tục dùng tool hiện có (Excel, POS đơn giản)

**Needs:**
- Link xác nhận đơn giản cho câu hỏi ngoại lệ
- Giải thích tiếng Việt rõ ràng về điều đang được hỏi
- Không cần truy cập hệ thống nội bộ SHB

**Pain points:**
- Bị nhân viên ngân hàng gọi về giao dịch không nhớ
- Không biết chuyển khoản nào cho dịch vụ nào
- Không dễ phân biệt tiền cá nhân vs tiền kinh doanh

**Workflow:**
1. Nhận yêu cầu xác nhận (link hoặc tin nhắn)
2. Xem chi tiết giao dịch và đề xuất AI
3. Xác nhận hoặc sửa phân loại
4. Xong — không cần hành động thêm

**Traces to:** BR-004, BR-005, BR-013

---

### Pilot persona constraints

Từ product.md §4:
- Hộ kinh doanh có doanh thu đủ lớn để cần kế toán và hóa đơn
- 1–3 địa điểm
- 3–15 nhân viên
- 30–200 giao dịch mỗi ngày
- Nhận cả tiền mặt và chuyển khoản
- Chưa có kế toán toàn thời gian
- Có thể đang dùng POS, Excel, hoặc ghi chép thủ công
- Vertical đầu tiên: salon/dịch vụ làm đẹp (danh mục gọn hơn, giá trị đơn cao hơn, chuyển khoản phổ biến, ít edge case hơn nhà hàng)

## Verification

### Automated

- N/A — tài liệu persona

### Manual

- Mỗi persona map tới ít nhất một BR (verified ở trên)
- Persona được label là assumption-based
- Stakeholder table bao gồm influence level

---

*Last updated: 2026-07-17*
