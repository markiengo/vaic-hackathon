# Permissions Matrix — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Security Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Role definitions

| Role | Description | Hierarchy |
|---|---|---|
| `admin` | System administrator; full access | Level 1 (highest) |
| `compliance` | Tax/compliance officer; audit and export access | Level 2 |
| `ops_staff` | SHB merchant operations staff; reconciliation and exceptions | Level 3 |
| `rm` | Relationship Manager; case management and merchant messaging | Level 3 |
| `merchant_staff` | Salon staff; Mini POS only | Level 4 (lowest) |

## Permission matrix

| Action | admin | compliance | ops_staff | rm | merchant_staff |
|---|---|---|---|---|---|
| View merchant dashboard | ✓ | ✓ | ✓ | ✓ | ✗ |
| Start reconciliation | ✓ | ✗ | ✓ | ✗ | ✗ |
| View exceptions | ✓ | ✓ | ✓ | ✓ | ✗ |
| Resolve exception | ✓ | ✗ | ✓ | ✗ | ✗ |
| View tax-readiness report | ✓ | ✓ | ✓ | ✓ | ✗ |
| Export audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export draft data | ✓ | ✓ | ✓ | ✗ | ✗ |
| View agent trace | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create case | ✓ | ✗ | ✓ | ✗ | ✗ |
| Assign RM | ✓ | ✗ | ✓ | ✗ | ✗ |
| Draft merchant message | ✓ | ✗ | ✓ | ✓ | ✗ |
| Send merchant message | ✓ | ✗ | ✗ | ✓ | ✗ |
| Create sale (Mini POS) | ✓ | ✗ | ✗ | ✗ | ✓ |
| Generate QR | ✓ | ✗ | ✗ | ✗ | ✓ |
| Record cash payment | ✓ | ✗ | ✗ | ✗ | ✓ |
| Close cash session | ✓ | ✗ | ✗ | ✗ | ✓ |
| Manage users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage tax rules | ✓ | ✓ | ✗ | ✗ | ✗ |
| Confirm transaction (token) | — | — | — | — | ✓ (token-based) |

## Enforcement mechanism

- **Backend:** FastAPI dependency injection checks JWT claims against required role
- **Frontend:** Route guards redirect unauthorized users
- **Agent tools:** Each agent's tool allowlist is enforced at the tool layer (see `AI-ADVISOR.md`)
- **Data isolation:** ops_staff and rm see only merchants assigned to them; admin sees all

```python
# Example enforcement
def require_role(*roles: str):
    async def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise KHOPError("ERR-AUTH-003", 403, "Insufficient permissions")
        return user
    return dependency

# Usage
@router.post("/reconcile", dependencies=[Depends(require_role("admin", "ops_staff"))])
```

## Business rules

- RM can only view cases assigned to them or their merchants
- ops_staff can only access merchants in their portfolio
- merchant_staff can only access Mini POS for their assigned store
- Compliance can view all merchants but cannot start reconciliation
- Admin can perform all actions
- Token-based merchant confirmation bypasses role check (token itself is the auth)

## Edge cases

| Scenario | Resolution |
|---|---|
| RM reassigned to different portfolio | Old cases remain accessible; new cases from new portfolio |
| Merchant staff leaves | User deactivated; cash sessions remain in audit |
| Role escalation attempt | Logged in audit_events; access denied |
| Token used after merchant staff change | Token still valid until expiry (7 days) |

## Verification

### Automated

- `cd backend && python -m pytest tests/test_permissions.py -v` — role-based access tests

### Manual

- Login as each role → verify accessible and inaccessible endpoints
- Attempt unauthorized action → verify 403 with ERR-AUTH-003

---

*Last updated: 2026-07-17*
