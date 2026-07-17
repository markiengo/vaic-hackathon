# Evaluation Specification — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** QA Lead
> **Applies to:** AI agent output quality evaluation
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Evaluation methodology

AI output is evaluated against human-verified truth sets. Evaluation is automated where possible and human-reviewed for quality dimensions.

| Dimension | Method | Automated | Cadence |
|---|---|---|---|
| Match accuracy | Compare auto-matches to truth set | Yes | Every test run |
| AI suggestion quality | Compare AI classification to human decision | Yes (truth set) | Every test run |
| Vietnamese note interpretation | Test set of 50 notes with known meanings | Yes | Every test run |
| Message quality | RM review of drafted messages | No (human) | Demo + pilot |
| Hallucination rate | Count invalid tool calls / total | Yes | Every test run |
| Latency | Time from request to first status | Yes | Every test run |

## Test cases

### Match accuracy

| Case ID | Input | Expected | Scoring |
|---|---|---|---|
| EVAL-MATCH-001 | TX with PAY-REF, exact amount | Auto-match to correct order | Pass/fail |
| EVAL-MATCH-002 | TX with PAY-REF, wrong amount | No match; go to candidate | Pass/fail |
| EVAL-MATCH-003 | TX without ref, unique amount, within 1 min | Auto-match (score ≥95) | Pass/fail |
| EVAL-MATCH-004 | TX without ref, same amount as 2 orders | Exception (AMBIGUOUS_MATCH) | Pass/fail |
| EVAL-MATCH-005 | TX 5M from owner name, no order | Exception (NO_MATCH), suggestion: internal_transfer, confidence 0.82 | Pass/fail ±0.05 |
| EVAL-MATCH-006 | Refund TX | Match to original sale with negative allocation | Pass/fail |
| EVAL-MATCH-007 | TX already allocated | Excluded from candidates | Pass/fail |

### Vietnamese note interpretation

| Case ID | Input note | Expected interpretation | Scoring |
|---|---|---|---|
| EVAL-NOTE-001 | `toc` | service: haircut | Correct type |
| EVAL-NOTE-002 | `nhuom` | service: hair dyeing | Correct type |
| EVAL-NOTE-003 | `ck cho em` | No specific service; likely internal | Correct type |
| EVAL-NOTE-004 | `nhap hang 20/10` | purchase_payment, date: 20/10 | Correct type + date |
| EVAL-NOTE-005 | (empty) | No interpretation; use other signals | No hallucination |
| EVAL-NOTE-006 | `PAY-A8F21X` | Payment reference; not a service | Correct type |
| EVAL-NOTE-007 | `tra no` | loan_payment | Correct type |
| EVAL-NOTE-008 | `dat coc` | deposit | Correct type |
| EVAL-NOTE-009 | `ban hang` | revenue | Correct type |
| EVAL-NOTE-010 | `chuyen noi bo` | internal_transfer | Correct type |

### AI suggestion quality

| Case ID | Scenario | Expected suggestion | Confidence range | Scoring |
|---|---|---|---|---|
| EVAL-SUGG-001 | 5M from owner, no order | internal_transfer | 0.75-0.90 | Type + range |
| EVAL-SUGG-002 | Goods purchase amount, supplier account | purchase_payment | 0.55-0.70 | Type + range |
| EVAL-SUGG-003 | Service amount, familiar customer | revenue | 0.85-0.95 | Type + range |
| EVAL-SUGG-004 | Ambiguous, conflicting evidence | Present both options | N/A | Both options present |

### Message quality (human review)

| Case ID | Scenario | Criteria |
|---|---|---|
| EVAL-MSG-001 | Draft message for 5M transaction | Vietnamese, polite, includes amount/date, clear question |
| EVAL-MSG-002 | Draft message for missing invoice | Vietnamese, explains what is needed, non-technical |
| EVAL-MSG-003 | Consolidated message for 3 exceptions | All 3 transactions referenced; not overwhelming |

### Hallucination rate

| Case ID | Scenario | Expected |
|---|---|---|
| EVAL-HALL-001 | Inject invalid tool name in agent context | Tool call rejected; logged |
| EVAL-HALL-002 | Agent tries to call tool from another agent's allowlist | Tool call rejected; logged |
| EVAL-HALL-003 | LLM returns invalid JSON | Retry; then fail gracefully |

## Scoring rubric

### Automated scoring

| Metric | Formula | Pass threshold |
|---|---|---|
| Match accuracy (exact) | correct_exact / total_exact | ≥95% |
| Match accuracy (overall) | correct_all / total_all | ≥80% |
| Note interpretation accuracy | correct_notes / total_notes | ≥85% |
| Suggestion type accuracy | correct_type / total_suggestions | ≥80% |
| Suggestion confidence calibration | abs(predicted - actual) < 0.10 | ≥75% within range |
| Hallucination rate | invalid_calls / total_calls | <5% |

### Human review scoring

| Metric | Scale | Pass threshold |
|---|---|---|
| Message quality | 1-5 (1=unusable, 5=perfect) | ≥4 average |
| Agent trace clarity | 1-5 | ≥4 average |
| UI usability | 1-5 | ≥4 average |

## Pass/fail thresholds

| Metric | Pass | Fail |
|---|---|---|
| Match accuracy (exact) | ≥95% | <95% |
| Match accuracy (overall) | ≥80% | <80% |
| Note interpretation | ≥85% | <85% |
| Suggestion type accuracy | ≥80% | <80% |
| Hallucination rate | <5% | ≥5% |
| Latency (initial) | <5s | ≥5s |
| Latency (full case) | <30s | ≥30s |

## Evaluation cadence

| When | What | Who |
|---|---|---|
| Every PR | Automated test suite | CI |
| End of Sprint 2 | Agent layer evaluation | QA |
| End of Sprint 5 | Full evaluation (all dimensions) | QA + PM |
| Demo day | Live demo evaluation | Judges |
| Pilot weekly | Match accuracy + false match rate | QA |

## Results storage and tracking

- Automated results: stored in test output reports
- Human review results: stored in `docs/evaluation/` directory
- Historical results: tracked in a simple CSV with date, metric, value, pass/fail

## Verification

### Automated

- `cd backend && python -m pytest tests/test_evaluation.py -v` — evaluation test suite
- `cd backend && python -m pytest tests/test_reconciliation.py::test_truth_set -v` — truth set validation

### Manual

- Review message quality with RM (if available)
- Review agent trace clarity with operations staff
- Verify hallucination handling with injected invalid tool calls

---

*Last updated: 2026-07-17*
