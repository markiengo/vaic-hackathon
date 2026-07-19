# Demo script — TaxLens Sprint 4

> **Owner:** P3 — Product + Frontend
>
> **Thời lượng mục tiêu:** 8 phút 30 giây, bao gồm 1 phút buffer
>
> **Kỳ dữ liệu:** Tháng 07/2026
>
> **Nguyên tắc:** Demo dữ liệu thật trong môi trường sandbox. Nếu phải dùng fallback, presenter nói rõ đó là fallback; không trình bày screenshot hoặc seeded state như một thao tác live vừa thành công.

## 1. Mục tiêu câu chuyện

Trong sáu cảnh, TaxLens phải chứng minh một vòng khép kín:

1. Hương giao mục tiêu bằng tiếng Việt trong Merchant Workspace và thấy Planner chia việc.
2. Merchant tạo sale 350.000₫, nhận dynamic QR và giao dịch được auto-match sau SePay webhook.
3. Giao dịch mơ hồ 5.000.000₫ không bị tự động xử lý; AI đề xuất "chuyển nội bộ" với confidence 82% và chờ con người xác nhận.
4. Tax Agent chỉ ra đúng hai đơn thiếu hóa đơn trong tax-readiness checklist.
5. Merchant Ops Agent tạo case, gán RM, soạn tin nhắn tiếng Việt và tạo draft export có kiểm soát.
6. Kết quả đã kiểm chứng trên seed chuẩn cho thấy 23 giao dịch gồm 15 matched và 8 exceptions; presenter chỉ đọc số live nếu chúng vẫn khớp checkpoint sau các thao tác demo.

Thông điệp kết thúc:

> **Merchant tự xử lý ngoại lệ đơn giản. SHB chỉ can thiệp khi cần. Dữ liệu thuế sẵn sàng đúng hạn.**

## 2. Phân vai và cửa sổ demo

| Vai | Người dùng trong câu chuyện | Workspace |
|---|---|---|
| Presenter | Điều khiển demo và giải thích | Tất cả |
| Linh | Nhân viên SHB Operations | `/ops/cases`, `/ops/agent-runs`, `/ops/audit` |
| Hương | Chủ Salon Hương | `/assistant`, `/sales`, `/exceptions`, `/invoices`, `/tax-readiness`, `/transactions` |
| Operator | Gửi SePay webhook sandbox khi presenter ra hiệu | Không trình chiếu terminal |

Chuẩn bị hai tab đã đăng nhập trước khi bắt đầu:

- **Tab A — Merchant Workspace (Hương):** mở `/assistant`.
- **Tab B — SHB Operations (Linh):** mở `/ops/cases`.

Không mở DevTools hoặc terminal trong phần trình bày chính. Chỉ dùng chúng trong preflight hoặc khi ban giám khảo hỏi sâu.

## 3. Preflight trước demo

Thực hiện trước giờ trình bày 15 phút. Đây không tính vào thời lượng demo.

- [ ] Frontend và backend sandbox đều healthy; refresh `/dashboard` không báo lỗi.
- [ ] Đăng nhập được vào cả Merchant Workspace và SHB Operations bằng đúng demo accounts.
- [ ] Kỳ báo cáo đang là `Tháng 07/2026`.
- [ ] Prompt ở Cảnh 1 nhận diện được merchant `Salon Hương`.
- [ ] `/sales` cho phép thêm mặt hàng tùy chỉnh và tạo tổng chính xác `350.000₫`.
- [ ] Operator có sẵn payload SePay sandbox tương ứng với QR mới, nhưng chưa gửi.
- [ ] `/exceptions` có giao dịch `5.000.000₫`, đề xuất `chuyển nội bộ`, confidence `82%` và đang ở trạng thái chưa xử lý.
- [ ] `/invoices` và `/tax-readiness` cùng phản ánh `2` đơn thiếu hóa đơn.
- [ ] `/ops/cases` có thể hiển thị case, thao tác gán RM và soạn yêu cầu merchant xác nhận.
- [ ] Draft JSON/CSV được tạo trong sandbox và không tự động nộp cho cơ quan thuế hoặc gửi sang hệ thống kế toán.
- [ ] Checkpoint seed chuẩn có bộ số `23 / 15 / 8`; nếu số liệu đã bị thay đổi bởi lần rehearsal trước, yêu cầu P5 reset seed. P3 không tự sửa seed.
- [ ] Đã chụp fallback screenshots sau một lần rehearsal thành công; mỗi ảnh có timestamp và tên route.
- [ ] Tắt thông báo hệ điều hành; đặt zoom trình duyệt 100%; dùng viewport tối thiểu 1280×720.

