# KHỚP — Merchant TaxOps Agents cho SHB

> **Một đội AI chuyên gia giúp SHB biến dữ liệu giao dịch, đơn hàng, tiền mặt và hóa đơn rời rạc của hộ kinh doanh thành sổ doanh thu sạch, có thể kiểm tra và sẵn sàng cho quy trình thuế.**

---

## 1. Tóm tắt sản phẩm

KHỚP là hệ thống **multi-agent AI dành cho vận hành ngân hàng**, tập trung vào nhóm khách hàng hộ kinh doanh và doanh nghiệp siêu nhỏ. Hệ thống kết nối dữ liệu giao dịch SHB với POS, file bán hàng, tiền mặt và hóa đơn điện tử; sau đó tự động đối soát, phát hiện sai lệch và điều phối xử lý các trường hợp chưa rõ.

KHỚP không thay thế MISA, KiotViet hoặc phần mềm kế toán. Sản phẩm đóng vai trò là **lớp kết nối và kiểm soát**, giúp SHB và khách hàng trả lời bốn câu hỏi:

1. Đơn hàng nào đã được thanh toán?
2. Khoản tiền nào thực sự là doanh thu kinh doanh?
3. Giao dịch nào còn thiếu hoặc sai hóa đơn?
4. Dữ liệu hiện tại đã đủ sạch để chuyển sang quy trình kê khai thuế chưa?

### Câu pitch 20 giây

> KHỚP là đội AI TaxOps giúp SHB đối soát tự động dòng tiền của hộ kinh doanh với đơn hàng, tiền mặt và hóa đơn. Thay vì nhân viên phải kiểm hàng trăm giao dịch, hệ thống chỉ đưa ra vài ngoại lệ cần con người xác nhận, rồi tạo bộ dữ liệu sạch để chuyển sang MISA hoặc quy trình thuế hiện có.

---

## 2. Bài toán

Một hộ kinh doanh thường có nhiều nguồn dữ liệu không đồng bộ:

```text
POS:                 100 đơn hàng
Tài khoản ngân hàng:  70 khoản tiền vào
Tiền mặt theo ca:     25 khoản
Hóa đơn điện tử:      85 hóa đơn
```

Không hệ thống nào tự nhiên biết chắc:

- Năm đơn còn lại đã được trả bằng cách nào.
- Khoản chuyển khoản nào là doanh thu, tiền vay, chuyển nội bộ hoặc tiền người thân gửi.
- Đơn nào đã thu tiền nhưng chưa phát hành hóa đơn.
- Một khoản tiền có đang bị ghi nhận hai lần hay không.
- Doanh thu thuộc địa điểm, ngành nghề hoặc kỳ báo cáo nào.
- Dữ liệu POS, ngân hàng và hóa đơn có cùng nói về một giao dịch hay không.

Các phần mềm lớn có nhiều module mạnh, nhưng người dùng nhỏ thường phải học một hệ thống phức tạp, nhập lại dữ liệu hoặc chuyển toàn bộ quy trình đang dùng. KHỚP chọn cách khác:

> **Không bắt khách hàng đổi POS. Không bắt họ học kế toán. Không bắt họ kiểm từng giao dịch.**

---

## 3. Cơ hội cho SHB

KHỚP tạo giá trị trực tiếp cho SHB ở bốn hướng:

### 3.1 Tăng mức độ gắn bó của hộ kinh doanh

Tài khoản SHB không chỉ là nơi nhận tiền mà trở thành trung tâm vận hành tài chính của cửa hàng.

### 3.2 Giảm khối lượng hỗ trợ thủ công

Nhân viên SHB không phải tải sao kê, so Excel và gọi khách nhiều lần để xác minh từng khoản.

### 3.3 Tăng chất lượng dữ liệu merchant

SHB có thể hiểu rõ hơn luồng tiền kinh doanh đã được khách hàng xác nhận, thay vì chỉ nhìn thấy các dòng giao dịch rời rạc.

### 3.4 Tạo nền tảng cho sản phẩm mới

Một sổ doanh thu sạch có thể hỗ trợ các bước sau này như:

- Kết nối MISA hoặc đối tác kế toán.
- Nhắc nghĩa vụ hóa đơn.
- Gợi ý tài khoản kinh doanh phù hợp.
- Đánh giá dòng tiền có sự đồng ý của khách hàng.
- Hỗ trợ vốn lưu động và sản phẩm merchant.

