# Functional Requirements — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Reconciliation

### FR-RECON-001: Exact matching by payment reference

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

---

### FR-RECON-002: Candidate matching without reference

**Description:** Khi không có payment reference, hệ thống tạo candidate match dựa trên merchant, số tiền gần khớp, khoảng thời gian, trạng thái đơn, độ quen của tên người gửi, và nội dung chuyển khoản. Mỗi candidate nhận match score.

**Acceptance criteria:**
- [ ] Candidate chỉ được tạo cho cùng merchant và store
- [ ] Score dùng weighted factor: số tiền chính xác (+50), thời gian <1phút (+20), reference/match (+20), người gửi quen (+10), nhiều đơn cùng số tiền (-30)
- [ ] Score ≥95%: auto-match
- [ ] Score 75–94%: đặt vào Exception Inbox để xác nhận con người
- [ ] Score <75%: mark `UNMATCHED`
- [ ] Giao dịch đã dùng được loại khỏi candidate

**Business rules:**
- Scoring weight có thể cấu hình trong tax_rule_versions (xem `05-domain/02-algorithm.md`)
- Time window mặc định: 60 phút
- Amount proximity: chỉ exact match cho MVP (không dung sai)

**Edge cases:**
- Hai đơn giống hệt và không có identifier → ngoại lệ bắt buộc (không đoán)
- Không tìm thấy candidate → giao dịch mark `UNMATCHED`
- Nhiều candidate cùng score → tạo exception

**Traces to:** BR-003, USR-RECON-002

---

### FR-RECON-003: Exception Inbox

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

---

### FR-RECON-004: AI suggestion with confidence and reasoning

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

---

### FR-RECON-005: Payment allocation

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

---

## Tax & Compliance

### FR-TAX-001: Tax-readiness checklist

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

---

### FR-TAX-002: Rule version in report

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

---

### FR-TAX-003: Missing invoice detection

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

---

### FR-TAX-004: Draft export

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

---

## Merchant Operations

### FR-OPS-001: Case creation

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

---

### FR-OPS-002: Draft merchant message

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

---

### FR-OPS-003: RM assignment

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

---

## Mini POS & Payments

### FR-POS-001: Mini POS sale creation

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

---

### FR-POS-002: Dynamic QR generation

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

---

### FR-POS-003: Cash payment recording

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

---

### FR-POS-004: Cash reconciliation at shift end

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

---

## Agent Orchestration & Trace

### FR-AGENT-001: Natural language request to Planner

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

---

### FR-AGENT-002: Agent trace display

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

---

### FR-AGENT-003: Audit log export

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

---

## Merchant Confirmation

### FR-MERCHANT-001: Transaction confirmation link

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

---

## Data Ingestion

### FR-DATA-001: Canonical Event Ledger ingestion

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
- Adapter map schema ngoài sang canonical schema (xem `03-engineering/05-integration.md`)
- Ingestion là idempotent: cùng source record ingest hai lần không tạo duplicate

**Edge cases:**
- Source data sai format: log và bỏ qua với error record
- Adapter không khả dụng: ingestion queue để retry

**Traces to:** BR-001

---

## Verification

### Automated

- `pytest tests/test_reconciliation.py -v` — verify logic matching
- `pytest tests/test_tax_rules.py -v` — verify kiểm tra tax-readiness
- `pytest tests/test_agents.py -v` — verify agent orchestration
- `pytest tests/test_audit.py -v` — verify audit log export

### Manual

- Tạo sale trong Mini POS → tạo QR → simulate webhook → verify auto-match
- Tạo giao dịch mơ hồ → verify xuất hiện trong Exception Inbox
- Chạy kiểm tra tax-readiness → verify checklist và rule version
- Export audit log → verify format JSON và CSV

### Evidence

- Screenshot agent trace cho thấy planner decomposition và tool call
- File export audit log

---

*Last updated: 2026-07-17*