### Stop gate

Không bắt đầu demo nếu một trong bốn bằng chứng cốt lõi bị thiếu: Planner plan, QR/reference, exception 5.000.000₫, hoặc checkpoint 23/15/8. Dành tối đa 60 giây để sửa ở preflight; sau đó chuyển sang bản ghi rehearsal đã xác minh thay vì ứng biến dữ liệu.

## 4. Timeline tổng

| Mốc | Cảnh | Thời lượng | Thời gian lũy kế |
|---|---|---:|---:|
| 00:00 | Mở bài | 0:25 | 0:25 |
| 00:25 | 1. Yêu cầu tự nhiên → Planner plan | 1:05 | 1:30 |
| 01:30 | 2. Sale 350.000₫ → QR → webhook → auto-match | 1:35 | 3:05 |
| 03:05 | 3. Ngoại lệ 5.000.000₫ → AI 82% → human confirm | 1:20 | 4:25 |
| 04:25 | 4. Hai đơn thiếu hóa đơn → tax-readiness | 0:55 | 5:20 |
| 05:20 | 5. Case → RM → tin nhắn → draft export | 1:35 | 6:55 |
| 06:55 | 6. Before/after và kết luận | 0:35 | 7:30 |
| 07:30 | Buffer cho chuyển tab hoặc latency | 1:00 | 8:30 |

**Presenter mở bài:**

> “TaxLens biến dòng tiền rời rạc thành ledger có thể giải thích. Hệ thống tự động làm phần chắc chắn, giữ lại phần mơ hồ cho con người và đưa SHB vào đúng lúc.”

## 5. Kịch bản sáu cảnh

### Cảnh 1 — Hương nhập yêu cầu, Planner hiển thị plan

**Route:** `/assistant`

**Thời lượng:** 1 phút 05 giây

**Thao tác chính xác:**

1. Đặt con trỏ vào ô `Yêu cầu mới`.
2. Nhập nguyên văn: **“Kiểm tra Salon Hương đã sẵn sàng cho kỳ báo cáo tháng 7 chưa”**.
3. Bấm `Bắt đầu kiểm tra` đúng một lần.
4. Dừng ở khối `Kế hoạch có thể truy vết`; chỉ lần lượt chỉ vào agent, action và thứ tự dependency.
5. Khi tool events xuất hiện, chuyển nhanh qua `Kết quả`, `Tóm tắt`, `Audit trail` để cho thấy output có cấu trúc và evidence, không phải một đoạn chat tự do.
6. Nếu có write action, dừng tại `Human checkpoint`; chưa duyệt ở cảnh này.

**Presenter cue:**

> “Hương không cần tìm qua nhiều menu. Planner hiểu mục tiêu tiếng Việt, chia việc cho các specialist agent và công khai tool, duration, kết quả cùng điểm cần con người duyệt.”

**Expected outcome:**

- Run bắt đầu và có `run_id`.
- Planner plan hiển thị các bước có thứ tự.
- Tool progress cập nhật trực tiếp; write action không tự chạy.
- Audit trail ghi nhận sự kiện đã hiển thị.

**Recovery:**

- Nếu stream chưa phản hồi sau 5 giây, chờ thêm tối đa 10 giây và không bấm lại.
- Nếu stream ngắt, nói “luồng bị gián đoạn và không có write action nào tự chạy”, sau đó mở `/ops/agent-runs` và chọn run vừa tạo để xem persisted trace.
- Nếu không tạo được run, dùng screenshot/video của rehearsal và nói rõ: “Đây là trace của lần rehearsal gần nhất”; không gọi đó là live run.

**Bằng chứng cần capture:** Planner plan, một tool-completed event, một approval boundary hoặc trạng thái hoàn tất.

---

### Cảnh 2 — Mini POS tạo sale 350.000₫, dynamic QR, SePay webhook và auto-match

**Routes:** `/sales` → `/transactions`

**Thời lượng:** 1 phút 35 giây

**Thao tác chính xác:**

