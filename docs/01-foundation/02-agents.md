# 01-foundation/02-agents.md — TaxLens Agent Operating Rules

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Project Lead
> **Applies to:** Mọi AI agent và developer làm việc trên TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Required reading order

1. File này (`01-foundation/02-agents.md`)
2. `01-foundation/01-overview.md` — context, capability matrix, anti-drift map
3. `01-foundation/03-decisions.md` — mọi decision đã accept
4. Specification liên quan cho task (xem task-to-doc map trong `01-foundation/01-overview.md`)
5. `05-domain/01-ai-advisor.md` — nếu thay đổi agent behavior
6. `05-domain/02-algorithm.md` — nếu thay đổi matching logic
7. `05-domain/05-compliance.md` — nếu thay đổi tax rule
8. `04-delivery/04-implementation-plan.md` — cho thứ tự implement

## Source-of-truth hierarchy

Xem `01-foundation/01-overview.md` § Source-of-truth hierarchy.

## Command chạy trước khi thay đổi

```bash
git status --short
git diff --stat
```

## Command chạy sau khi thay đổi

```bash
# Backend
cd backend && python -m pytest tests/ -v
cd backend && python -m pyflakes .

# Frontend
cd frontend && npm run build
cd frontend && npm run lint

# Database
# Verify migration chạy sạch
cd backend && alembic upgrade head
```

## Ranh giới repository

- **Không edit:** `docs/DECISIONS.md` mà không có Project Lead approval
- **Generated file:** schema section trong `docs/07-data-models.md` phải khớp migration — không edit schema thủ công; update migration và regenerate
- **Shared contract:** tool allowlist trong `05-domain/01-ai-advisor.md` shared across mọi agent — coordinate trước khi thay đổi
- **Tax rule:** Không bao giờ sửa tax rule logic ngoài Tax Rules Engine service

## Operation bị cấm

- Không bao giờ chạy: `git reset --hard`, `git clean -fd`, `git push --force`
- Không bao giờ xóa tracked file mà không check import, history, và reference
- Không bao giờ stage với `git add -A`; stage exact path only
- Không bao giờ gộp work không liên quan trong một commit
- Không bao giờ dùng LLM cho tax calculation, exact matching, hoặc duplicate detection
- Không bao giờ auto-resolve giao dịch confidence < 95%
- Không bao giờ gửi unmasked sensitive data cho LLM provider
- Không bao giờ gọi tool ngoài allowlist của agent
- Không bao giờ skip audit logging cho bất kỳ tool call hoặc human approval nào

## State và persistence invariant

- Mọi bank transaction, sale, cash session, và invoice có canonical ledger entry
- `payment_reference` là primary link key giữa order, payment intent, và bank transaction
- Tax rule version immutable sau khi phê duyệt
- Audit event append-only; không update hay delete
- Agent run có state machine: `PENDING` → `PLANNING` → `EXECUTING` → `WAITING_FOR_HUMAN` → `COMPLETED` / `FAILED`
- Payment allocation phải tổng bằng payment amount (không over-allocation)

## Rule xử lý asset

- Không custom artwork hay mascot cho MVP
- Dùng standard icon library (Lucide)
- Text tiếng Việt phải dùng Unicode normalization đúng (NFC)

## Kỳ vọng commit

- Một logical change mỗi commit
- Stage exact path, không `git add -A`
- Verify: `git status`, `git diff --cached` trước khi commit
- Format commit message: `[module] mô tả ngắn gọn`

## Agent ownership

- **Planner Agent** sở hữu: task decomposition, agent delegation, plan state
- **Reconciliation Agent** sở hữu: transaction matching, exception creation, allocation
- **Tax & Compliance Agent** sở hữu: rule validation, tax-readiness report, draft export
- **Merchant Operations Agent** sở hữu: case creation, RM assignment, merchant messaging, export

## Khi nào dừng và hỏi

- Một product decision quan trọng chưa được giải quyết
- Nhiều option hợp lệ tạo ra outcome khác biệt đáng kể
- Một action phá hủy mơ hồ
- Thiếu credential hoặc external access
- Instruction xung đột
- Không thể hoàn thành an toàn mà không có clarification
- SHB sandbox API access yêu cầu nhưng không có sẵn
- Tax rule content mơ hồ hoặc xung đột

## Cái gì counts làm bằng chứng

- Test output pass (`pytest -v`)
- Build thành công (`npm run build`, `uvicorn main:app`)
- Schema validation result (`alembic upgrade head`)
- Lint output (`pyflakes`, `npm run lint`)
- Agent trace cho tool call, confidence, và audit record
- Audit log export (JSON/CSV)

---

*Last updated: 2026-07-17*
