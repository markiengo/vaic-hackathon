import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

let importCalls = 0;

test.beforeEach(async ({ context, page }) => {
  importCalls = 0;
  await context.addCookies([
    { name: "taxlens_access", value: "e2e", domain: "localhost", path: "/" },
    { name: "taxlens_csrf", value: "csrf-e2e", domain: "localhost", path: "/" },
  ]);
  await page.route("**/api/auth/session", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      csrfToken: "csrf-e2e",
      user: { id: "U001", name: "Owner", email: "owner@test.local", role: "merchant", merchant_id: "M001" },
    }),
  }));
  await page.route("**/api/backend/merchants/M001", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      id: "M001",
      name: "Salon Hương",
      business_type: "HOUSEHOLD_BUSINESS",
      business_category: "Dịch vụ làm đẹp",
      tax_id: "0312345678",
      contact_phone: "0901002003",
      contact_email: "owner@salon.test",
      status: "ACTIVE",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    }),
  }));
  await page.route("**/api/backend/integrations/status?*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ merchant_id: "M001", provider: "SEPAY", configured: true, latest_run: null }),
  }));
  await page.route("**/api/backend/integrations/sepay/sync", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      id: "SYNC-E2E",
      merchant_id: "M001",
      initiated_by_user_id: "U001",
      provider: "SEPAY",
      trigger_type: "MANUAL",
      idempotency_key: "e2e",
      status: "COMPLETED",
      range_start: null,
      range_end: null,
      cursor_before: null,
      cursor_after: null,
      records_received: 3,
      records_inserted: 2,
      records_skipped: 1,
      records_failed: 0,
      request_context: {},
      result_summary: { matched: 1 },
      error_code: null,
      error_message: null,
      started_at: "2026-07-18T01:00:00Z",
      completed_at: "2026-07-18T01:00:01Z",
      created_at: "2026-07-18T01:00:00Z",
      updated_at: "2026-07-18T01:00:01Z",
    }),
  }));
  await page.route("**/api/backend/imports/ledger", (route) => {
    importCalls += 1;
    const committed = importCalls > 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        batch_id: "IMP-E2E",
        status: committed ? "PARTIAL" : "READY",
        source_type: "CSV",
        total_rows: 2,
        valid_rows: 1,
        imported_rows: committed ? 1 : 0,
        rejected_rows: 1,
        preview: [{ row_number: 1, date: "2026-07-17", amount: "250000", sender: "Nguyen Van A", note: "ORDER-E2E", type: "CREDIT" }],
        errors: [{ row_number: 2, reason: "Số tiền không hợp lệ", raw_row: { amount: "bad" } }],
        idempotent_replay: false,
      }),
    });
  });
});

test("merchant previews and commits a ledger import from settings", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salon Hương" })).toBeVisible();
  await page.getByRole("button", { name: "Đồng bộ SePay ngay" }).click();
  await expect(page.getByText("Đồng bộ SePay hoàn tất")).toBeVisible();

  await page.getByLabel("Chọn file sao kê").setInputFiles({
    name: "ledger.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("date,amount,note\n2026-07-17,250000,ORDER-E2E"),
  });
  await expect(page.getByText("ledger.csv")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận nhập vào sổ" })).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra dữ liệu" }).click();
  await expect(page.locator(":is(td, span):visible", { hasText: "Nguyen Van A" }).first()).toBeVisible();
  await expect(page.getByText("Số tiền không hợp lệ")).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận nhập vào sổ" }).click();
  await expect(page.getByRole("button", { name: "Đã ghi vào sổ" })).toBeDisabled();
  expect(importCalls).toBe(2);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