1. Chuyển sang Tab A tại `/sales`.
2. Nếu catalog không có đúng mức giá, bấm `Thêm mặt hàng tùy chỉnh`.
3. Nhập tên `Combo chăm sóc tóc tháng 7`, đơn giá `350000`, rồi bấm `Thêm vào đơn`.
4. Xác nhận `Tổng thanh toán` hiển thị **350.000₫**.
5. Bấm `Tạo QR` một lần.
6. Chỉ vào QR, số tiền, payment reference và countdown; đọc reference để operator xác nhận đúng payload.
7. Ra hiệu operator: **“Gửi webhook”**. Operator gửi đúng SePay webhook sandbox cho reference vừa tạo.
8. Đợi UI báo nhận thanh toán hoặc chuyển sang `/transactions`; tìm giao dịch 350.000₫ và chỉ trạng thái matched/paid.

**Presenter cue:**

> “Sale sinh ra payment reference ngay từ đầu. Khi SePay gửi webhook, TaxLens nối tiền vào đúng sale thay vì bắt merchant dò sao kê thủ công.”

**Expected outcome:**

- Sale được lưu đúng `350.000₫`.
- Dynamic QR có reference duy nhất và thời hạn rõ ràng.
- Webhook được nhận một lần; giao dịch xuất hiện trong ledger.
- Sale/giao dịch chuyển sang trạng thái đã thanh toán và auto-matched mà không cần quyết định tay.

**Recovery:**

- Nếu không có sản phẩm đúng giá, luôn dùng mặt hàng tùy chỉnh; không cộng nhẩm nhiều sản phẩm trước khán giả.
- Nếu QR chưa mở, không tạo sale thứ hai. Dùng `Mở lại QR` để giữ nguyên reference.
- Nếu webhook chậm, refresh `/transactions` một lần sau 10 giây. Không gửi payload lần hai trước khi operator kiểm tra response đầu tiên.
- Nếu webhook thành công nhưng chưa auto-match, dừng claim ở “đã vào ledger”; nói rõ auto-match chưa hoàn tất và dùng evidence rehearsal cho kết quả kỳ vọng. Đây là boundary của backend/matching, P3 không sửa dữ liệu trong lúc demo.

**Bằng chứng cần capture:** QR với 350.000₫ và reference, giao dịch tương ứng ở ledger, trạng thái match.

---

### Cảnh 3 — Giao dịch mơ hồ 5.000.000₫, AI đề xuất 82% và con người xác nhận

**Route:** `/exceptions`

**Thời lượng:** 1 phút 20 giây

**Thao tác chính xác:**

1. Mở `/exceptions` và chọn item có số tiền **5.000.000₫**.
2. Chỉ vào nội dung ngân hàng, đề xuất **chuyển nội bộ**, confidence **82%** và reasoning.
3. Nhấn mạnh rằng item vẫn ở `Cần xác nhận`; AI chưa ghi phân loại.
4. Chọn `Chuyển khoản nội bộ`.
5. Bấm `Xác nhận lựa chọn`.
6. Chờ toast `Đã lưu quyết định` và item rời hàng chờ.

**Presenter cue:**

> “82% đủ để gợi ý, không đủ để tự ý ghi sổ. TaxLens đưa bằng chứng cho Hương và chỉ cập nhật ledger sau thao tác xác nhận rõ ràng.”

**Expected outcome:**

- Amount, đề xuất, confidence và reasoning hiển thị cùng nhau.
- Không có write trước khi bấm xác nhận.
- Human decision được persisted; exception được giải quyết và readiness được tính lại.

**Recovery:**

- Nếu record 5.000.000₫ không có trong queue, không tạo record giả. Chuyển sang case đã seed trong `/ops/cases` hoặc screenshot rehearsal, đồng thời nói rõ nguồn evidence.
- Nếu confidence hiển thị khác 82%, không đọc 82% như kết quả live. Dùng giá trị đang hiển thị và đánh dấu seed drift cho P1/P5 sau demo.
- Nếu mutation lỗi, giữ nguyên màn hình để chứng minh safety: item không biến mất và quyết định chưa được ghi.

**Bằng chứng cần capture:** card 5.000.000₫ với 82%, lựa chọn chuyển nội bộ, toast thành công hoặc audit event.

---

### Cảnh 4 — Tax Agent phát hiện hai đơn thiếu hóa đơn

**Routes:** `/invoices` → `/tax-readiness`

**Thời lượng:** 55 giây

**Thao tác chính xác:**

1. Mở `/invoices`; chỉ banner **“Còn 2 đơn thiếu hóa đơn”** và hai records tương ứng.
2. Mở `/tax-readiness`.
3. Chỉ vào score, checklist đang fail vì thiếu hóa đơn và rule version.
4. Chỉ vào khu vực export; giải thích export bị khóa khi dữ liệu chưa đủ điều kiện.

