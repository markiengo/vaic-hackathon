import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const merchantId = "LEDGER-M001";

async function installLedgerApi(page: Page) {
  let exceptions = [{
    id: 101,
    merchant_id: merchantId,
    case_id: "CASE-JULY",
    bank_transaction_id: "TX-029",
    sale_id: "SALE-029",
    exception_type: "AMBIGUOUS_MATCH",
    amount: 390000,
    sender_name: "Nguyễn Minh Anh",
    raw_note: "ck tien toc thang 7",
    ai_suggestion: { suggested_type: "revenue", confidence: 0.84, reasoning: ["Số tiền trùng đơn hàng", "Nội dung nhắc dịch vụ tóc"] },
    status: "PENDING",
  }];
  let invoiceLinked = false;

  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { csrfToken: "test-csrf", user: { id: "U001", name: "Nguyễn Thị Hương", email: "huong@example.com", role: "merchant", merchant_id: merchantId } } }));
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend/", "");
    if (path === `merchants/${merchantId}/dashboard`) return route.fulfill({ json: {
      merchant_id: merchantId, period: "2026-07", total_transactions: 30, reconciled_count: 25,
      reconciliation_rate: 0.8333, exception_count: 5, missing_invoice_count: 2, unclassified_count: 5,
      tax_readiness: { score: 92, ready: false, rule_version: "2026.07", bank_reconciliation: 0.8333, cash_session_closure: 1, missing_invoices: 2, unclassified_transactions: 5 },
      active_agents: [], recent_transactions: [{ id: "TX-030", amount: 400000, sender_name: "Lê Thu", raw_note: "thanh toan toc", transaction_date: "2026-07-30T09:00:00Z", match_status: "ambiguous" }],
    } });
    if (path === "reconciliation/exceptions" && request.method() === "GET") return route.fulfill({ json: exceptions });
    if (path.startsWith("reconciliation/exceptions/") && request.method() === "POST") { exceptions = []; return route.fulfill({ json: { exception_id: 101, status: "RESOLVED", decision: "approved", classification: "revenue" } }); }
    if (path === "invoices" && request.method() === "GET") {
      const record = { sale_id: "SALE-030", amount: 400000, payment_status: "PAID", invoice_status: invoiceLinked ? "LINKED" : "MISSING", invoice_id: invoiceLinked ? "INV-030" : null, invoice_number: invoiceLinked ? "HD-030" : null, provider: invoiceLinked ? "MISA" : null, issued_at: invoiceLinked ? "2026-07-30T10:00:00Z" : null, created_at: "2026-07-30T09:00:00Z", readiness_blocker: !invoiceLinked };
      return route.fulfill({ json: { merchant_id: merchantId, period: "2026-07", missing_count: invoiceLinked ? 0 : 1, items: [record], records: [record], total: 1, next_cursor: null } });
    }
    if (path === "invoices/link" && request.method() === "POST") { invoiceLinked = true; return route.fulfill({ json: { invoice_id: "INV-030", sale_id: "SALE-030", status: "LINKED" } }); }
    if (path === "tax/readiness") {
      const ready = exceptions.length === 0 && invoiceLinked;
      const failed = { item: "missing_invoices", value: 1, threshold: 0, pass: false, details: "29/30 đơn đã có hóa đơn", action_href: "/invoices?period=2026-07&status=missing" };
      const passed = { ...failed, value: 0, pass: true, details: "30/30 đơn đã có hóa đơn" };
      const check = ready ? passed : failed;
      return route.fulfill({ json: { merchant_id: merchantId, period: "2026-07", score: ready ? 100 : 92, ready, export_allowed: ready, rule_version: "2026.07", effective_from: "2026-07-01", legal_source: "TT40", approved_by: "compliance", generated_at: "2026-08-03T00:00:00Z", checklist: [check], checks: [check], blockers: ready ? [] : [failed] } });
    }
    if (path === "tax/export" && request.method() === "GET") return route.fulfill({ status: 200, body: "MaChungTu,SoTien\nTX-001,100000", headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=misa_july.csv" } });
    if (path === "transactions") return route.fulfill({ json: { transactions: [
      { id: "TX-030", merchant_id: merchantId, amount: 400000, sender_name: "Lê Thu", raw_note: "thanh toan toc", normalized_note: "thanh toan toc", transaction_date: "2026-07-30T09:00:00Z", match_status: "matched", matched_sale_id: "SALE-030", matched_sale_ids: ["SALE-030"], allocated_amount: 400000, classification: "revenue", invoice_id: null, reference_number: "PAY-SALON-030", source: "SEPAY", ai_interpretation: { confidence: 1, reasoning: ["Mã thanh toán trùng khớp", "Số tiền bằng giá trị đơn"] } },
      { id: "TX-029", merchant_id: merchantId, amount: 390000, sender_name: "Nguyễn Minh Anh", raw_note: "ck tien toc thang 7", normalized_note: "ck tien toc thang 7", transaction_date: "2026-07-29T08:00:00Z", match_status: "ambiguous", matched_sale_id: null, matched_sale_ids: [], allocated_amount: 0, classification: null, invoice_id: null, pending_exception_id: 101, source: "SHB", ai_interpretation: { confidence: 0.84, reasoning: ["Số tiền trùng một đơn hàng", "Nội dung nhắc dịch vụ tóc"] } },
    ], total: 2, page: 1, page_size: 100 } });
    return route.fulfill({ status: 404, json: { error: { code: "TEST-404", message: path } } });
  });
}

test.describe("merchant ledger product journey", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ context, page, baseURL }) => {
    await context.addCookies([{ name: "taxlens_access", value: "test-access", url: baseURL! }, { name: "taxlens_csrf", value: "test-csrf", url: baseURL! }]);
    await installLedgerApi(page);
  });

  test("moves persisted decisions from 92 to 100 and unlocks MISA export", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan vận hành" })).toBeVisible();
    await expect(page.getByText("92%", { exact: true })).toBeVisible();

    await page.goto("/exceptions");
    await page.getByRole("button", { name: /Doanh thu/ }).click();
    await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
    await expect(page.getByRole("heading", { name: "Đã xử lý xong hàng chờ" })).toBeVisible();

    await page.goto("/invoices");
    await page.getByRole("button", { name: "Liên kết hóa đơn" }).click();
    await page.getByLabel("ID hóa đơn").fill("INV-030");
    await page.getByRole("button", { name: "Liên kết", exact: true }).click();
    await expect(page.getByText("Độ phủ hóa đơn đã hoàn tất")).toBeVisible();

    await page.goto("/tax-readiness");
    await expect(page.getByLabel("Mức sẵn sàng 100%")).toBeVisible();
    await expect(page.getByText("Đã mở khóa")).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /MISA CSV/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("misa_july.csv");
  });

  test("keeps every ledger route accessible and within the viewport", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/dashboard", "/transactions", "/exceptions", "/invoices", "/tax-readiness"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
      if (testInfo.project.name !== "mobile") {
        await expect(page).toHaveScreenshot(`${path.slice(1)}.png`, {
          animations: "disabled",
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      }
    }
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
});