---

## 4. Người dùng mục tiêu

### Người dùng chính: Nhân viên vận hành merchant của SHB

**Nhu cầu:** Kiểm tra một hộ kinh doanh có dữ liệu doanh thu đầy đủ, nhất quán và sẵn sàng chuyển sang quy trình thuế hay chưa.

### Người dùng thứ hai: Relationship Manager

**Nhu cầu:** Hỗ trợ khách hàng nhanh, biết chính xác còn thiếu gì và tạo yêu cầu xử lý mà không phải đọc toàn bộ sao kê.

### Người dùng thứ ba: Chuyên viên compliance hoặc vận hành thuế

**Nhu cầu:** Kiểm tra hệ thống đang áp dụng đúng phiên bản quy tắc, có nguồn và có audit log.

### Người dùng phụ: Chủ hộ kinh doanh

**Nhu cầu:** Chỉ trả lời các câu hỏi đơn giản về giao dịch chưa rõ, thay vì phải dùng toàn bộ dashboard ngân hàng nội bộ.

### Persona pilot đề xuất

- Hộ kinh doanh có doanh thu đủ lớn để phát sinh nhu cầu kế toán và hóa đơn nghiêm túc.
- 1–3 địa điểm.
- 3–15 nhân viên.
- 30–200 giao dịch mỗi ngày.
- Nhận cả tiền mặt và chuyển khoản.
- Chưa có kế toán toàn thời gian.
- Có thể đang dùng POS, Excel hoặc ghi chép thủ công.

Vertical đầu tiên nên là **salon hoặc dịch vụ làm đẹp** vì danh mục dịch vụ tương đối gọn, giá trị đơn cao, chuyển khoản phổ biến và ít edge case hơn nhà hàng.

---

## 5. Nguyên tắc sản phẩm

1. **Exception-first:** Người dùng chỉ xử lý những trường hợp hệ thống không chắc chắn.
2. **Deterministic first:** Mã tham chiếu, số tiền, trạng thái và công thức được xử lý bằng code và rules.
3. **AI xử lý sự mơ hồ:** AI hiểu tiếng Việt lộn xộn, phân loại giao dịch và giải thích quyết định.
4. **Human approval:** AI không tự nộp thuế, tự phát hành hóa đơn hoặc tự gắn giao dịch mơ hồ với độ tin cậy thấp.
5. **Không khóa vào một nền tảng:** SHB, SePay, NAPAS, POS hoặc CSV đều đi qua adapter.
6. **Audit mọi hành động:** Mỗi quyết định phải biết ai hoặc agent nào làm, dựa trên dữ liệu gì và dùng phiên bản rule nào.
7. **Không xây lại MISA:** KHỚP chuẩn hóa và xuất dữ liệu sang hệ thống kế toán, hóa đơn hoặc thuế hiện có.

---

## 6. Ba user story quan trọng nhất

### User Story 1 — Salon không có POS đầy đủ

Chị Hương có salon với sáu nhân viên. Khách thường chuyển khoản với nội dung như `toc`, `nhuom`, hoặc không ghi gì. Cuối ngày chị nhập tổng doanh thu vào Excel nhưng không biết khoản nào là tiền dịch vụ, tiền cọc hay tiền bán sản phẩm.

Với KHỚP:

1. Nhân viên chọn dịch vụ bằng Mini POS tối giản.
2. Hệ thống tạo đơn và QR động riêng.
3. Chuyển khoản được ghép tự động với đơn.
4. Tiền mặt được ghi bằng một nút bấm.
5. Cuối ngày hệ thống chỉ hỏi hai hoặc ba khoản chưa rõ.
6. Dữ liệu sạch được chuyển cho quy trình hóa đơn hoặc kế toán.

### User Story 2 — Quán café dùng QR tĩnh và loa báo tiền

Hai bàn cùng thanh toán 85.000 đồng trong vài phút. Loa chỉ báo “đã nhận 85.000 đồng”, nên thu ngân không biết giao dịch thuộc bàn nào.

Với KHỚP:

1. Thu ngân chốt đơn bàn 3.
2. Hệ thống tạo `payment_reference` riêng và QR động.
3. Webhook ngân hàng nhận đúng mã tham chiếu.
4. Đơn bàn 3 tự chuyển sang trạng thái đã thanh toán.
5. Nếu khách trả tiền mặt, thu ngân bấm `Tiền mặt`.
6. Cuối ca, hệ thống đối soát tiền dự kiến với tiền đếm thực tế.

