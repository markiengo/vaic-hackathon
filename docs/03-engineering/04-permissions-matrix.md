# Permissions Matrix — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Security Lead
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Role definitions

| Role | Description | Hierarchy |
|---|---|---|
| `admin` | Quản trị hệ thống; full access | Level 1 (cao nhất) |
| `compliance` | Chuyên viên tax/compliance; truy cập audit và export | Level 2 |
| `ops_staff` | Nhân viên vận hành merchant SHB; đối soát và ngoại lệ | Level 3 |
| `rm` | Relationship Manager; case management và nhắn merchant | Level 3 |
| `merchant_staff` | Nhân viên salon; chỉ Mini POS | Level 4 (thấp nhất) |

## Permission matrix

| Action | admin | compliance | ops_staff | rm | merchant_staff |
|---|---|---|---|---|---|
| Xem merchant dashboard | ✓ | ✓ | ✓ | ✓ | ✗ |
| Start reconciliation | ✓ | ✗ | ✓ | ✗ | ✗ |
| Xem ngoại lệ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Resolve ngoại lệ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Xem tax-readiness report | ✓ | ✓ | ✓ | ✓ | ✗ |
| Export audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export dữ liệu nháp | ✓ | ✓ | ✓ | ✗ | ✗ |
| Xem agent trace | ✓ | ✓ | ✓ | ✓ | ✗ |
| Tạo case | ✓ | ✗ | ✓ | ✗ | ✗ |
| Giao RM | ✓ | ✗ | ✓ | ✗ | ✗ |
| Draft tin nhắn merchant | ✓ | ✗ | ✓ | ✓ | ✗ |
| Gửi tin nhắn merchant | ✓ | ✗ | ✗ | ✓ | ✗ |
| Tạo sale (Mini POS) | ✓ | ✗ | ✗ | ✗ | ✓ |
| Tạo QR | ✓ | ✗ | ✗ | ✗ | ✓ |
| Ghi thanh toán tiền mặt | ✓ | ✗ | ✗ | ✗ | ✓ |
| Đóng cash session | ✓ | ✗ | ✗ | ✗ | ✓ |
| Quản lý user | ✓ | ✗ | ✗ | ✗ | ✗ |
| Quản lý tax rule | ✓ | ✓ | ✗ | ✗ | ✗ |
| Xác nhận giao dịch (token) | — | — | — | — | ✓ (dựa trên token) |

## Enforcement mechanism

- **Backend:** FastAPI dependency injection kiểm JWT claim với role yêu cầu
- **Frontend:** Route guard redirect user không có quyền
- **Agent tool:** Allowlist tool mỗi agent được enforce tại tool layer (xem `05-domain/01-ai-advisor.md`)
- **Data isolation:** ops_staff và rm chỉ thấy merchant được giao; admin thấy tất cả

```python
# Example enforcement
def require_role(*roles: str):
    async def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise TaxLensError("ERR-AUTH-003", 403, "Insufficient permissions")
        return user
    return dependency

# Usage
@router.post("/reconcile", dependencies=[Depends(require_role("admin", "ops_staff"))])
```

## Business rules

- RM chỉ xem case được giao hoặc merchant của mình
- ops_staff chỉ truy cập merchant trong portfolio của mình
- merchant_staff chỉ truy cập Mini POS cho store được giao
- Compliance xem tất cả merchant nhưng không start reconciliation
- Admin thực hiện được mọi action
- Xác nhận merchant dựa trên token bypass role check (token chính là auth)

## Edge cases

| Scenario | Resolution |
|---|---|
| RM được giao portfolio khác | Case cũ vẫn truy cập được; case mới từ portfolio mới |
| Nhân viên merchant nghỉ việc | User bị deactivate; cash session giữ trong audit |
| Cố gắng escalate role | Log trong audit_events; truy cập bị từ chối |
| Token dùng sau khi nhân viên merchant thay đổi | Token vẫn hợp lệ đến khi hết hạn (7 ngày) |

## Verification

### Automated

- `cd backend && python -m pytest tests/test_permissions.py -v` — test role-based access

### Manual

- Login mỗi role → verify endpoint truy cập được và không được
- Thử action không có quyền → verify 403 với ERR-AUTH-003

---

*Last updated: 2026-07-17*
