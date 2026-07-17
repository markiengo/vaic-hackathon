# Stakeholders and Personas — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** Tất cả module user-facing của TaxLens
> **Implementation state:** Current — personas reflect actual product scope
> **Last verified against code:** 2026-07-17
> **Verification:** Xem § Verification bên dưới

---

## Product model

TaxLens là dịch vụ giá trị gia tăng do SHB cung cấp cho khách hàng merchant. Sản phẩm có **hai workspace riêng biệt**:

```text
Merchant Workspace (người dùng hằng ngày)
- Giao dịch, đơn hàng, tiền mặt, hóa đơn
- Ngoại lệ cần xác nhận
- Sẵn sàng thuế
- Yêu cầu hỗ trợ

            ↓ escalation

SHB Operations Console (người dùng vận hành)
- Danh mục merchant
- Cases escalated
- Agent trace
- Audit logs
- Compliance review
- Support actions
```

- **Business owner** là người dùng hằng ngày chính của Merchant Workspace.
- **SHB staff** là người dùng vận hành chính của SHB Operations Console.
- **SHB** là bên mua, cung cấp và hưởng lợi thể chế.

---

## Stakeholder table

| Name                       | Role                      | Interest                                   | Influence        |
| ----------------------------| ---------------------------| --------------------------------------------| ------------------|
| Hộ kinh doanh (merchants)  | Chủ doanh nghiệp — người dùng hằng ngày | Dùng TaxLens trực tiếp để đối soát, xử lý ngoại lệ, kiểm tra sẵn sàng thuế | High             |
| SHB Operations Team        | Nhân viên hỗ trợ merchant của SHB | Xử lý case escalated, giám sát merchant portfolio, audit | High             |
| SHB Relationship Managers  | RM trực tiếp khách hàng      | Hỗ trợ merchant cần follow-up, draft tin nhắn    | Medium           |
| SHB Compliance Team        | Chuyên viên tax/compliance   | Đảm bảo rule đúng và audit trail    | High             |
| SHB IT Department          | Infrastructure            | Triển khai và duy trì TaxLens                   | High             |
| SHB Product Owner          | Sponsor nội bộ           | Quyết định scope, ưu tiên, rollout          | High             |
| VAIC Hackathon Judges      | Giám khảo                | Đánh giá product fit, AI depth, demo quality | High (hackathon) |
| MISA / Accounting partners | Integration target       | Nhận dữ liệu sạch export                 | Low (post-MVP)   |

## Persona profiles

### Persona 1 — Hương, Salon Owner (Primary Daily User)

**Role:** Chủ hộ kinh doanh (salon) — người dùng hằng ngày của Merchant Workspace
**Label:** Assumption-based (xuất phát từ `01-foundation/03-product-spec.md` §6, User Story 1)

**Goals:**
- Nắm rõ doanh thu thực tế của cửa hàng mỗi ngày
- Biết chính xác khoản nào là doanh thu, khoản nào là tiền cá nhân hoặc chuyển nội bộ
- Đảm bảo dữ liệu sẵn sàng cho mùa thuế mà không phải tự so sánh Excel
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

**Digital ability:**
- Dùng smartphone thành thạo (Zalo, banking app, QR)
- Không chuyên kế toán — cần ngôn ngữ đơn giản, không thuật ngữ
- Có thể đang dùng POS đơn giản, Excel hoặc ghi chép thủ công

**Daily tasks:**
1. Đăng nhập Merchant Workspace
2. Xem dashboard — biết cửa hàng có bao nhiêu mục cần xác nhận
3. Xử lý ngoại lệ: duyệt/từ chối/phan loại lại
4. Tạo đơn qua Mini POS khi cần
5. Kiểm tra sẵn sàng thuế
6. Escalate case khó cho SHB khi cần

**Trust concerns:**
- AI có đoán sai không? — cần thấy lý do và confidence
- Dữ liệu tài khoản có an toàn không? — SHB là bên cung cấp nên tin tưởng
- Có bị tự động nộp thuế không? — không, chỉ tạo draft

**Permissions:**
- Chỉ xem dữ liệu của chính cửa hàng mình
- Không truy cập SHB Operations Console
- Không thấy dữ liệu merchant khác

**Success criteria:**
- Xử lý ngoại lệ trong dưới 5 phút thay vì 45 phút so Excel
- Dữ liệu thuế sẵn sàng đúng hạn
- Không bị ngân hàng gọi hỏi lại

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-013, BR-015

---

### Persona 2 — Linh, SHB Merchant Support Staff (Primary Operational User)

**Role:** Nhân viên hỗ trợ merchant của SHB — người dùng vận hành chính của SHB Operations Console
**Label:** Assumption-based

**Goals:**
- Giám sát nhiều merchant cùng lúc
- Xử lý các case được escalate từ Merchant Workspace
- Đảm bảo merchant portfolio đang đi đúng tiến độ
- Hỗ trợ merchant nhanh mà không cần đọc toàn bộ sao kê

**Needs:**
- Portfolio dashboard: trạng thái tất cả merchant đang quản lý
- Case queue: danh sách case escalated, ưu tiên, loại issue
- Agent trace: xem agent nào làm gì, confidence bao nhiêu
- Audit log: review quyết định, export cho compliance
- Draft tin nhắn cho merchant (AI soạn, Linh review và gửi)

**Pain points:**
- Phải gọi merchant nhiều lần về cùng một dữ liệu
- Không có cách structured để theo dõi mỗi merchant cần gì
- Không thấy trạng thái đối soát nếu không hỏi merchant trực tiếp
- Không có audit trail cho quyết định đối soát

**Operational tasks:**
1. Mở SHB Operations Console
2. Xem portfolio dashboard — merchant nào cần chú ý
3. Nhận case escalated từ Merchant Workspace
4. Review agent trace và evidence
5. Phê duyệt hoặc từ chối action AI đề xuất
6. Draft tin nhắn cho merchant (qua AI, Linh review)
7. Theo dõi phản hồi merchant
8. Đóng case khi resolved

**Escalation responsibilities:**
- Xử lý case có confidence thấp
- Xử lý case merchant không tự giải quyết được
- Điều phối RM khi cần gặp merchant trực tiếp
- Escalate lên compliance khi có vấn đề về rule

**Permissions:**
- Truy cập SHB Operations Console
- Xem dữ liệu tất cả merchant trong portfolio
- Phê duyệt action trên case escalated
- Không sửa dữ liệu gốc của merchant

**Success criteria:**
- Giảm số lần phải gọi merchant
- Case escalated được xử lý trong cùng ngày
- Portfolio tax-readiness rate đạt mục tiêu

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-007, BR-015

---

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
- Theo dõi trạng thái task

**Pain points:**
- Phải gọi merchant nhiều lần về cùng một dữ liệu
- Không có cách structured để theo dõi mỗi merchant cần gì
- Không thấy trạng thái đối soát nếu không hỏi operations team

**Workflow:**
1. Nhận case được giao từ SHB Operations Console
2. Review chi tiết case và action AI đề xuất
3. Gửi draft tin nhắn cho merchant (sau khi review)
4. Theo dõi phản hồi merchant
5. Cập nhật trạng thái case

**Traces to:** BR-007, BR-008

---

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

---

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

## Verification

### Automated

- N/A — tài liệu persona

### Manual

- Mỗi persona map tới ít nhất một BR (verified ở trên) ✓
- Persona được label là assumption-based ✓
- Stakeholder table bao gồm influence level ✓
- Hương là primary daily user ✓
- Linh là primary operational user ✓
- Hai workspace tách biệt rõ ràng ✓

---

*Last updated: 2026-07-17*