### User Story 3 — Shop đã có POS nhưng dữ liệu vẫn rời rạc

Chị Mai có ba cửa hàng mỹ phẩm, dùng POS, hai tài khoản ngân hàng, COD và hóa đơn điện tử. Chị không muốn chuyển phần mềm nhưng vẫn phải tải sao kê, kiểm COD và gửi Excel cho kế toán.

Với KHỚP:

1. Kết nối POS ở chế độ read-only.
2. Kết nối tài khoản SHB và import COD.
3. Chuẩn hóa mọi nguồn thành một ledger chung.
4. Exact match các giao dịch có reference.
5. Fuzzy match các giao dịch cũ.
6. Từ 600 bản ghi, hệ thống đưa ra 12 ngoại lệ cần xác nhận.
7. Xuất bộ dữ liệu sạch sang MISA hoặc file chuẩn.

---

## 7. Trải nghiệm người dùng chính

### 7.1 Màn hình Tổng quan merchant

Hiển thị:

- Tổng số giao dịch trong kỳ.
- Tỷ lệ đã đối soát.
- Tổng số ngoại lệ.
- Đơn đã thu tiền nhưng thiếu hóa đơn.
- Khoản tiền chưa xác định.
- Trạng thái sẵn sàng của hồ sơ.
- Agent nào đang xử lý việc gì.

### 7.2 Exception Inbox

Không hiển thị toàn bộ dữ liệu trước. Chỉ hiển thị các mục cần quyết định:

```text
5.000.000₫ từ Nguyễn Văn A
Nội dung: "ck cho em"

Gợi ý của AI: Chuyển nội bộ — 82%
Lý do:
- Tên người gửi trùng với chủ hộ
- Không có đơn hàng cùng số tiền
- Mẫu giao dịch giống ba lần trước

[Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác]
```

### 7.3 Agent Trace

Mỗi case phải cho thấy:

- Planner đã chia việc thế nào.
- Agent nào gọi tool nào.
- Dữ liệu nào được đọc.
- Quyết định nào được đưa ra.
- Confidence bao nhiêu.
- Rule version nào được dùng.
- Bước nào đang chờ con người.

### 7.4 Tax-readiness View

Thay vì bắt người dùng nhìn thẳng vào mẫu khai thuế, hệ thống hiển thị checklist:

```text
✓ Giao dịch ngân hàng đã đối soát: 98%
✓ Tiền mặt đã khóa ca: 100%
✗ Còn 3 giao dịch chưa phân loại
✗ Còn 2 đơn thiếu hóa đơn
✓ Bộ quy tắc đang dùng: 2026.07
```

Khi mọi mục đạt yêu cầu:

> “Dữ liệu đã sẵn sàng để tạo bản nháp và chuyển sang hệ thống kế toán/thuế.”

---

## 8. Kiến trúc multi-agent

KHỚP gồm một Planner Agent và ba specialist agent. Mỗi agent có nhiệm vụ, tool, quyền và output schema riêng.

### 8.1 Planner Agent

**Vai trò:** Nhận yêu cầu phức tạp, chia nhỏ công việc và điều phối các agent.

Ví dụ yêu cầu:

> “Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng này chưa.”

Planner tạo plan:

```text
1. Lấy hồ sơ merchant
2. Lấy giao dịch SHB
3. Lấy đơn hàng và tiền mặt
4. Đối soát thanh toán
5. Kiểm tra hóa đơn
6. Chạy tax-readiness rules
7. Tạo danh sách ngoại lệ
8. Mở case và giao việc
9. Tạo bản nháp báo cáo
```

**Không làm:** Tự phân loại nghiệp vụ chi tiết hoặc tự sửa số liệu.

### 8.2 Reconciliation Agent

**Vai trò:** Ghép đơn hàng, giao dịch ngân hàng, tiền mặt và hóa đơn.

**Tool được phép dùng:**

- `get_bank_transactions`
- `get_sales_orders`
- `get_cash_sessions`
- `get_invoices`
- `find_payment_reference`
- `score_match_candidates`
- `create_reconciliation_exception`

**Output:**

