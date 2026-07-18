import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const validToken = "signed-valid-capability-token-with-enough-length";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/public/confirm", async (route) => {
    const body = route.request().postDataJSON() as { operation: string; token: string; classification?: string };
    if (body.token.includes("expired")) {
      return route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: { code: "ERR-TOKEN-002", message: "Confirmation token has expired" } }) });
    }
    if (body.token.includes("invalid")) {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "ERR-TOKEN-001", message: "Confirmation token is invalid" } }) });
    }
    if (body.operation === "submit") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ status: "CONFIRMED", exception_id: 42, classification: body.classification }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        exception_id: 42,
        status: "OPEN",
        amount: "5000000",
        sender_name: "Nguyễn Văn A",
        date: "2026-07-17",
        raw_note: "chuyen tien cho em",
        ai_suggestion: "revenue",
        confidence: 0.82,
        suggestion_summary: "TaxLens đề xuất doanh thu từ các chi tiết giao dịch đang hiển thị.",
        expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        options: ["revenue", "internal_transfer", "loan", "other"],
        consumed_at: null,
      }),
    });
  });
});

test("recipient confirms visible transaction evidence without signing in", async ({ page }) => {
  await page.goto(`/confirm/${validToken}`);
  await expect(page).toHaveURL(new RegExp(`/confirm/${validToken}$`));
  await expect(page.getByRole("heading", { name: "Khoản tiền này là gì?" })).toBeVisible();
  await expect(page.getByText("Nguyễn Văn A")).toBeVisible();
  await expect(page.getByText("82% tin cậy")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(validToken);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  await page.getByText(/^Chuyển nội bộ$/).click();
  await expect(page.getByRole("radio", { name: /^Chuyển nội bộ/ })).toBeChecked();
  await page.getByRole("button", { name: "Xác nhận đề xuất" }).click();
  await expect(page.getByRole("heading", { name: "Cảm ơn bạn đã xác nhận" })).toBeVisible();
  await expect(page.getByText(/Chuyển nội bộ/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(validToken);
});

test("recipient sees distinct expired and invalid link states", async ({ page }) => {
  await page.goto("/confirm/signed-expired-capability-token-with-enough-length");
  await expect(page.getByRole("heading", { name: "Cần một liên kết mới" })).toBeVisible();
  await page.goto("/confirm/signed-invalid-capability-token-with-enough-length");
  await expect(page.getByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
});