**Presenter cue:**

> “Tax Agent không đoán luật. Hai đơn thiếu hóa đơn trở thành blocker có thể xử lý, gắn với rule version và trực tiếp quyết định việc có được tạo bộ export nháp hay chưa.”

**Expected outcome:**

- Invoice workspace hiển thị đúng `2` đơn thiếu hóa đơn.
- Tax-readiness checklist phản ánh cùng một vấn đề, không lệch số liệu.
- Rule version hiển thị.
- Export không được trình bày như hành động nộp thuế; khi chưa ready, nút bị khóa.

**Recovery:**

- Nếu `/invoices` và `/tax-readiness` lệch nhau, không reload liên tục hoặc sửa record. Trình bày một màn hình có persisted evidence và ghi nhận integration defect cho owner backend/data.
- Nếu checklist đã pass do rehearsal trước, dùng screenshot trước khi xử lý hóa đơn và nói rõ đây là trạng thái pre-resolution của cùng demo dataset.

**Bằng chứng cần capture:** banner hai đơn thiếu hóa đơn, failing checklist, rule version.

---

### Cảnh 5 — Merchant Ops Agent tạo case, gán RM, draft tin nhắn và draft export

**Routes:** Tab B `/ops/cases` → Tab A `/assistant` → Tab A `/tax-readiness`

**Thời lượng:** 1 phút 35 giây

**Thao tác chính xác:**

1. Chuyển sang Tab B, tài khoản Linh; mở `/ops/cases` và chọn case vừa tạo hoặc case liên quan tới ngoại lệ demo.
2. Chỉ vào evidence, AI suggestion, status và action history.
3. Giữ hoặc nhập mã RM `U003`, bấm `Gán case cho RM`; chờ `Đã cập nhật case`.
4. Bấm `Soạn yêu cầu merchant xác nhận`; đọc một câu từ draft tiếng Việt và chỉ trạng thái draft.
5. Chuyển rõ ràng về Tab A, tài khoản Hương; mở `/assistant`. Tại `Human checkpoint`, bấm `Duyệt riêng hành động này` cho action tạo draft export, sau đó bấm `Thực thi payload đã duyệt`.
6. Trong Tab A, mở `/tax-readiness` và chỉ file nháp JSON/CSV nếu trạng thái đã ready. Nhắc rõ đây là **draft export**, không phải nộp thuế hoặc tự động gửi sang hệ thống kế toán.

**Presenter cue:**

> “Agent có thể chuẩn bị công việc vận hành, nhưng quyền ghi vẫn tách làm hai bước: duyệt payload rồi mới thực thi. RM nhận đúng case, merchant nhận tin nhắn tiếng Việt, và bộ export chỉ là bản nháp để kiểm tra.”

**Expected outcome:**

- Case thật xuất hiện trong queue với evidence và history.
- `assigned_rm_id` cập nhật thành `U003`.
- Tin nhắn tiếng Việt được tạo ở trạng thái draft.
- Action tạo draft export chỉ chạy sau approve và execute riêng biệt.
- Artifact export có rule version/audit evidence và không phát sinh thao tác nộp tự động.

**Recovery:**

- Nếu không có case mới, dùng case đang mở đã được preflight; nói rõ đây là case sandbox chuẩn bị sẵn.
- Nếu assign hoặc draft lỗi, giữ error state trên màn hình để chứng minh thao tác không được báo thành công giả.
- Nếu action export không xuất hiện, không dùng một action khác để thay thế. Mở artifact của rehearsal và nói rõ provenance.
- Nếu readiness chưa cho export, giải thích đúng safety gate và dừng ở trạng thái locked; không sửa rule hoặc dữ liệu.

**Bằng chứng cần capture:** case ID, RM assignment, draft message, action APPROVED/COMPLETED, draft export artifact.

---

### Cảnh 6 — So sánh before/after

**Route:** `/dashboard` hoặc slide kết quả đã đối chiếu với demo dataset

**Thời lượng:** 35 giây

**Thao tác chính xác:**

1. Hiển thị cùng lúc bộ số trước và sau.
2. Đọc ba kết quả, không đọc toàn bộ bảng.
3. Kết thúc bằng thông điệp sản phẩm.

| Trước TaxLens | Sau TaxLens |
|---|---|
| 23 giao dịch cần đối chiếu trong seed chuẩn | 15 giao dịch matched có evidence |
| Không có hàng chờ ưu tiên | 8 exceptions được giữ lại cho con người |
| Không có checkpoint tái lập | Truth set `23 / 15 / 8` đã qua 30/30 kiểm tra pipeline |

