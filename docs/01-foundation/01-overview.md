# TaxLens — Merchant TaxOps Agents for SHB

> TaxLens là hệ thống multi-agent AI cho SHB bank — đảm bảo minh bạch giao dịch, đối soát, kiểm toán được, và sẵn sàng thuế cho merchant bằng cách kết nối giao dịch, đơn hàng, tiền mặt, và hóa đơn thành revenue ledger sạch, auditable, sẵn sàng cho quy trình tax.

## Business context

Hộ kinh doanh Việt Nam có dữ liệu tài chính phân mảnh across POS, bank transfer, tiền mặt, và e-invoice. Không có hệ thống nào tự động đối soát các nguồn này. Nhân viên SHB dành nhiều thời gian kiểm tra giao dịch thủ công. TaxLens tự động hóa đối soát, chỉ surface ngoại lệ cho human review, và xuất dữ liệu tax-ready.

## Tech stack

| Layer               | Technology                        | Version |
| ---------------------| -----------------------------------| ---------|
| Frontend            | Next.js + TypeScript              | 14+     |
| Backend             | FastAPI (Python)                  | 0.110+  |
| Database            | PostgreSQL                        | 16+     |
| Agent orchestration | LangGraph                         | latest  |
| Tool protocol       | MCP or typed function calling     | —       |
| LLM                 | Provider abstraction (no lock-in) | —       |
| Queue               | Redis + background worker         | 7+      |
| Deployment          | Docker                            | —       |

## Scope

### MVP / Phase hiện tại (Hackathon)

- 1 merchant salon, 1 store
- 30 đơn hàng, 20 bank transfer, 8 thanh toán tiền mặt
- 2 giao dịch không phải doanh thu, 2 giao dịch cùng số tiền gây mơ hồ, 1 hoàn tiền
- 2 đơn thiếu hóa đơn, 1 chênh lệch tiền mặt
- SePay API (real) cho giao dịch SHB, Mini POS, invoice mock, mock case-management API
- Tax Rules Engine với versioned rule
- Dynamic QR với payment reference
- Exact + fuzzy matching
- Exception Inbox với human confirmation
- Tax-readiness report
- Agent trace + audit log export

### Out of scope (MVP)

- Kê khai tax thật hoặc nộp hồ sơ
- Phát hành hóa đơn production
- Tích hợp MISA hoặc KiotViet production
- POS system đầy đủ
- Chấm điểm tín dụng hoặc quyết định vay
- Mobile app cho merchant
- Hỗ trợ multi-vertical ngoài salon

## Document map

| Document | Purpose | Audience | Owner | Authority | Status | Written |
|---|---|---|---|---|---|---|
| `01-foundation/01-overview.md` | Tóm tắt executive | All | Project Lead | Normative | Canonical | Phase 1 |
| `01-foundation/02-agents.md` | Rule vận hành agent | AI agent, dev | Project Lead | Normative | Canonical | Phase 1 |
| `01-foundation/03-decisions.md` | Decision register | All | Project Lead | Normative | Canonical | Phase 1 |
| `02-requirements/01-business-requirements.md` | Business context, model | PM, stakeholder | PM | Normative | Canonical | Phase 1 |
| `02-requirements/02-stakeholders-and-personas.md` | Persona | PM, design | PM | Normative | Canonical | Phase 1 |
| `02-requirements/03-user-stories.md` | User story | PM, eng | PM | Normative | Canonical | Phase 1 |
| `02-requirements/04-functional-requirements.md` | Feature contract | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `02-requirements/05-non-functional-requirements.md` | NFR | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `03-engineering/01-system-architecture.md` | Architecture | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `03-engineering/02-data-models.md` | Data schema | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `03-engineering/03-api-specifications.md` | API endpoint | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `03-engineering/04-permissions-matrix.md` | RBAC | Eng, security | Security Lead | Normative | Canonical | Phase 2 |
| `03-engineering/05-integration.md` | Integration ngoài | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `03-engineering/06-security.md` | Security contract | Eng, security | Security Lead | Normative | Canonical | Phase 2 |
| `03-engineering/07-error-codes.md` | Error catalog | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `04-delivery/01-environment-setup.md` | Hướng dẫn setup | Dev mới | DevOps | Informative | Canonical | Phase 3 |
| `04-delivery/02-testing-spec.md` | Verification | Eng, QA | QA Lead | Normative | Canonical | Phase 2 |
| `04-delivery/03-design.md` | UI specification | Design, frontend | Design Lead | Normative | Canonical | Phase 3 |
| `04-delivery/04-implementation-plan.md` | Thứ tự implement | Eng | Tech Lead | Normative | Draft | Phase 3 |
| `04-delivery/05-roadmap.md` | Roadmap | PM, eng | Tech Lead | Normative | Draft | Phase 3 |
| `05-domain/01-ai-advisor.md` | AI agent spec | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `05-domain/02-algorithm.md` | Matching algorithm | Eng | Tech Lead | Normative | Canonical | Phase 2 |
| `05-domain/03-evaluation.md` | AI evaluation | Eng, QA | QA Lead | Normative | Canonical | Phase 2 |
| `05-domain/04-glossary.md` | Domain vocabulary | All | PM | Informative | Canonical | Phase 1 |
| `05-domain/05-compliance.md` | Tax compliance | Eng, compliance | Compliance Lead | Normative | Canonical | Phase 2 |

