# Compliance Specification — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Compliance Lead
> **Applies to:** Tax Rules Engine, tax-readiness reporting, audit logging
> **Implementation state:** Implemented — `backend/app/services/tax_rules.py` and `backend/app/routers/tax.py`
> **Last verified against code:** 2026-07-17
> **Verification:** Xem § Verification bên dưới

---

## Tổng quan compliance

TaxLens không file thuế. Nó prepare và validate merchant data để existing tax processes (MISA, accountant, hoặc direct filing) có thể tiến hành với data clean, reconciled. Compliance layer đảm bảo:

1. Tax rules được versioned, approved, và immutable
2. Reports reference chính xác rule version đang hiệu lực
3. Mọi decision auditable
4. LLM không bao giờ compute tax formulas

## Tax Rules Engine

### Architecture

Tax Rules Engine là deterministic service tách biệt từ LLM (DEC-004). Nó:

- Store rules trong `tax_rule_versions` table
- Validate data theo required fields và formulas
- Generate tax-readiness reports với rule version metadata
- KHÔNG dùng AI cho bất kỳ calculation nào

### Rule version lifecycle

```text
DRAFT → PENDING → APPROVED → (SUPERSEDED khi new version approved)
```

- **DRAFT:** Rule content đang prepare
- **PENDING:** Submitted cho approval
- **APPROVED:** Approved bởi compliance officer; immutable
- **SUPERSEDED:** Thay thế bởi newer approved version; retained cho historical reports

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

### Required fields cho tax-readiness

| Field | Source | Validation |
|---|---|---|
| merchant_name | merchants.name | Không empty |
| tax_id | merchants.tax_id | Format hợp lệ |
| revenue_total | Sum paid sales | > 0 cho active period |
| invoice_count | Count invoices | ≥90% paid sales (configurable) |
| cash_revenue | Sum cash payments | Khớp cash session totals |
| bank_revenue | Sum bank transactions classified as revenue | Khớp reconciliation |

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

Mỗi report bao gồm:

- Rule version (e.g., `2026.07`)
- Effective date
- Legal source
- Approved by
- Generation timestamp
- Checklist với pass/fail per item
- Overall ready/not-ready status

### Reproducibility

Cùng data + cùng rule version = cùng report output. LLM không tham gia report generation.

### Draft export

- Export format: JSON và CSV
- Bao gồm: merchant info, period, reconciled transactions, sales, allocations, tax classifications, rule version
- Loại trừ: unresolved exceptions
- Chỉ available khi tax-readiness = "pass"
- Export được label rõ ràng là "DRAFT — Không phải tờ khai thuế"

## Audit requirements

### Cái gì phải audited

| Event type | Actor | Fields logged |
|---|---|---|
| Tool call | Agent | agent_name, tool_name, input_hash, output_hash, confidence, rule_version |
| Human approval | User | user_id, decision, reason, timestamp |
| Rule version approval | Compliance officer | user_id, version, timestamp |
| Export generation | User hoặc agent | user_id, merchant_id, period, format, timestamp |
| Exception resolution | User | user_id, exception_id, decision, timestamp |

### Audit log properties

- **Append-only:** Không UPDATE hoặc DELETE operations trên audit_events
- **Retention:** 7 năm (banking requirement)
- **Export:** JSON và CSV; yêu cầu compliance hoặc admin role
- **Integrity:** Input/output hashes cung cấp tamper evidence

## Giới hạn LLM (góc nhìn compliance)

| LLM được phép | LLM KHÔNG được phép |
|---|---|
| Retrieve và explain tax rules | Compute tax formulas |
| Suggest revenue classification | Make final classification decisions |
| Draft merchant messages | Send messages mà không có RM approval |
| Explain reconciliation reasoning | Perform exact matching |
| Identify missing data | Auto-resolve exceptions below threshold |

## Ngữ cảnh pháp lý Việt Nam

| Quy định | Relevance |
|---|---|
| Thông tư 40/2021/TT-BTC | Yêu cầu e-invoice cho hộ kinh doanh |
| Nghị định 123/2020/NĐ-CP | E-invoice implementation |
| Luật Quản lý thuế | Nghĩa vụ kê khai thuế |
| Thông tư về thuế hộ kinh doanh | Revenue thresholds và phương pháp tính thuế |

TaxLens không interpret các quy định này. Nó dùng rule versions approved bởi compliance officers người interpret regulations. System enforce rằng approved rules được apply consistent.

## Data residency

- MVP: Data stored trong Docker container trên demo machine
- Pilot: Data phải stored trong SHB VPC hoặc Vietnam-based cloud (data residency requirement)
- Không data rời Việt Nam jurisdiction trong pilot phase

## Verification

### Automated

- `cd backend && python -m pytest tests/test_tax_rules.py -v` — rule validation tests
- `cd backend && python -m pytest tests/test_audit.py -v` — audit log tests
- Kiểm tra rule version immutability: attempt update approved rule → phải fail

### Manual

- Generate tax-readiness report → kiểm tra rule version, legal source, và checklist
- Export audit log → kiểm tra JSON và CSV format
- Attempt modify approved rule version → kiểm tra rejection
- Kiểm tra LLM không bao giờ call tax calculation tools (check tool allowlist)

### Evidence

- Tax-readiness report screenshot với rule version visible
- Audit log export file
- Rule version approval log

---

*Last updated: 2026-07-17*
