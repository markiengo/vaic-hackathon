import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
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
  await page.route("**/api/backend/pos/context?*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      merchant_id: "M001",
      store_id: "S001",
      store_name: "Salon Hương",
      device_id: "D001",
      staff_id: "U001",
      active_cash_session: null,
    }),
  }));
  await page.route("**/api/backend/pos/products?*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([
      { id: "P001", name: "Cắt tóc tạo kiểu", category: "Dịch vụ", price: 180000, is_service: true },
      { id: "P002", name: "Gội dưỡng", category: "Chăm sóc", price: 90000, is_service: true },
    ]),
  }));
  await page.route("**/api/backend/sales?*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ items: [], total: 0, next_cursor: null }),
  }));
  await page.route("**/api/backend/pos/sales", (route) => route.fulfill({
    contentType: "application/json",
    status: 201,
    body: JSON.stringify({
      sale_id: "ORDER-E2E",
      gross_amount: 180000,
      discount: 0,
      net_amount: 180000,
      payment_status: "UNPAID",
      invoice_status: "PENDING",
      idempotent_replay: false,
    }),
  }));
  await page.route("**/api/backend/pos/cash-payments", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ sale_id: "ORDER-E2E", payment_status: "PAID", cash_session_id: "1", allocation_id: 18 }),
  }));
});

test("merchant completes a cash sale with accessible evidence", async ({ page }) => {
  await page.goto("/sales");
  await expect(page.getByRole("heading", { name: "Quầy bán hàng" })).toBeVisible();
  await page.getByRole("button", { name: /Cắt tóc tạo kiểu/ }).click();
  await expect(page.getByText("1 mặt hàng")).toBeVisible();
  await page.getByRole("button", { name: "Tiền mặt" }).click();
  await expect(page.getByText("Đã nhận thanh toán · Đã tự động khớp")).toBeVisible();
  await expect(page.getByText("ORDER-E2E", { exact: true })).toBeVisible();
  await expect(page.getByText("CASH-18", { exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