```json
{
  "merchant_id": "M001",
  "matched": 248,
  "unmatched": 13,
  "duplicate_candidates": 2,
  "missing_invoice_cases": 5,
  "exceptions": []
}
```

### 8.3 Tax & Compliance Agent

**Vai trò:** Kiểm tra bộ dữ liệu theo tax rules đã được phê duyệt và tạo tax-readiness report.

**Tool được phép dùng:**

- `retrieve_tax_rules`
- `validate_rule_version`
- `classify_revenue_category`
- `check_required_fields`
- `generate_tax_readiness_report`
- `create_draft_export`

**Nguyên tắc:**

- Không dùng LLM để tự tính công thức thuế.
- Không tự sửa số liệu gốc.
- Không tự nộp hồ sơ.
- Mỗi kết quả phải gắn nguồn rule và thời gian hiệu lực.

### 8.4 Merchant Operations Agent

**Vai trò:** Biến kết quả phân tích thành hành động trong hệ thống SHB.

**Tool được phép dùng:**

- `create_case`
- `assign_task_to_rm`
- `draft_merchant_message`
- `send_confirmation_request`
- `update_case_status`
- `export_to_accounting_system`

**Ví dụ hành động:**

- Tạo case cho 13 khoản chưa rõ.
- Soạn tin nhắn yêu cầu khách xác nhận.
- Giao nhiệm vụ cho RM.
- Xuất file sang MISA sandbox.
- Cập nhật trạng thái merchant thành `READY_FOR_REVIEW`.

---

## 9. Cơ chế đối soát

### 9.1 Ba ID không cần giống nhau

```text
POS order_id:        ORDER-1842
Payment reference:   PAY-A8F21X
Bank transaction_id: SHB-902194810
```

Luồng liên kết:

```text
ORDER-1842
    ↓ tạo payment intent
PAY-A8F21X
    ↓ đặt trong QR động
Khách chuyển tiền
    ↓ webhook nhận note PAY-A8F21X
SHB-902194810
```

Database giữ cả ba ID và nối chúng qua `payment_reference`.

### 9.2 Exact matching

Tự động ghép khi:

- Reference tồn tại và hợp lệ.
- Số tiền khớp.
- Đơn chưa được thanh toán.
- Giao dịch chưa được dùng cho allocation khác.

### 9.3 Candidate matching

Khi không có reference, hệ thống tạo danh sách ứng viên dựa trên:

- Cùng merchant hoặc cửa hàng.
- Cùng hoặc gần số tiền.
- Thời gian trong cửa sổ phù hợp.
- Đơn còn trạng thái chưa thanh toán.
- Tên người gửi quen thuộc.
- Nội dung giao dịch có tín hiệu liên quan.

### 9.4 Match scoring

Ví dụ rule ban đầu:

```text
Số tiền khớp chính xác:          +50
Thời gian cách dưới 1 phút:      +20
Reference hoặc mã bàn phù hợp:   +20
Tên người gửi quen:              +10
Nhiều đơn cùng số tiền:          -30
Giao dịch đã dùng trước đó:      loại bỏ
```

Ngưỡng:

```text
≥ 95%: tự động ghép
75–94%: hỏi người dùng xác nhận
< 75%: để trạng thái chưa xác định
```

### 9.5 Trường hợp không thể tự động giải quyết

Nếu hai đơn giống nhau hoàn toàn và giao dịch không có identifier, AI không được đoán. Hệ thống bắt buộc tạo exception để con người chọn.

### 9.6 Payment allocation

Không gắn cứng một payment với một order. Dùng bảng phân bổ để hỗ trợ:

- Một đơn trả bằng cash và chuyển khoản.
- Hai người cùng trả một đơn.
- Một khoản trả cho nhiều đơn.
- Chuyển thiếu hoặc chuyển thừa.
- Đặt cọc và thanh toán phần còn lại.
- Hoàn tiền.

```text
Payment: 200.000₫

Allocation:
- Order A: 120.000₫
- Order B: 80.000₫
```

---

## 10. Xử lý nội dung chuyển khoản

Ví dụ đầu vào:

```text
nhap hang 20/10
```

Không được dùng note này làm ID hoặc bằng chứng duy nhất.

Hệ thống giữ ba lớp:

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

AI tìm thêm bằng chứng:

