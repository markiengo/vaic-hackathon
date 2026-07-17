# AI-Advisor Specification — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All AI agent modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## AI capabilities and boundaries

### What the AI may do

| Capability | Agent | Description |
|---|---|---|
| Interpret Vietnamese transfer notes | Reconciliation | Normalize diacritics, expand abbreviations, suggest transaction type |
| Score candidate matches | Reconciliation | Weight factors and produce confidence score |
| Explain match reasoning | Reconciliation | Generate human-readable reasoning for match suggestions |
| Plan task decomposition | Planner | Break complex requests into steps and assign to agents |
| Explain tax rules in plain language | Tax & Compliance | Retrieve and paraphrase rule content |
| Classify revenue category | Tax & Compliance | Suggest classification based on transaction patterns |
| Draft merchant messages | Merchant Ops | Compose Vietnamese confirmation requests |
| Retrieve business guidance (RAG) | All | Query pgvector for relevant procedural documents |

### What the AI may NOT do

| Prohibition | Rationale |
|---|---|
| Compute tax formulas | Must be deterministic and auditable (DEC-004) |
| Perform exact matching | Must be deterministic (reference-based) |
| Detect duplicate transaction IDs | Must be deterministic (database check) |
| Modify tax rules | Rules are immutable once approved |
| Auto-resolve transactions with confidence <95% | Human approval required (DEC-005) |
| Submit tax filings | MVP produces draft export only |
| Issue production invoices | Mock provider only |
| Access tools outside its allowlist | Security boundary (SEC-RBAC-003) |
| Make final decisions on high-risk transactions | Human approval required |
| Send messages without RM review | Draft only; RM must approve |

## Agent specifications

### Planner Agent

| Aspect | Detail |
|---|---|
| Role | Decompose complex requests into tasks; delegate to specialists |
| LLM model | `LLM_MODEL_PLANNER` (e.g., GPT-4o) |
| Tools allowed | None directly — delegates to specialist agents |
| Output schema | `{"plan": [{"step": N, "action": "...", "agent": "..."}]}` |
| State machine | PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED/FAILED |
| Prohibited | Direct tool calls, detailed classification, data correction |

**System prompt (summary):**
> You are the Planner Agent for KHỚP, a merchant TaxOps system for SHB bank. Your job is to decompose operational requests into a multi-step plan and delegate each step to the appropriate specialist agent. You do not call tools directly. You produce a structured plan. Agents: reconciliation, tax_compliance, merchant_ops.

### Reconciliation Agent

| Aspect | Detail |
|---|---|
| Role | Match transactions to orders; create exceptions for ambiguous cases |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`, `score_match_candidates`, `create_reconciliation_exception` |
| Output schema | `{"merchant_id": "...", "matched": N, "unmatched": N, "duplicate_candidates": N, "missing_invoice_cases": N, "exceptions": [...]}` |

### Tax & Compliance Agent

| Aspect | Detail |
|---|---|
| Role | Validate data against tax rules; generate tax-readiness report |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export` |
| Prohibited | Tax formula computation, rule modification, filing submission |
| Output schema | `{"rule_version": "...", "checklist": [...], "ready": bool, "report": {...}}` |

### Merchant Operations Agent

| Aspect | Detail |
|---|---|
| Role | Turn analysis results into actions: cases, RM assignments, messages, exports |
| LLM model | `LLM_MODEL_SPECIALIST` |
| Tools allowed | `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system` |
| Output schema | `{"cases_created": N, "messages_drafted": N, "exports_created": N, "case_ids": [...]}` |

## Tool contracts

Each tool has a typed schema. Tools are called via MCP or typed function calling.

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
    """Score candidate orders for a bank transaction.
    
    Returns list of candidates with scores. Does not auto-match.
    Auto-match is handled by the deterministic matching engine.
    """
```

## Output format specification

All agent outputs are structured JSON conforming to Pydantic schemas. No free-text output as truth.

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

Agents read and write specific fields. The Planner coordinates which agent writes when.

## Error and hallucination handling

| Scenario | Handling |
|---|---|
| LLM returns invalid JSON | Retry with format instruction (max 2 retries); then fail run |
| LLM hallucinates a tool not in allowlist | Tool call rejected; logged in audit_events; run continues with next step |
| LLM suggests action outside its role | Suggestion ignored; logged |
| LLM confidence is None or invalid | Default to 0.0; force human review |
| LLM provider unavailable | Fall back to rule-based default; log error; flag for retry |

## Budget and rate limits

| Metric | Limit | Enforcement |
|---|---|---|
| LLM calls per agent run | 50 | Counter in agent_runs; run fails if exceeded |
| LLM tokens per call | 10,000 input, 2,000 output | Truncate input if exceeded |
| Concurrent agent runs | 5 | Queue via Redis |
| RAG queries per run | 20 | Counter in tool_calls |

## Privacy and data retention for AI interactions

- Sensitive data (account numbers, tax IDs, full names) masked before LLM call (SEC-MASK-001)
- LLM prompts and responses are NOT stored in full; only input_hash and output_hash in tool_calls
- RAG embeddings stored in pgvector; source documents in database
- No LLM provider training on KHỚP data (provider API configured)

## Evaluation criteria

See `EVALUATION.md` for detailed evaluation methodology. Key criteria:

| Criterion | How assessed | Threshold |
|---|---|---|
| Match accuracy | Compare auto-matches to truth set | ≥95% for exact, ≥80% overall |
| AI suggestion quality | Compare AI classification to human decision | ≥80% agreement |
| Vietnamese note interpretation | Test set of 50 notes with known meanings | ≥85% correct |
| Message quality | RM review of drafted messages | ≥90% acceptable without major edit |
| Hallucination rate | Count of invalid tool calls / total | <5% |

## Verification

### Automated

- `cd backend && python -m pytest tests/test_agents.py -v` — agent behavior tests
- `cd backend && python -m pytest tests/test_tools.py -v` — tool schema tests
- Verify no agent calls tools outside its allowlist

### Manual

- Run agent with test request → verify plan, tool calls, and output schema
- Verify masked data in LLM prompts (check logs)
- Verify hallucination handling (inject invalid tool name)

---

*Last updated: 2026-07-17*