## Source-of-truth hierarchy

1. **Decision mới nhất được owner phê duyệt** — decision trong `01-foundation/03-decisions.md` với `Status: Accepted`
2. **Decision register đã lock** — `01-foundation/03-decisions.md`
3. **Product contract canonical hiện tại** — normative specification cho area đó
4. **Domain-specific specification** — `05-domain/01-ai-advisor.md`, `05-domain/02-algorithm.md`, `05-domain/05-compliance.md`
5. **Executable schema và test** — migration file, test suite
6. **Implementation hiện tại đã verify** — code confirm khớp spec
7. **Git history làm bằng chứng hỗ trợ** — commit, PR, diff
8. **Tài liệu cũ hoặc đã nghỉ hưu** — tài liệu với `Status: Superseded` hoặc `Retired`

Khi tài liệu xung đột, source rank cao hơn wins.

## Capability matrix

| Capability | State | Source | Limitation |
|---|---|---|---|
| Planner Agent | Proposed | `05-domain/01-ai-advisor.md` | Chưa implement |
| Reconciliation Agent | Proposed | `05-domain/01-ai-advisor.md` | Chưa implement |
| Tax & Compliance Agent | Proposed | `05-domain/01-ai-advisor.md` | Chưa implement |
| Merchant Operations Agent | Proposed | `05-domain/01-ai-advisor.md` | Chưa implement |
| Exact matching | Proposed | `05-domain/02-algorithm.md` | Chưa implement |
| Fuzzy/candidate matching | Proposed | `05-domain/02-algorithm.md` | Chưa implement |
| Dynamic QR generation | Proposed | `02-requirements/04-functional-requirements.md` | Chưa implement |
| Mini POS | Proposed | `02-requirements/04-functional-requirements.md` | Feature set tối thiểu |
| Cash reconciliation | Proposed | `02-requirements/04-functional-requirements.md` | Chỉ detect chênh lệch |
| Tax-readiness report | Proposed | `05-domain/05-compliance.md` | Chỉ export nháp, không kê khai |
| Exception Inbox | Proposed | `04-delivery/03-design.md` | Chưa implement |
| Agent trace UI | Proposed | `04-delivery/03-design.md` | Chưa implement |
| Audit log export | Proposed | `03-engineering/06-security.md` | Chưa implement |
| SHB transaction adapter | Proposed | `03-engineering/05-integration.md` | Chỉ sandbox/mock |
| SePay webhook adapter | Proposed | `03-engineering/05-integration.md` | Chỉ sandbox |
| Invoice adapter | Proposed | `03-engineering/05-integration.md` | Mock provider |
| Case management | Proposed | `03-engineering/05-integration.md` | Mock SHB API |
| Canonical Event Ledger | Proposed | `03-engineering/02-data-models.md` | Chưa implement |
| Tax Rules Engine | Proposed | `05-domain/05-compliance.md` | Deterministic, versioned |
| RBAC | Proposed | `03-engineering/04-permissions-matrix.md` | Chưa implement |

## Context / anti-drift map

- **Product này là gì?** Hệ thống multi-agent AI TaxOps cho SHB bank đối soát dữ liệu tài chính merchant.
- **Hiện tại đã implement gì?** Chưa gì — đây là greenfield project.
- **Chưa implement gì?** Tất cả. Mọi capability đều `Proposed`.
- **Tài liệu nào sở hữu mỗi system?** Xem document map ở trên.
- **Không bao giờ thay đổi hời hợt?** Source-of-truth hierarchy, agent tool allowlist, tax rule versioning, audit log schema.
- **File nào là historical?** Chưa có.
- **Route/module nào là canonical?** Định nghĩa trong `03-engineering/01-system-architecture.md` (target state).

### Task-to-doc map

| Task | Required doc |
|---|---|
| Thay đổi agent behavior | `01-foundation/02-agents.md`, `05-domain/01-ai-advisor.md`, `02-requirements/04-functional-requirements.md` |
| Thay đổi matching logic | `05-domain/02-algorithm.md`, `03-engineering/02-data-models.md`, `04-delivery/02-testing-spec.md` |
| Thay đổi tax rule | `05-domain/05-compliance.md`, `03-engineering/02-data-models.md`, `05-domain/01-ai-advisor.md` |
| Thay đổi UI screen | `04-delivery/03-design.md`, `04-delivery/04-implementation-plan.md` |
| Thêm integration | `03-engineering/05-integration.md`, `03-engineering/02-data-models.md`, `03-engineering/01-system-architecture.md` |
| Thay đổi security | `03-engineering/06-security.md`, `03-engineering/04-permissions-matrix.md`, `03-engineering/02-data-models.md` |
| Thay đổi API endpoint | `03-engineering/03-api-specifications.md`, `03-engineering/07-error-codes.md` |

## Verification

### Automated

- `ls docs/` — verify mọi tài liệu liệt kê tồn tại
- `grep -r "Status:" docs/` — verify mọi tài liệu có metadata

### Manual

- Review document map: mọi tài liệu liệt kê tồn tại và có metadata đúng
- Review capability matrix: tất cả state là `Proposed` (greenfield)

---

*Last updated: 2026-07-17*
