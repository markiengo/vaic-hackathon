# Algorithm Specification — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Reconciliation matching engine
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Algorithm overview and purpose

The matching algorithm reconciles bank transactions with sales orders. It has two modes:

1. **Exact matching** — deterministic, using payment reference
2. **Candidate matching** — probabilistic, using weighted scoring factors

The algorithm is the core difficulty of the product: matching Vietnamese bank transfers (with unreliable notes) to specific orders.

## Inputs and outputs

### Exact matching

**Input:**
- `bank_transaction`: id, amount, raw_note, sender_name, transaction_date
- `payment_intents`: list of active intents with reference and amount

**Output:**
- `match_result`: { matched: bool, payment_intent_id, sale_id, confidence: 1.0 }

### Candidate matching

**Input:**
- `bank_transaction`: id, amount, raw_note, sender_name, transaction_date
- `sales`: list of unpaid sales for same merchant/store

**Output:**
- `candidates`: list of { sale_id, score, factors }

## Step-by-step algorithm description

### Exact matching

```text
1. Extract payment reference from raw_note
   - Pattern: PAY-[A-Z0-9]{6}
   - If no pattern found → go to candidate matching

2. Look up payment_intent by reference
   - If not found → no exact match, go to candidate matching
   - If found but expired → no exact match, go to candidate matching

3. Verify amount match
   - If bank_transaction.amount == payment_intent.amount → continue
   - If mismatch → no exact match, go to candidate matching

4. Verify sale is unpaid
   - If sale.payment_status == UNPAID → continue
   - If sale.payment_status == PARTIAL → continue (for remaining amount)
   - If sale.payment_status == PAID → no match (already paid)

5. Verify transaction not already allocated
   - Query payment_allocations for bank_transaction_id
   - If already allocated → no match

6. Create match
   - Create payment_allocation(bank_transaction_id, payment_intent_id, sale_id, amount, match_method=EXACT, confidence=1.0)
   - Update sale.payment_status = PAID
   - Create audit_event
```

### Candidate matching

```text
1. Get candidate sales
   - Filter: same merchant_id, same store_id (if determinable)
   - Filter: payment_status IN (UNPAID, PARTIAL)
   - Filter: not already fully allocated

2. For each candidate, compute score:
   score = 0
   
   a. Amount match
      if candidate.net_amount == transaction.amount:
         score += 50
   
   b. Time proximity
      time_diff = abs(transaction.transaction_date - candidate.created_at)
      if time_diff < 1 minute:
         score += 20
      elif time_diff < 5 minutes:
         score += 10
      elif time_diff < 30 minutes:
         score += 5
   
   c. Reference or table number match
      if transaction.raw_note contains candidate.table_number or reference:
         score += 20
   
   d. Sender name familiarity
      if transaction.sender_name in merchant.customer_history:
         score += 10
   
   e. Note content signal
      if AI interpretation of note relates to candidate product/service:
         score += 5
   
   f. Multiple same-amount penalty
      count_same_amount = count of unpaid sales with same amount
      if count_same_amount > 1:
         score -= 30
   
   g. Already-used transaction
      if transaction already allocated:
         exclude from candidates (not just penalty)

3. Normalize score to 0-100
   normalized_score = max(0, min(100, score))

4. Apply thresholds
   if normalized_score >= 95:
      action = AUTO_MATCH
   elif normalized_score >= 75:
      action = HUMAN_CONFIRM
   else:
      action = UNMATCHED

5. If AUTO_MATCH:
      Create payment_allocation(match_method=FUZZY, confidence=normalized_score/100)
      Update sale.payment_status = PAID
   
   If HUMAN_CONFIRM:
      Create exception(type=AMBIGUOUS_MATCH, ai_suggestion={...})
   
   If UNMATCHED:
      Create exception(type=NO_MATCH, ai_suggestion={...})

6. Special case: two identical orders, no identifier
   if count_same_amount > 1 AND no differentiating signal:
      MANDATORY EXCEPTION (no guess)
      Even if one candidate scores ≥95, force HUMAN_CONFIRM
```

## Determinism guarantees

- **Exact matching is fully deterministic:** Same inputs always produce same output
- **Candidate scoring is deterministic:** Same inputs and same AI interpretation produce same score
- **AI note interpretation is non-deterministic:** LLM output may vary; mitigated by:
  - Using temperature=0 for classification calls
  - Caching AI interpretations by note hash
  - Treating AI interpretation as one signal among many, not the sole signal

## Edge cases and fallback behavior

| Edge case | Behavior |
|---|---|
| No reference in note | Skip exact matching; go to candidate matching |
| Reference found but expired | Go to candidate matching |
| No candidates found | Create exception (NO_MATCH) |
| All candidates score <75 | Create exception (NO_MATCH) |
| Two candidates score ≥95 | Create exception (AMBIGUOUS_MATCH); do not auto-match |
| Transaction amount is 0 | Skip; log as invalid |
| Sale amount is 0 | Skip; log as invalid |
| Multiple transactions for same sale | Process in order; first match wins; rest go to candidate matching |
| Refund transaction (negative amount) | Match to original sale; create negative allocation |

## Performance characteristics

| Operation | Complexity | Expected time (100 transactions) |
|---|---|---|
| Exact matching | O(n) per transaction | <100ms total |
| Candidate generation | O(n × m) where m = unpaid sales | <500ms per transaction |
| AI note interpretation | O(1) per unique note (cached) | <2s per unique note |
| Full reconciliation run | O(n × (1 + m + ai)) | <30s for 100 transactions |

## Test fixtures and truth sets

See `testing-spec.md` § Test data and fixtures strategy for the complete truth set.

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

- Run reconciliation on seed data → verify results match truth set
- Inject ambiguous transaction → verify exception created, not auto-resolved

---

*Last updated: 2026-07-17*