**Presenter cue:**

> “Trên seed chuẩn đã kiểm chứng, 15 trên 23 giao dịch được matched, tương đương 65,2%. Tám ngoại lệ được giữ lại đúng cho con người thay vì bị hệ thống tự quyết. Đây là truth set của demo, không phải accuracy production.”

Sau đó kết thúc:

> “Merchant tự xử lý ngoại lệ đơn giản. SHB chỉ can thiệp khi cần. Dữ liệu thuế sẵn sàng đúng hạn.”

**Expected outcome:**

- Các số `23`, `15`, `8` nhất quán với seed checkpoint và pipeline validation; nếu demo live đã thêm giao dịch, presenter đọc số live và nói rõ phần chênh lệch.
- Presenter phân biệt rõ **kết quả demo** với KPI pilot; không suy rộng thành production accuracy.

**Recovery:**

- Nếu dashboard live đã thay đổi sau các thao tác trước, dùng bảng kết quả đã capture từ cùng seed version và nói rõ timestamp.
- Không tính lại hoặc sửa số trực tiếp trên UI trong lúc demo.

## 6. Recovery matrix nhanh

| Sự cố | Quyết định trong 10 giây | Câu nói an toàn |
|---|---|---|
| SSE/agent stream chậm | Mở persisted run tại `/ops/agent-runs` | “Run được lưu; ta xem cùng evidence từ persisted trace.” |
| Webhook chậm | Mở `/transactions`, refresh một lần | “Tiền đã/ chưa vào ledger; tôi không gọi auto-match thành công trước khi trạng thái xác nhận.” |
| Seed record thiếu | Dùng screenshot rehearsal có timestamp | “Đây là evidence từ lần rehearsal trên cùng seed version.” |
| Mutation thất bại | Giữ error state, không bấm lặp | “Safety gate giữ nguyên dữ liệu khi write chưa thành công.” |
| Export bị khóa | Giải thích readiness gate | “TaxLens không cho tạo export khi blocker chưa được xử lý.” |
| Sai tên hoặc kỳ báo cáo | Dừng scene và dùng pre-captured evidence | “Session hiện không khớp demo dataset; tôi dùng bản ghi đã xác minh thay vì sửa dữ liệu live.” |

## 7. Rehearsal record

P3 điền sau mỗi lần chạy. Một rehearsal chỉ được đánh dấu `PASS` khi đủ cả sáu cảnh và expected outcomes.

| Lần | Thời gian | Commit/branch | Seed version | Kết quả | Thời lượng | Lỗi/fallback |
|---|---|---|---|---|---:|---|
| 1 | Chưa chạy | `p3-frontend-design-consistency-final` | Chưa xác nhận | PENDING | — | — |
| 2 | Chưa chạy | `p3-frontend-design-consistency-final` | Chưa xác nhận | PENDING | — | — |
| 3 | Chưa chạy | `p3-frontend-design-consistency-final` | Chưa xác nhận | PENDING | — | — |

### Definition of done cho rehearsal

- [ ] Sáu cảnh hoàn thành trong tối đa 8 phút 30 giây.
- [ ] Có ít nhất một lần end-to-end `PASS` không cần sửa dữ liệu trực tiếp.
- [ ] Tất cả số tiền, confidence và KPI được đọc đúng theo UI.
- [ ] Human approval được thể hiện trước mọi write action nhạy cảm.
- [ ] Fallback assets có route, timestamp, commit và seed version.
- [ ] Không có claim nào vượt quá bằng chứng của demo dataset.

## 8. Claim guardrails

- `15/23 = 65,2%` là matched rate của **seed truth set đã kiểm chứng**, không phải production accuracy.
- `8/23 = 34,8%` là tỷ lệ exceptions được giữ lại cho con người trong seed checkpoint; không được mô tả thành false-positive rate hoặc mức giảm workload production.
- Không đọc claim `45 phút → dưới 5 phút` khi chưa có rehearsal có timestamp xác minh thời lượng đó.
- Confidence `82%` là mức tin cậy của một đề xuất cụ thể, không phải độ chính xác tổng thể của model.
- Draft export là file JSON/CSV để review; TaxLens không tự nộp thuế và không tự gửi sang hệ thống kế toán trong flow này.
- Agent trace chỉ hiển thị plan, tool calls, duration, evidence, artifact và approval state; không trình bày private chain-of-thought.
