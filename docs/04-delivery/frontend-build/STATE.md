# TaxLens Frontend Build State

> Trạng thái kỹ thuật P3 tại ngày 2026-07-18. Yêu cầu sản phẩm do `frontend-design-consistency-cf1ebe.md` và tài liệu chuẩn của repository sở hữu.

## Điểm kiểm soát hiện tại

- Role: P3 Tan, Product + Frontend
- Branch: `p3-frontend-design-consistency-final`
- Base tích hợp: `origin/main` tại `13a3b74`
- Commit tương thích contract hiện tại: `90fae49`
- Đã xác minh tập trung: 18/18 Vitest cho adapter dashboard, transactions, sales, tax, realtime và domain contracts
- Cổng frontend cuối tại worktree hiện tại: `lint`, `typecheck`, 44/44 Vitest, production build 27 routes và 33/33 Playwright trên desktop/compact/mobile đều qua
- Demo: đang chờ diễn tập sáu cảnh với backend tích hợp; pitch deck được chủ sản phẩm hoãn

## Phạm vi đã chốt

- Frontend gọi REST qua gateway cùng origin `/api/backend/*`; `TAXLENS_BACKEND_URL` chỉ tồn tại phía server.
- JWT nằm trong HttpOnly cookie; không đưa token hoặc private model reasoning vào browser.
- Giữ nguyên `frontend/new-design/` và `frontend/reference/` làm tài sản tham chiếu.
- P3 chỉ sửa frontend, P3 tests, design/build docs và demo script. Không sửa P1/P2/P4/P5 để che contract thiếu.

## Blocker ngoài P3

- P4: backend chưa có `/pos/context`; dashboard/reconcile còn thiếu auth; WebSocket chưa có tenant isolation/auth đầy đủ; reconcile trả `PLANNING` nhưng chưa có lifecycle hoàn tất.
- P1: dashboard vẫn suy ra `matched` bằng số transaction/invoice thay vì kết quả allocation thực, nên reconciliation rate chưa phải số liệu nghiệp vụ chuẩn.
- P2: agent flow hiện là skeleton, chưa có streamed execution, approval và persisted run lifecycle mà giao diện cần cho luồng end-to-end.

Không được tuyên bố sản phẩm live end-to-end hoàn tất cho đến khi các owner đóng blocker và diễn tập demo thành công. Cổng frontend P3 đã qua; mọi thay đổi code tiếp theo phải chạy lại cổng tương ứng.