- Có phiếu nhập hoặc hóa đơn gần ngày đó không?
- Số tiền có khớp không?
- Tài khoản nhận có phải nhà cung cấp quen không?
- Có giao dịch tương tự đã được người dùng xác nhận trước đây không?

Nếu bằng chứng chưa đủ, giao dịch được đưa vào Exception Inbox.

---

## 11. Dynamic QR và Mini POS

### 11.1 Dynamic QR

Mỗi thanh toán tạo một payment intent:

```text
Account: SHB merchant account
Amount: 185.000₫
Reference: PAY-X7K92P
Expires: 15 phút
```

Khách quét QR, số tiền và reference được điền sẵn. Webhook nhận giao dịch và cập nhật đơn đúng theo reference.

### 11.2 Mini POS tối thiểu

KHỚP không xây POS đầy đủ. Mini POS chỉ cần tạo được một sale event:

```text
sale_id
merchant_id
store_id
device_id
staff_id
created_at
items
gross_amount
discount
net_amount
payment_status
invoice_status
```

Tính năng tối thiểu:

- Chọn sản phẩm hoặc dịch vụ.
- Điều chỉnh số lượng.
- Tính tổng.
- Chọn `Tiền mặt` hoặc `Tạo QR`.
- Hủy hoặc hoàn đơn có audit log.

Không thuộc MVP:

- CRM.
- Chấm công.
- Marketing.
- Loyalty.
- Quản lý nhân sự.
- Mua hàng nâng cao.
- Sản xuất.

### 11.3 Cash reconciliation

Cuối ca:

```text
Tiền đầu ca:              1.000.000₫
Doanh thu cash theo POS:  4.500.000₫
Chi cash trong ca:          300.000₫
Dự kiến trong két:        5.200.000₫
Tiền đếm thực tế:         5.080.000₫
Chênh lệch:                -120.000₫
```

Hệ thống chỉ có thể phát hiện chênh lệch và yêu cầu lý do. Không thể tự biết chính xác giao dịch tiền mặt nào bị thiếu nếu nhân viên không tạo đơn.

---

## 12. Canonical Event Ledger

Mọi nguồn dữ liệu được chuyển về một schema chung.

### 12.1 Nguồn dữ liệu hỗ trợ

- SHB transaction API hoặc sandbox.
- Open Banking adapter.
- SePay webhook cho demo.
- POS API.
- Import CSV hoặc Excel.
- Mini POS.
- Hóa đơn điện tử sandbox.
- Cash session.
- COD import trong giai đoạn sau.

### 12.2 Adapter pattern

```text
SHB Adapter       ┐
SePay Adapter     │
KiotViet Adapter  ├──► Canonical Event Ledger
MISA Adapter      │
CSV Adapter       │
Mini POS          ┘
```

### 12.3 Entity chính

```text
merchants
stores
devices
users
products
sales
sale_lines
payment_intents
bank_transactions
payment_allocations
cash_sessions
invoices
reconciliation_cases
tax_classifications
tax_rule_versions
agent_runs
tool_calls
audit_events
```

---

## 13. AI dùng ở đâu và không dùng ở đâu

### AI cần thiết cho

- Hiểu nội dung chuyển khoản tiếng Việt có dấu, không dấu và viết tắt.
- Phân loại sơ bộ dòng tiền mơ hồ.
- Lập kế hoạch xử lý một yêu cầu phức tạp.
- Chọn specialist agent và tool phù hợp.
- Giải thích lý do match hoặc lý do tạo exception.
- Soạn tin nhắn dễ hiểu cho merchant.
- Truy xuất hướng dẫn nghiệp vụ bằng RAG.

### Không dùng AI cho

- Cộng tổng tiền.
- Exact matching bằng reference.
- Kiểm tra duplicate transaction ID.
- Quyền truy cập.
- Công thức và ngưỡng thuế.
- Version control của rules.
- Audit log.
- Quyết định cuối cùng cho giao dịch có rủi ro cao.

### Nguyên tắc

> **Rules xử lý sự chắc chắn. AI xử lý sự mơ hồ. Con người phê duyệt hành động quan trọng.**

---

## 14. Tax Rules Engine

Tax Rules Engine là dịch vụ deterministic, tách khỏi LLM.

```text
tax_rule
- rule_id
- merchant_type
- business_category
- effective_from
- effective_to
- required_fields
- formula_or_validation
- legal_source
- version
- approval_status
- approved_by
```

