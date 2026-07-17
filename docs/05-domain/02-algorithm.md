# Algorithm Specification — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Reconciliation matching engine
> **Implementation state:** Implemented — `backend/app/services/matching.py` with 12 tests
> **Last verified against code:** 2026-07-17
> **Verification:** Xem § Verification bên dưới

---

## Tổng quan và mục đích algorithm

Matching algorithm đối soát bank transactions với sales orders. Có hai mode:

1. **Exact matching** — deterministic, dùng payment reference
2. **Candidate matching** — probabilistic, dùng weighted scoring factors

Algorithm là core difficulty của product: match bank transfer Việt Nam (với note không đáng tin) với order cụ thể.

## Inputs và outputs

### Exact matching

**Input:**
- `bank_transaction`: id, amount, raw_note, sender_name, transaction_date
- `payment_intents`: list active intents với reference và amount

**Output:**
- `match_result`: { matched: bool, payment_intent_id, sale_id, confidence: 1.0 }

### Candidate matching

**Input:**
- `bank_transaction`: id, amount, raw_note, sender_name, transaction_date
- `sales`: list unpaid sales cho cùng merchant/store

**Output:**
- `candidates`: list of { sale_id, score, factors }

## Mô tả algorithm từng bước

### Exact matching

```text
1. Extract payment reference từ raw_note
   - Pattern: PAY-[A-Z0-9]{6}
   - Nếu không tìm thấy pattern → chuyển sang candidate matching

2. Look up payment_intent bằng reference
   - Nếu không tìm thấy → no exact match, chuyển sang candidate matching
   - Nếu tìm thấy nhưng expired → no exact match, chuyển sang candidate matching

3. Verify amount match
   - Nếu bank_transaction.amount == payment_intent.amount → continue
   - Nếu mismatch → no exact match, chuyển sang candidate matching

4. Verify sale chưa paid
   - Nếu sale.payment_status == UNPAID → continue
   - Nếu sale.payment_status == PARTIAL → continue (cho remaining amount)
   - Nếu sale.payment_status == PAID → no match (đã paid)

5. Verify transaction chưa được allocate
   - Query payment_allocations cho bank_transaction_id
   - Nếu đã allocated → no match

6. Create match
   - Create payment_allocation(bank_transaction_id, payment_intent_id, sale_id, amount, match_method=EXACT, confidence=1.0)
   - Update sale.payment_status = PAID
   - Create audit_event
```

### Candidate matching

```text
1. Get candidate sales
   - Filter: cùng merchant_id, cùng store_id (nếu determinable)
   - Filter: payment_status IN (UNPAID, PARTIAL)
   - Filter: chưa fully allocated
   - Filter: time window mặc định 60 phút
   - Compare transaction amount với outstanding amount của sale
   - Amount tolerance = min(10.000đ, max(1.000đ, 0,5% × sale.net_amount))

2. Cho mỗi candidate, compute score:
   score = 0
   
   a. Amount match
      if candidate.outstanding_amount == transaction.amount:
         score += 50
      elif amount difference nằm trong tolerance:
         score += 35
         candidate không được AUTO_MATCH
   
   b. Time proximity
      time_diff = abs(transaction.transaction_date - candidate.created_at)
      if time_diff < 1 minute:
         score += 20
      elif time_diff < 5 minutes:
         score += 10
      elif time_diff < 30 minutes:
         score += 5
   
   c. Candidate-owned identifier match
      if raw_note chứa exact token của table number, sale identifier, hoặc legacy reference:
         score += 20
   
   d. Sender name familiarity
      if transaction.sender_name in merchant.customer_history:
         score += 10
   
   e. Note content signal
      if AI interpretation của note relates đến candidate product/service:
         score += 5
      Note signal chỉ dùng cho ranking/reasoning và HUMAN_CONFIRM;
      không được cộng vào deterministic score để mở khóa AUTO_MATCH.
   
   f. Multiple same-amount penalty
      count_same_amount = count unpaid sales cùng amount
      if count_same_amount > 1 AND candidate không có unique differentiating identifier:
         score -= 30
   
   g. Already-used transaction
      if transaction đã allocated:
         exclude khỏi candidates (không chỉ penalty)

3. Normalize scores về 0-100
   deterministic_score = max(0, min(100, deterministic factors))
   display_score = max(0, min(100, deterministic_score + note_signal))
   display_score là heuristic match score, không phải xác suất thống kê.

4. Apply thresholds và safety gates
   if exact amount
      AND deterministic_score >= 95
      AND không có ambiguity
      AND mọi competing candidate có display_score < 75:
      action = AUTO_MATCH
   elif display_score >= 75:
      action = HUMAN_CONFIRM
   elif unique exact-amount candidate AND time_diff < 1 minute:
      action = HUMAN_CONFIRM  # amount + time không đủ để auto-match
   else:
      action = UNMATCHED

   Tie, nhiều candidate >=75, unresolved duplicate amount, hoặc amount mismatch
   luôn chặn AUTO_MATCH. Amount mismatch chỉ HUMAN_CONFIRM khi đủ evidence;
   nếu display_score <75 thì vẫn UNMATCHED.

5. If AUTO_MATCH:
      Create payment_allocation(match_method=FUZZY, confidence=display_score/100,
                                confidence_method="heuristic_v1")
      Update sale.payment_status = PAID
   
   If HUMAN_CONFIRM:
      Create exception(type=AMBIGUOUS_MATCH, ai_suggestion={...})
   
   If UNMATCHED:
      Create exception(type=NO_MATCH, ai_suggestion={...})

6. Special case: hai order giống nhau, không identifier
   if count_same_amount > 1 AND no differentiating signal:
      MANDATORY EXCEPTION (no guess)
      Even if one candidate scores ≥95, force HUMAN_CONFIRM

   Nếu đúng một candidate có strict differentiating identifier, không áp dụng
   duplicate penalty cho candidate đó; các candidate còn lại vẫn bị trừ 30.
```

