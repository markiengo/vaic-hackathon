# Evaluation Specification — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** QA Lead
> **Applies to:** Đánh giá chất lượng AI agent output
> **Implementation state:** Partial — matching tests and the 23-transaction Sprint 3 truth set are implemented; agent evaluation is not yet implemented
> **Last verified against code:** 2026-07-18
> **Verification:** Xem § Verification bên dưới

---

## Phương pháp đánh giá

AI output được đánh giá so với human-verified truth sets. Đánh giá automated khi có thể và human-reviewed cho quality dimensions.

| Dimension | Phương pháp | Automated | Tần suất |
|---|---|---|---|
| Match accuracy | Compare auto-matches với truth set | Yes | Mỗi test run |
| AI suggestion quality | Compare AI classification với human decision | Yes (truth set) | Mỗi test run |
| Vietnamese note interpretation | Test set 50 notes với known meanings | Yes | Mỗi test run |
| Message quality | RM review drafted messages | No (human) | Demo + pilot |
| Hallucination rate | Count invalid tool calls / total | Yes | Mỗi test run |
| Latency | Time từ request đến first status | Yes | Mỗi test run |

## Test cases

### Match accuracy

| Case ID | Input | Expected | Scoring |
|---|---|---|---|
| EVAL-MATCH-001 | TX có PAY-REF, exact amount | Auto-match đúng order | Pass/fail |
| EVAL-MATCH-002 | TX có PAY-REF, sai amount | No match; chuyển sang candidate | Pass/fail |
| EVAL-MATCH-003 | TX không ref, amount duy nhất, trong 1 min | Human confirmation (score 70; amount + time không đủ để auto-match) | Pass/fail |
| EVAL-MATCH-004 | TX không ref, cùng amount với 2 orders | Exception (AMBIGUOUS_MATCH) | Pass/fail |
| EVAL-MATCH-005 | TX 5M từ owner name, không order | Exception (NO_MATCH), suggestion: internal_transfer, confidence 0.82 | Pass/fail ±0.05 |
| EVAL-MATCH-006 | Refund TX | Match với original sale với negative allocation | Pass/fail |
| EVAL-MATCH-007 | TX đã allocated | Excluded khỏi candidates | Pass/fail |

### Sprint 3 seed truth set

Truth set dưới đây bám trực tiếp `backend/scripts/seed_data.py`. Sender history
cho ba fuzzy matches phải đến từ nguồn lịch sử độc lập; không được lấy chính
sender của transaction đang chấm để tự tăng confidence.

| Transaction | Expected sale | Expected outcome | Method / type |
|---|---|---|---|
| `SEPAY-902194810` | `ORDER-1842` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194901` | `ORDER-1843` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194902` | `ORDER-1844` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194903` | `ORDER-1845` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194904` | `ORDER-1846` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194905` | `ORDER-1847` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194906` | `ORDER-1848` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194907` | `ORDER-1849` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194908` | `ORDER-1850` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194909` | `ORDER-1851` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194910` | `ORDER-1852` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194911` | `ORDER-1853` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194912` | `ORDER-1854` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194913` | `ORDER-1855` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194914` | `ORDER-1856` | `AUTO_MATCH` | `EXACT / PAYMENT` |
| `SEPAY-902194950` | `ORDER-1850` | `AUTO_MATCH` | `EXACT / REFUND` |
| `SEPAY-902194960` | `ORDER-1857` | `AUTO_MATCH` | `FUZZY / PAYMENT` |
| `SEPAY-902194961` | `ORDER-1858` | `AUTO_MATCH` | `FUZZY / PAYMENT` |
| `SEPAY-902194962` | `ORDER-1859` | `AUTO_MATCH` | `FUZZY / PAYMENT` |
| `SEPAY-902194820` | — | `HUMAN_CONFIRM` | `AMBIGUOUS_MATCH` |
| `SEPAY-902194821` | — | `HUMAN_CONFIRM` | `AMBIGUOUS_MATCH` |
| `SEPAY-902194815` | — | `UNMATCHED` | `NO_MATCH` |
| `SEPAY-902194970` | — | `UNMATCHED` | `NO_MATCH` |

Expected metrics:

- Bank auto-reconciliation: `19/23 = 82.61%`.
- False matches: `0`.
- Final sale states: `25 PAID`, `1 REFUNDED`, `4 UNPAID` trên 30 sales.
- Matching latency: dưới 5 giây cho toàn bộ 23 bank transactions.
- Chạy lại phải idempotent: 19 bank allocations và 4 bank exceptions, không
  tạo duplicate.

Cash discrepancy được test riêng bằng allocation ledger. Raw P5 seed hiện đánh
dấu cash sales là `PAID` nhưng chưa tạo cash `payment_allocations`, đồng thời
cash session có discrepancy nhưng thiếu `discrepancy_reason`; P1 không suy diễn
cash collection từ status vì có nguy cơ double-count. P5 cần hoàn tất contract
này trước full seed pipeline validation.

### Vietnamese note interpretation

| Case ID | Input note | Interpretation mong đợi | Scoring |
|---|---|---|---|
| EVAL-NOTE-001 | `toc` | service: cắt tóc | Correct type |
| EVAL-NOTE-002 | `nhuom` | service: nhuộm tóc | Correct type |
| EVAL-NOTE-003 | `ck cho em` | Không service cụ thể; likely internal | Correct type |
| EVAL-NOTE-004 | `nhap hang 20/10` | purchase_payment, date: 20/10 | Correct type + date |
| EVAL-NOTE-005 | (empty) | Không interpretation; dùng other signals | No hallucination |
| EVAL-NOTE-006 | `PAY-A8F21X` | Payment reference; không phải service | Correct type |
| EVAL-NOTE-007 | `tra no` | loan_payment | Correct type |
| EVAL-NOTE-008 | `dat coc` | deposit | Correct type |
| EVAL-NOTE-009 | `ban hang` | revenue | Correct type |
| EVAL-NOTE-010 | `chuyen noi bo` | internal_transfer | Correct type |

### AI suggestion quality

| Case ID | Tình huống | Suggestion mong đợi | Confidence range | Scoring |
|---|---|---|---|---|
| EVAL-SUGG-001 | 5M từ owner, không order | internal_transfer | 0.75-0.90 | Type + range |
| EVAL-SUGG-002 | Amount mua hàng, supplier account | purchase_payment | 0.55-0.70 | Type + range |
| EVAL-SUGG-003 | Amount service, familiar customer | revenue | 0.85-0.95 | Type + range |
| EVAL-SUGG-004 | Ambiguous, conflicting evidence | Present cả hai options | N/A | Both options present |

### Message quality (human review)

| Case ID | Tình huống | Criteria |
|---|---|---|
| EVAL-MSG-001 | Draft message cho 5M transaction | Tiếng Việt, lịch sự, gồm amount/date, câu hỏi rõ ràng |
| EVAL-MSG-002 | Draft message cho missing invoice | Tiếng Việt, giải thích cần gì, non-technical |
| EVAL-MSG-003 | Consolidated message cho 3 exceptions | Cả 3 transactions referenced; không quá dài |

### Hallucination rate

| Case ID | Tình huống | Expected |
|---|---|---|
| EVAL-HALL-001 | Inject invalid tool name trong agent context | Tool call rejected; logged |
| EVAL-HALL-002 | Agent cố call tool từ allowlist agent khác | Tool call rejected; logged |
| EVAL-HALL-003 | LLM trả invalid JSON | Retry; sau đó fail gracefully |

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

## Tần suất đánh giá

| Khi nào | Cái gì | Ai |
|---|---|---|
| Mỗi PR | Automated test suite | CI |
| Cuối Sprint 2 | Agent layer evaluation | QA |
| Cuối Sprint 5 | Full evaluation (tất cả dimensions) | QA + PM |
| Demo day | Live demo evaluation | Judges |
| Pilot hàng tuần | Match accuracy + false match rate | QA |

## Lưu trữ và tracking kết quả

- Automated results: stored trong test output reports
- Human review results: stored trong `docs/evaluation/` directory
- Historical results: tracked trong simple CSV với date, metric, value, pass/fail

## Verification

### Automated

- `cd backend && python -m pytest tests/test_evaluation.py -v` — evaluation test suite
- `cd backend && python -m pytest tests/test_reconciliation.py::test_truth_set -v` — truth set validation

### Manual

- Review message quality với RM (nếu có)
- Review agent trace clarity với operations staff
- Kiểm tra hallucination handling với injected invalid tool calls

---

*Last updated: 2026-07-18*