Mỗi báo cáo phải ghi rõ:

- Rule version.
- Ngày hiệu lực.
- Nguồn quy tắc.
- Người phê duyệt.
- Thời điểm chạy.

LLM chỉ giải thích rule bằng ngôn ngữ đơn giản. LLM không được sửa rule hoặc tự tạo thuế suất mới.

Trong MVP, sản phẩm chỉ tạo **tax-readiness report và draft export**. Không tự nộp hồ sơ lên cơ quan thuế.

---

## 15. Kiến trúc hệ thống

```text
┌──────────────────────────────┐
│ SHB Merchant Operations UI   │
│ Dashboard + Exceptions       │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Planner / Orchestrator       │
│ LangGraph-style state flow   │
└───────┬───────────┬──────────┘
        │           │
┌───────▼──────┐ ┌──▼──────────────┐ ┌────────────────────┐
│ Reconcile    │ │ Tax & Compliance│ │ Merchant Operations│
│ Agent        │ │ Agent           │ │ Agent              │
└───────┬──────┘ └──┬──────────────┘ └─────────┬──────────┘
        │           │                          │
┌───────▼───────────▼──────────────────────────▼───────────┐
│ MCP / Tool Layer                                        │
│ Transactions | POS | Invoice | CRM | Case | Rules | RAG │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│ PostgreSQL + Canonical Ledger + Audit Log                │
└──────────────────────────────────────────────────────────┘
```

### Stack đề xuất

- **Frontend:** Next.js, TypeScript.
- **Backend:** FastAPI, Python.
- **Agent orchestration:** LangGraph hoặc state machine tự xây.
- **Tool protocol:** MCP hoặc typed function calling.
- **Database:** PostgreSQL.
- **Vector search:** pgvector cho RAG nghiệp vụ.
- **Queue:** Redis + background worker nếu cần.
- **LLM:** Provider abstraction, không khóa vào một model.
- **Deployment:** Docker; cloud hoặc kiến trúc có thể chuyển sang VPC.

### Shared Case State

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

Agent trao đổi qua object có schema, không trao đổi bằng text tự do làm nguồn sự thật.

---

## 16. Bảo mật và kiểm soát

### Bắt buộc

- Mã hóa dữ liệu khi truyền và khi lưu.
- Token ngân hàng chỉ nằm ở backend.
- Role-based access control.
- Merchant chỉ xem dữ liệu của chính mình.
- Agent chỉ được gọi tool nằm trong allowlist.
- Mọi tool call phải ghi audit log.
- Dữ liệu nhạy cảm được masking trước khi gửi tới LLM nếu không cần thiết.
- Không train model công khai trên dữ liệu giao dịch.
- Hỗ trợ human approval cho write action.
- Idempotency cho webhook và tool call.

### Audit event tối thiểu

```text
actor_type
actor_id
agent_name
action
tool_name
input_hash
output_hash
rule_version
confidence
approval_status
timestamp
```

---

## 17. MVP hackathon

### Mục tiêu

Chứng minh một đội AI agent có thể nhận một yêu cầu vận hành phức tạp, gọi nhiều hệ thống, phối hợp với nhau, thực hiện hành động và để lại trace đầy đủ.

### Phạm vi dữ liệu

- 1 merchant salon.
- 1 cửa hàng.
- 30 đơn hàng.
- 20 chuyển khoản.
- 8 thanh toán tiền mặt.
- 2 giao dịch không phải doanh thu.
- 2 giao dịch cùng số tiền gây mơ hồ.
- 1 hoàn tiền.
- 2 đơn thiếu hóa đơn.
- 1 chênh lệch tiền mặt cuối ca.

### Tích hợp demo

- SHB transaction sandbox hoặc mock API có schema thực tế.
- SePay sandbox/webhook nếu cần giao dịch live.
- Mini POS.
- Invoice sandbox hoặc mock provider.
- Mock SHB case-management API.
- Tax Rules Engine.

### Tính năng phải hoàn thành

1. Planner nhận yêu cầu và tạo execution plan.
2. Ba specialist agent chạy với tool riêng.
3. Dynamic QR tạo payment reference và auto-match.
4. Fuzzy matching cho giao dịch không có reference.
5. Exception Inbox với human confirmation.
6. Tax-readiness report.
7. Merchant Operations Agent tạo case và draft message.
8. Dashboard hiển thị agent trace, tool calls và status.
9. Audit log tải được dưới dạng JSON hoặc CSV.

