# Stakeholders and Personas — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** PM
> **Applies to:** All KHỚP user-facing modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Stakeholder table

| Name | Role | Interest | Influence |
|---|---|---|---|
| SHB Operations Team | Merchant operations staff | Use KHỚP daily for reconciliation | High |
| SHB Relationship Managers | Client-facing RM | Support merchants using KHỚP data | Medium |
| SHB Compliance Team | Tax/compliance officers | Ensure rule correctness and audit trail | High |
| Hộ kinh doanh (merchants) | Business owners | Provide data, answer exception questions | Medium |
| SHB IT Department | Infrastructure | Deploy and maintain KHỚP | High |
| VAIC Hackathon Judges | Evaluators | Assess product fit, AI depth, demo quality | High (hackathon) |
| MISA / Accounting partners | Integration targets | Receive clean data exports | Low (post-MVP) |

## Persona profiles

### Persona 1 — Linh, SHB Merchant Operations Staff (Primary)

**Role:** Nhân viên vận hành merchant của SHB
**Label:** Assumption-based (derived from product.md §4)

**Goals:**
- Verify a merchant's revenue data is complete, consistent, and tax-ready
- Reduce time spent on manual transaction checking
- Know exactly what is missing and what needs follow-up

**Needs:**
- Dashboard showing reconciliation status, exceptions, and tax-readiness
- Exception Inbox with AI suggestions and confidence scores
- Ability to approve or reject AI suggestions
- Agent trace showing how decisions were made

**Pain points:**
- Currently downloads statements, compares Excel, calls customers multiple times
- No single view of all data sources
- Cannot tell which transactions are business revenue vs personal transfers

**Workflow:**
1. Select merchant and period
2. View dashboard summary
3. Process exceptions in Inbox
4. Approve or correct AI suggestions
5. Check tax-readiness checklist
6. Export clean data or assign remaining cases to RM

**Traces to:** BR-001, BR-002, BR-004, BR-005, BR-006, BR-015

---

### Persona 2 — Phong, Relationship Manager

**Role:** Relationship Manager at SHB
**Label:** Assumption-based

**Goals:**
- Support merchants quickly without reading full statements
- Know exactly what is missing for each merchant
- Create follow-up requests efficiently

**Needs:**
- Case list with merchant, issue type, and priority
- Draft messages to merchants for confirmation
- Status tracking for assigned tasks

**Pain points:**
- Has to call merchants repeatedly about the same data
- No structured way to track what each merchant needs
- Cannot see reconciliation status without asking operations team

**Workflow:**
1. Receive assigned cases from Merchant Operations Agent
2. Review case details and AI-suggested action
3. Send draft message to merchant (after review)
4. Track merchant response
5. Update case status

**Traces to:** BR-007, BR-008

---

### Persona 3 — Hà, Compliance/Tax Operations Specialist

**Role:** Chuyên viên compliance hoặc vận hành thuế
**Label:** Assumption-based

**Goals:**
- Ensure the system applies the correct tax rule version
- Verify all decisions have source evidence and audit logs
- Confirm reports reference valid rules and time periods

**Needs:**
- Tax-readiness report with rule version, effective date, and legal source
- Audit log export (JSON/CSV)
- Agent trace with tool calls and rule references

**Pain points:**
- Cannot verify which rules were applied to historical reports
- No structured audit trail for reconciliation decisions
- Difficulty proving compliance to auditors

**Workflow:**
1. Review tax-readiness report for a merchant
2. Verify rule version and effective date
3. Check audit log for key decisions
4. Export audit log for external review

**Traces to:** BR-006, BR-009, BR-014, BR-015

---

### Persona 4 — Hương, Salon Owner (Merchant)

**Role:** Chủ hộ kinh doanh (salon)
**Label:** Assumption-based (derived from product.md §6, User Story 1)

**Goals:**
- Answer simple questions about ambiguous transactions
- Not have to learn complex banking dashboards
- Keep using existing tools (Excel, simple POS)

**Needs:**
- Simple confirmation link for exception questions
- Clear Vietnamese explanations of what is being asked
- No need to access SHB internal systems

**Pain points:**
- Gets called by bank staff about transactions she doesn't remember
- Doesn't know which transfer was for which service
- Cannot easily categorize personal vs business money

**Workflow:**
1. Receive confirmation request (link or message)
2. View transaction details and AI suggestion
3. Confirm or correct the classification
4. Done — no further action needed

**Traces to:** BR-004, BR-005, BR-013

---

### Pilot persona constraints

From product.md §4:
- Hộ kinh doanh with revenue large enough to need accounting and invoices
- 1–3 locations
- 3–15 employees
- 30–200 transactions per day
- Accepts both cash and transfer
- No full-time accountant
- May use POS, Excel, or manual recording
- First vertical: salon/beauty services (simpler catalog, higher order value, common transfers, fewer edge cases than restaurants)

## Verification

### Automated

- N/A — persona document

### Manual

- Every persona maps to at least one BR (verified above)
- Personas are labeled as assumption-based
- Stakeholder table includes influence level

---

*Last updated: 2026-07-17*
