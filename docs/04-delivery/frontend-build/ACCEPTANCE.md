# TaxLens Frontend Build Acceptance

> Baseline: `origin/main@13a3b74`; branch P3 `p3-frontend-design-consistency-final`; compatibility commit `90fae49`.

| Hạng mục | Trạng thái | Bằng chứng / điều kiện còn lại |
| --- | --- | --- |
| Git-safe integration | Đạt ở checkpoint | Branch P3 tách khỏi main và chỉ thay đổi phạm vi P3; cần kiểm tra conflict lại sau commit docs cuối |
| Design system và responsive shell | P3 đạt | Desktop, compact, mobile và accessibility states đã có test |
| Merchant screens | P3 đạt | Dashboard, ledger, exceptions, invoices, tax, sales, assistant, settings có loading/empty/error states |
| SHB Operations và public confirmation | P3 đạt | Ops views và confirmed/expired/invalid states đã được triển khai |
| Adapter tương thích main | Đạt tập trung | 18/18 Vitest qua tại `90fae49` cho dashboard, transactions, sales, tax và WebSocket |
| Cổng frontend đầy đủ | P3 đạt | `lint`, `typecheck`, 44/44 Vitest, production build 27 routes và 33/33 Playwright desktop/compact/mobile qua ngày 2026-07-18 |
| Demo sáu cảnh | Đang chờ | Phải diễn tập trên backend tích hợp và ghi kết quả thực tế |
| Persisted product outcome | Bị chặn ngoài P3 | P4 thiếu POS context, auth/lifecycle/realtime isolation; P1 rate chưa dựa trên allocation thật; P2 agent chưa có streamed approval/persisted lifecycle |
| Product release | Chưa đạt | Chỉ đạt sau khi full gate qua, không conflict với main, demo rehearsal qua và blocker owner được đóng |

Không chấp nhận một stage chỉ vì giao diện đẹp hoặc mock test qua. Mỗi hành động người dùng phải tạo kết quả backend được lưu, sau đó read model liên quan phải refresh đúng.

`P3 đạt` chỉ xác nhận bề mặt sản phẩm và contract behavior thuộc phạm vi P3. Cụm từ này không xác nhận P1/P2/P4 runtime đã sẵn sàng production.
