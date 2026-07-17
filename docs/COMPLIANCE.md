# Compliance Specification — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Compliance Lead
> **Applies to:** Tax Rules Engine, tax-readiness reporting, audit logging
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Compliance overview

KHỚP does not file taxes. It prepares and validates merchant data so that existing tax processes (MISA, accountant, or direct filing) can proceed with clean, reconciled data. The compliance layer ensures:

1. Tax rules are versioned, approved, and immutable
2. Reports reference the exact rule version in effect
3. Every decision is auditable
4. The LLM never computes tax formulas

## Tax Rules Engine

### Architecture

The Tax Rules Engine is a deterministic service separate from the LLM (DEC-004). It:

- Stores rules in `tax_rule_versions` table
- Validates data against required fields and formulas
- Generates tax-readiness reports with rule version metadata
- Does NOT use AI for any calculation

### Rule version lifecycle

```text
DRAFT → PENDING → APPROVED → (SUPERSEDED when new version approved)
```

- **DRAFT:** Rule content being prepared
- **PENDING:** Submitted for approval
- **APPROVED:** Approved by compliance officer; immutable
- **SUPERSEDED:** Replaced by a newer approved version; retained for historical reports

### Rule version schema

```json
{
  "version": "2026.07",
  "merchant_type": "hộ_kinh_doanh",
  "business_category": "beauty_services",
  "effective_from": "2026-07-01",
  "effective_to": null,
  "required_fields": [
    "merchant_name",
    "tax_id",
    "revenue_total",
    "invoice_count",
    "cash_revenue",
    "bank_revenue"
  ],
  "formula_or_validation": {
    "revenue_total_formula": "sum(sale.net_amount where payment_status=PAID)",
    "invoice_coverage": "count(invoices) / count(sales where payment_status=PAID) >= 0.9",
    "cash_session_required": "all cash_sessions.status = RECONCILED"
  },
  "legal_source": "Thông tư 40/2021/TT-BTC",
  "approval_status": "APPROVED",
  "approved_by": "compliance_lead",
  "approved_at": "2026-07-01T00:00:00Z"
}
```

### Required fields for tax-readiness

| Field | Source | Validation |
|---|---|---|
| merchant_name | merchants.name | Not empty |
| tax_id | merchants.tax_id | Valid format |
| revenue_total | Sum of paid sales | > 0 for active period |
| invoice_count | Count of invoices | ≥90% of paid sales (configurable) |
| cash_revenue | Sum of cash payments | Matches cash session totals |
| bank_revenue | Sum of bank transactions classified as revenue | Matches reconciliation |

### Tax-readiness checklist

| Item | Threshold | Source |
|---|---|---|
| Bank reconciliation rate | ≥95% | Reconciliation engine |
| Cash session closure | 100% | Cash sessions |
| Unclassified transactions | 0 | Tax classifications |
| Missing invoices | 0 | Invoice comparison |
| Rule version valid | Current | tax_rule_versions |

## Report generation

### Tax-readiness report

Every report includes:

- Rule version (e.g., `2026.07`)
- Effective date
- Legal source
- Approved by
- Generation timestamp
- Checklist with pass/fail per item
- Overall ready/not-ready status

### Reproducibility

Same data + same rule version = same report output. The LLM does not participate in report generation.

### Draft export

- Export format: JSON and CSV
- Includes: merchant info, period, reconciled transactions, sales, allocations, tax classifications, rule version
- Excludes: unresolved exceptions
- Only available when tax-readiness = "pass"
- Export is explicitly labeled as "DRAFT — Not a tax filing"

## Audit requirements

### What must be audited

| Event type | Actor | Fields logged |
|---|---|---|
| Tool call | Agent | agent_name, tool_name, input_hash, output_hash, confidence, rule_version |
| Human approval | User | user_id, decision, reason, timestamp |
| Rule version approval | Compliance officer | user_id, version, timestamp |
| Export generation | User or agent | user_id, merchant_id, period, format, timestamp |
| Exception resolution | User | user_id, exception_id, decision, timestamp |

### Audit log properties

- **Append-only:** No UPDATE or DELETE operations on audit_events
- **Retention:** 7 years (banking requirement)
- **Export:** JSON and CSV; requires compliance or admin role
- **Integrity:** Input/output hashes provide tamper evidence

## LLM boundaries (compliance perspective)

| LLM may | LLM may NOT |
|---|---|
| Retrieve and explain tax rules | Compute tax formulas |
| Suggest revenue classification | Make final classification decisions |
| Draft merchant messages | Send messages without RM approval |
| Explain reconciliation reasoning | Perform exact matching |
| Identify missing data | Auto-resolve exceptions below threshold |

## Vietnamese regulatory context

| Regulation | Relevance |
|---|---|
| Thông tư 40/2021/TT-BTC | E-invoice requirements for household businesses |
| Nghị định 123/2020/NĐ-CP | E-invoice implementation |
| Law on Tax Administration | Tax filing obligations |
| Circular on household business tax | Revenue thresholds and tax calculation methods |

KHỚP does not interpret these regulations. It uses rule versions approved by compliance officers who interpret regulations. The system enforces that approved rules are applied consistently.

## Data residency

- MVP: Data stored in Docker container on demo machine
- Pilot: Data must be stored in SHB VPC or Vietnam-based cloud (data residency requirement)
- No data leaves Vietnam jurisdiction in pilot phase

## Verification

### Automated

- `cd backend && python -m pytest tests/test_tax_rules.py -v` — rule validation tests
- `cd backend && python -m pytest tests/test_audit.py -v` — audit log tests
- Verify rule version immutability: attempt to update approved rule → should fail

### Manual

- Generate tax-readiness report → verify rule version, legal source, and checklist
- Export audit log → verify JSON and CSV format
- Attempt to modify approved rule version → verify rejection
- Verify LLM never calls tax calculation tools (check tool allowlist)

### Evidence

- Tax-readiness report screenshot with rule version visible
- Audit log export file
- Rule version approval log

---

*Last updated: 2026-07-17*