### Không thuộc MVP

- Kê khai hoặc nộp thuế thật.
- Phát hành hóa đơn production.
- Tích hợp production với MISA hoặc KiotViet.
- Full POS.
- Credit scoring.
- Tự động quyết định khoản vay.
- Hỗ trợ mọi ngành nghề.
- Mobile app riêng cho merchant.

---

## 18. Demo flow đề xuất

### Cảnh 1 — Yêu cầu vận hành

Nhân viên SHB nhập:

> “Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa.”

Planner hiển thị plan và giao việc cho ba agent.

### Cảnh 2 — Auto-match giao dịch chuẩn

Mini POS tạo đơn 350.000 đồng và QR động. Giao dịch sandbox đi vào qua webhook, Reconciliation Agent ghép đúng đơn bằng reference.

### Cảnh 3 — Xử lý dữ liệu mơ hồ

Hệ thống phát hiện giao dịch 5.000.000 đồng không có đơn tương ứng. AI gợi ý “chuyển nội bộ” với confidence 82% nhưng không tự quyết định. Người dùng xác nhận trong Exception Inbox.

### Cảnh 4 — Compliance và hóa đơn

Tax & Compliance Agent phát hiện hai đơn đã thu tiền nhưng thiếu hóa đơn, đồng thời xác nhận rule version đang dùng.

### Cảnh 5 — Agent thực hiện hành động

Merchant Operations Agent:

- Tạo case.
- Giao nhiệm vụ cho RM.
- Soạn tin nhắn yêu cầu merchant xác nhận một khoản còn lại.
- Tạo draft export sang hệ thống kế toán.

### Cảnh 6 — Kết quả trước và sau

```text
Trước KHỚP:
30 bản ghi phải kiểm thủ công
Thời gian dự kiến: 45 phút

Sau KHỚP:
25 bản ghi tự động đối soát
5 ngoại lệ được đưa ra
3 ngoại lệ xử lý trong demo
Thời gian thao tác: dưới 5 phút
```

Kết thúc bằng thông điệp:

> “Thay vì đọc toàn bộ sao kê, nhân viên SHB chỉ xử lý những gì thật sự cần con người.”

---

## 19. KPI

### KPI hackathon

1. **Auto-reconciliation rate:** ít nhất 80% giao dịch demo được ghép đúng mà không cần người dùng.
2. **Exception reduction:** giảm ít nhất 80% số bản ghi phải kiểm thủ công.
3. **Traceability:** 100% quyết định agent có tool call, confidence và audit record.
4. **Action completion:** Planner hoàn thành một workflow có ít nhất ba specialist agent và hai write action.
5. **Latency:** workflow đơn giản phản hồi trạng thái ban đầu dưới 5 giây; full case hoàn thành dưới 30 giây trên dữ liệu demo.

### KPI pilot

1. Giảm thời gian đối soát mỗi merchant ít nhất 50%.
2. Ít nhất 90% exception được người dùng giải quyết trong cùng ngày.
3. Tỷ lệ auto-match đúng ít nhất 95% cho giao dịch có reference.
4. Giảm số lần RM phải gọi lại merchant để hỏi cùng một dữ liệu.
5. Tăng tỷ lệ merchant hoàn thành bộ dữ liệu tax-ready đúng hạn.

---

## 20. Acceptance criteria

Sản phẩm được xem là đạt MVP khi:

- Người dùng có thể tạo một case từ yêu cầu tự nhiên.
- Planner chia case thành các task có dependency rõ ràng.
- Ít nhất ba specialist agent thực hiện công việc khác nhau.
- Agent gọi API hoặc tool thật, không chỉ trả text.
- Dữ liệu từ bank, POS và invoice được chuẩn hóa vào ledger chung.
- Exact match và fuzzy match đều hoạt động.
- Giao dịch mơ hồ không bị tự động xử lý sai.
- Người dùng có thể phê duyệt hoặc sửa đề xuất.
- Tax-readiness report hiển thị rule version.
- Merchant Operations Agent tạo case hoặc task thật trong sandbox.
- Agent trace và audit log hiển thị đầy đủ.
- Demo chạy end-to-end từ yêu cầu đến hành động cuối.