## Đảm bảo determinism

- **Exact matching fully deterministic:** Cùng inputs luôn produce cùng output
- **Candidate scoring deterministic:** Cùng inputs và cùng AI interpretation produce cùng score
- **AI note interpretation non-deterministic:** LLM output có thể vary; mitigated bằng:
  - Dùng temperature=0 cho classification calls
  - Cache AI interpretations bằng note hash
  - Treat AI interpretation là một signal trong nhiều, không phải sole signal

## Edge cases và fallback behavior

| Edge case | Behavior |
|---|---|
| Không có reference trong note | Skip exact matching; chuyển sang candidate matching |
| Reference tìm thấy nhưng expired | Chuyển sang candidate matching |
| Không tìm thấy candidates | Create exception (NO_MATCH) |
| Tất cả candidates score <75 | Create exception (NO_MATCH) |
| Hai candidates score ≥95 | Create exception (AMBIGUOUS_MATCH); không auto-match |
| Transaction amount = 0 | Skip; log as invalid |
| Sale amount = 0 | Skip; log as invalid |
| Multiple transactions cho cùng sale | Process theo thứ tự; first match wins; rest chuyển sang candidate matching |
| Refund transaction (negative amount) | Match với original sale; create negative allocation |

## Performance characteristics

| Operation               | Complexity                    | Expected time (100 transactions) |
| -------------------------| -------------------------------| ----------------------------------|
| Exact matching          | O(n) per transaction          | <100ms total                     |
| Candidate generation    | O(n × m) với m = unpaid sales | <500ms per transaction           |
| AI note interpretation  | O(1) per unique note (cached) | <2s per unique note              |
| Full reconciliation run | O(n × (1 + m + ai))           | <30s cho 100 transactions        |

## Test fixtures và truth sets

Xem `04-delivery/02-testing-spec.md` § Test data và fixtures strategy cho complete truth set.

### Key truth fixtures

```json
[
  {
    "transaction_id": "SHB-902194810",
    "raw_note": "PAY-A8F21X",
    "amount": 350000,
    "expected_match": "ORDER-1842",
    "expected_method": "EXACT",
    "expected_confidence": 1.0
  },
  {
    "transaction_id": "SHB-902194815",
    "raw_note": "ck cho em",
    "amount": 5000000,
    "expected_match": null,
    "expected_method": "NONE",
    "expected_exception": "NO_MATCH",
    "expected_suggestion": "internal_transfer",
    "expected_confidence": 0.82
  },
  {
    "transaction_id": "SHB-902194820",
    "raw_note": "",
    "amount": 85000,
    "expected_match": null,
    "expected_method": "NONE",
    "expected_exception": "AMBIGUOUS_MATCH",
    "expected_confidence": 0.0,
    "note": "Two orders with same amount; no identifier"
  }
]
```

## Verification

### Automated

- `cd backend && python -m pytest tests/test_reconciliation.py -v` — matching algorithm tests
- `cd backend && python -m pytest tests/test_reconciliation.py::test_truth_set -v` — truth set validation

### Manual

- Chạy reconciliation trên seed data → kiểm tra kết quả khớp truth set
- Inject ambiguous transaction → kiểm tra exception tạo, không auto-resolved

---

*Last updated: 2026-07-17*
