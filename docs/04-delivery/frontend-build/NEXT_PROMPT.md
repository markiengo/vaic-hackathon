# P3 Release Handoff

Tiếp tục trên `p3-frontend-design-consistency-final`, base `origin/main@13a3b74`. Commit tương thích contract hiện tại là `90fae49`; cổng frontend gần nhất đã qua `lint`, `typecheck`, 44/44 Vitest, production build và 33/33 Playwright.

## Việc tiếp theo

1. Xác minh branch, `git status`, HEAD và diff chỉ chứa phạm vi P3.
2. Không sửa pitch deck hoặc tài liệu work-split nếu Tan chưa mở rộng phạm vi.
3. Diễn tập sáu cảnh với backend tích hợp; ghi bằng chứng thật, không thay backend bằng mock để tuyên bố end-to-end.
4. Nếu có thêm code, chạy lại `lint`, `typecheck`, Vitest, production build và Playwright trước khi cập nhật evidence.
5. Trước mọi push tiếp theo, chạy conflict gate với `origin/main`, cập nhật `log.md` và commit đúng file.

## Ranh giới dừng

- P4 owner: `/pos/context`, auth dashboard/reconcile, reconcile lifecycle và WebSocket tenant isolation.
- P1 owner: reconciliation rate phải dựa trên allocation/match thật.
- P2 owner: streamed agent execution, approval và persisted run lifecycle.

Nếu một blocker trên xuất hiện, ghi endpoint, payload và test evidence rồi dừng nhánh đó. Không sửa backend, matching, agent internals, seed/reset, work-split hoặc pitch deck nếu Tan chưa mở rộng phạm vi. Không reset, clean, force-push hay ghi đè worktree của teammate.