---

## 21. Rủi ro và cách giảm thiểu

### Rủi ro 1: Không có API production của SHB

**Giảm thiểu:** Xây adapter interface và mock sandbox có schema gần production. Tách core logic khỏi connector.

### Rủi ro 2: Multi-agent chỉ là diễn kịch

**Giảm thiểu:** Mỗi agent có tool, quyền, RAG source và output schema riêng. Nếu một agent không có hành động riêng, không gọi nó là specialist agent.

### Rủi ro 3: AI phân loại sai giao dịch

**Giảm thiểu:** Confidence threshold, rule ưu tiên, human approval và không tự động xử lý trường hợp mơ hồ.

### Rủi ro 4: Dữ liệu tiền mặt không đầy đủ

**Giảm thiểu:** Mini POS một chạm và đối soát két cuối ca. Sản phẩm nói rõ không thể suy ra tiền mặt nếu người dùng không ghi nhận.

### Rủi ro 5: Cạnh tranh với MISA và KiotViet

**Giảm thiểu:** Không thay thế POS hoặc kế toán. Tập trung vào reconciliation, exception management và orchestration giữa SHB với hệ thống hiện có.

### Rủi ro 6: Quy tắc thuế thay đổi

**Giảm thiểu:** Versioned Tax Rules Engine, approval workflow và nguồn luật gắn với từng rule.

### Rủi ro 7: Dữ liệu tài chính nhạy cảm

**Giảm thiểu:** Masking, encryption, audit, RBAC, allowlisted tools và khả năng triển khai trong VPC.

---

## 22. Pilot roadmap

### Giai đoạn 1 — 2 tuần: Discovery và chuẩn hóa dữ liệu

- Chọn một vertical: salon.
- Chốt schema giao dịch SHB sandbox.
- Chốt canonical ledger.
- Xác định bộ tax-readiness rules đầu tiên.
- Tạo 50 case lịch sử đã ẩn danh để đánh giá.

### Giai đoạn 2 — 4 tuần: Pilot nội bộ

- 5 nhân viên SHB.
- 20 merchant giả lập hoặc merchant đồng ý tham gia.
- Chạy read-only.
- Đo auto-match, false match và thời gian xử lý.
- Không gửi hành động ra ngoài nếu chưa được duyệt.

### Giai đoạn 3 — 4 tuần: Human-in-the-loop pilot

- Bật tạo case và draft message.
- Merchant nhận link xác nhận ngoại lệ.
- Xuất file sang hệ thống kế toán sandbox.
- Đo mức giảm khối lượng công việc của RM.

### Giai đoạn 4 — Mở rộng

- Thêm café hoặc bán lẻ.
- Thêm POS adapters.
- Thêm COD và nhiều tài khoản.
- Thêm policy và rule version mới.
- Đánh giá triển khai VPC.

---

## 23. Câu hỏi cần xác nhận với SHB

1. SHB sẽ cung cấp transaction sandbox hay chỉ có dữ liệu mẫu?
2. Có merchant profile API không?
3. Có CRM hoặc case-management sandbox không?
4. Agent được phép thực hiện write action nào?
5. Có integration hoặc sandbox với MISA không?
6. Có dữ liệu hóa đơn điện tử mẫu không?
7. Có tài liệu nghiệp vụ riêng cho merchant operations không?
8. Có yêu cầu MCP bắt buộc hay chỉ khuyến nghị?
9. Audit log cần lưu những trường nào?
10. Data residency và model provider có giới hạn gì?
11. Có thể dùng dữ liệu đã ẩn danh để đánh giá accuracy không?
12. Nhóm nhân viên nào sẽ là người dùng pilot đầu tiên?

---

## 24. Định vị cuối cùng

KHỚP không phải chatbot, không phải Mini MISA và không phải công cụ tự khai thuế.

KHỚP là:

> **Một đội AI chuyên gia vận hành cho SHB, tự động nối đơn hàng, dòng tiền, tiền mặt và hóa đơn; phát hiện ngoại lệ; điều phối người xử lý; và tạo bộ dữ liệu sạch, có nguồn gốc, sẵn sàng chuyển sang quy trình kế toán hoặc thuế.**

### Tagline

> **KHỚP — Dòng tiền khớp. Sổ sách sạch. Vận hành nhẹ.**

---

*Last updated: 2026-07-17*
