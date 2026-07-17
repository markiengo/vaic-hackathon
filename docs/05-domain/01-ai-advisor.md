# AI-Advisor Specification — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả module AI agent
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Năng lực và giới hạn AI

### AI được phép làm

| Năng lực | Agent | Mô tả |
|---|---|---|
| Interpret Vietnamese transfer notes | Reconciliation | Normalize diacritics, expand abbreviations, suggest transaction type |
| Score candidate matches | Reconciliation | Weight factors và produce confidence score |
| Explain match reasoning | Reconciliation | Generate human-readable reasoning cho match suggestions |
| Plan task decomposition | Planner | Break complex requests thành steps và assign cho agents |
| Explain tax rules bằng ngôn ngữ đơn giản | Tax & Compliance | Retrieve và paraphrase rule content |
| Classify revenue category | Tax & Compliance | Suggest classification dựa trên transaction patterns |
| Draft merchant messages | Merchant Ops | Compose Vietnamese confirmation requests |
| Retrieve business guidance | All | Inline context injection trong agent prompts (business rules ~200 lines) |

### AI KHÔNG được phép làm

| Cấm | Lý do |
|---|---|
| Compute tax formulas | Phải deterministic và auditable (DEC-004) |
| Perform exact matching | Phải deterministic (reference-based) |
| Detect duplicate transaction IDs | Phải deterministic (database check) |
| Modify tax rules | Rules immutable một khi approved |
| Auto-resolve transactions với confidence <95% | Cần human approval (DEC-005) |
| Submit tax filings | MVP chỉ produce draft export |
| Issue production invoices | Chỉ mock provider |
| Access tools ngoài allowlist | Security boundary (SEC-RBAC-003) |
| Make final decisions trên high-risk transactions | Cần human approval |
| Send messages mà không có RM review | Draft only; RM phải approve |

## Đặc tả agent

### Planner Agent

| Aspect | Chi tiết |
|---|---|
| Role | Phân tách complex requests thành tasks; delegate cho specialists |
| LLM model | `LLM_MODEL_PLANNER` (e.g., `deepseek-chat`) |
| Tools allowed | Không trực tiếp — delegate cho specialist agents |
| Output schema | `{"plan": [{"step": N, "action": "...", "agent": "..."}]}` |
| State machine | PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED/FAILED |
| Cấm | Direct tool calls, detailed classification, data correction |

**System prompt (tóm tắt):**
> You are the Planner Agent for TaxLens, a merchant TaxOps system for SHB bank. Your job is to decompose operational requests into a multi-step plan and delegate each step to the appropriate specialist agent. You do not call tools directly. You produce a structured plan. Agents: reconciliation, tax_compliance, merchant_ops.

### Reconciliation Agent

| Aspect | Chi tiết |
|---|---|
| Role | Match transactions với orders; tạo exceptions cho ambiguous cases |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`, `score_match_candidates`, `create_reconciliation_exception` |
| Output schema | `{"merchant_id": "...", "matched": N, "unmatched": N, "duplicate_candidates": N, "missing_invoice_cases": N, "exceptions": [...]}` |

### Tax & Compliance Agent

| Aspect | Chi tiết |
|---|---|
| Role | Validate data theo tax rules; generate tax-readiness report |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export` |
| Cấm | Tax formula computation, rule modification, filing submission |
| Output schema | `{"rule_version": "...", "checklist": [...], "ready": bool, "report": {...}}` |

### Merchant Operations Agent

| Aspect | Chi tiết |
|---|---|
| Role | Turn analysis results thành actions: cases, RM assignments, messages, exports |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system` |
| Output schema | `{"cases_created": N, "messages_drafted": N, "exports_created": N, "case_ids": [...]}` |

## Tool contracts

Mỗi tool có typed schema. Tools được gọi qua typed function calling.

```python
# Example tool contract
@tool
def score_match_candidates(
    merchant_id: str,
    amount: Decimal,
    time_window_minutes: int = 60,
    sender_name: str | None = None,
    note: str | None = None,
) -> list[MatchCandidate]:
    """Score candidate orders cho một bank transaction.
    
    Returns list of candidates với scores. Không auto-match.
    Auto-match được xử lý bởi deterministic matching engine.
    """
```

## Đặc tả output format

Tất cả agent outputs là structured JSON conforming Pydantic schemas. Không free-text output as truth.

### Shared Case State (inter-agent contract)

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

Agents read và write specific fields. Planner điều phối agent nào write khi nào.

## LLM provider và tool protocol

| Aspect | Detail |
|---|---|
| Provider | DeepSeek V4 Flash |
| Model | `deepseek-chat` (tất cả agent) |
| Thinking mode | Bật cho Planner Agent (task decomposition cần reasoning) |
| Tool protocol | Typed function calling (Python functions với type hints passed to LLM) |
| API auth | `Authorization: Bearer DEEPSEEK_API_KEY` |
| Endpoint | `https://api.deepseek.com/v1/chat/completions` |
| Temperature | 0.1 cho task deterministic (matching, tax); 0.3 cho message drafting |

## Xử lý error và hallucination

| Tình huống | Cách xử lý |
|---|---|
| LLM trả invalid JSON | Retry với format instruction (max 2 retries); sau đó fail run |
| LLM hallucinate tool không trong allowlist | Tool call rejected; logged trong audit_events; run tiếp tục với next step |
| LLM suggest action ngoài role | Suggestion ignored; logged |
| LLM confidence là None hoặc invalid | Default về 0.0; force human review |
| LLM provider unavailable | Fall back về rule-based default; log error; flag cho retry |

## Budget và rate limits

| Metric | Limit | Enforcement |
|---|---|---|
| LLM calls per agent run | 50 | Counter trong agent_runs; run fails nếu vượt |
| LLM tokens per call | 10,000 input, 2,000 output | Truncate input nếu vượt |
| Concurrent agent runs | 5 | Queue qua Redis |
| Context injection lookups per run | 20 | Counter trong tool_calls |

## Privacy và data retention cho AI interactions

- Sensitive data (account numbers, tax IDs, full names) masked trước LLM call (SEC-MASK-001)
- LLM prompts và responses KHÔNG store full; chỉ input_hash và output_hash trong tool_calls
- Business guidance documents injected trực tiếp vào agent prompts (~200 lines, không cần vector search)
- Không LLM provider training trên TaxLens data (provider API configured)

## Evaluation criteria

Xem `05-domain/03-evaluation.md` cho detailed evaluation methodology. Key criteria:

| Criterion | Cách đánh giá | Threshold |
|---|---|---|
| Match accuracy | Compare auto-matches với truth set | ≥95% cho exact, ≥80% overall |
| AI suggestion quality | Compare AI classification với human decision | ≥80% agreement |
| Vietnamese note interpretation | Test set 50 notes với known meanings | ≥85% correct |
| Message quality | RM review drafted messages | ≥90% acceptable without major edit |
| Hallucination rate | Count invalid tool calls / total | <5% |

## Verification

### Automated

- `cd backend && python -m pytest tests/test_agents.py -v` — agent behavior tests
- `cd backend && python -m pytest tests/test_tools.py -v` — tool schema tests
- Verify không agent nào call tools ngoài allowlist

### Manual

- Chạy agent với test request → verify plan, tool calls, và output schema
- Kiểm tra masked data trong LLM prompts (check logs)
- Kiểm tra hallucination handling (inject invalid tool name)

---

*Last updated: 2026-07-17*
