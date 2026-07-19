import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const action = {
  id: "ACT-1", agent_run_id: "RUN-1", merchant_id: "M001", case_id: "CASE-M001-2026-07",
  requested_by_agent: "merchant_ops", tool_name: "create_case", action_type: "CREATE_CASE",
  target_type: "case", target_id: "CASE-M001-2026-07", payload: { period: "2026-07" },
  payload_hash: "abc123", human_summary: "Tạo case vận hành sau khi người dùng duyệt riêng.",
  status: "PROPOSED", decided_by_user_id: null, decision_reason: null, decided_at: null,
  result: null, result_hash: null, executed_at: null, error: null, version: 1,
  created_at: "2026-07-18T00:00:00Z", updated_at: "2026-07-18T00:00:00Z",
};

async function authenticated(page: Page) {
  const baseURL = String(test.info().project.use.baseURL);
  await page.context().addCookies([
    { name: "taxlens_access", value: "e2e-access", url: baseURL },
    { name: "taxlens_csrf", value: "e2e-csrf", url: baseURL },
  ]);
}

test.describe("Assistant and SHB operations", () => {
  test.beforeEach(async ({ page }) => {
    await authenticated(page);
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "U001", name: "Hương", email: "merchant@test", role: "merchant", merchant_id: "M001" }, csrfToken: "e2e-csrf" } }));
    await page.route("**/api/backend/transactions?*", (route) => route.fulfill({ json: { transactions: [], total: 0 } }));
  });

  test("streams safe assistant evidence and exposes one-action review", async ({ page }) => {
    const sse = [
      { type: "run_started", run_id: "RUN-1" },
      { type: "progress_summary", agent: "planner", status: "PLANNING", message: "Đang phân tích yêu cầu theo dữ liệu TaxLens." },
      { type: "plan", steps: [{ step: 1, action: "Đối soát giao dịch", agent: "reconciliation" }] },
      { type: "tool_started", tool: "get_bank_transactions", args: { merchant_id: "M001", period: "2026-07" }, agent: "reconciliation" },
      { type: "tool_completed", tool: "get_bank_transactions", output: { kind: "collection", count: 23 }, duration_ms: 12 },
      { type: "approval_required", action_id: "ACT-1", summary: action.human_summary, impact: "CREATE_CASE" },
      { type: "artifact", artifact: { reconciliation: { matched: 15, unmatched: 8 }, status: "WAITING_FOR_HUMAN" } },
      { type: "done", run_id: "RUN-1" },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
    await page.route("**/api/backend/agents/runs/stream", (route) => route.fulfill({ body: sse, contentType: "text/event-stream" }));
    await page.route("**/api/backend/agents/actions?run_id=RUN-1", (route) => route.fulfill({ json: [action] }));
    await page.route("**/api/backend/agents/actions", (route) => route.fulfill({ json: [] }));

    await page.goto("/assistant");
    await expect(page.locator("main").getByText("Salon Hương", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Trợ lý TaxLens" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu kiểm tra" }).click();
    await expect(page.getByText("get_bank_transactions").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Duyệt riêng hành động này/ })).toBeVisible();
    await expect(page.getByText("Bằng chứng, không phải suy nghĩ riêng.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });

  test("turns portfolio triage into an assignable case workspace", async ({ page }) => {
    await page.route("**/api/backend/merchants", (route) => route.fulfill({ json: { merchants: [{ id: "M001", name: "Salon Hoa", business_type: "HOUSEHOLD", business_category: "beauty", status: "ACTIVE", open_cases: 1, active_runs: 1 }], summary: { total: 1, active: 1, open_cases: 1, active_runs: 1 } } }));
    await page.route("**/api/backend/merchants/M001/dashboard?period=2026-07", (route) => route.fulfill({ json: { merchant_id: "M001", period: "2026-07", total_transactions: 23, reconciled_count: 15, reconciliation_rate: 0.6522, exception_count: 8, missing_invoice_count: 2, unclassified_count: 5, tax_readiness: { score: 92, ready: false, rule_version: "2026.07", bank_reconciliation: 0.6522, cash_session_closure: 1, missing_invoices: 2, unclassified_transactions: 5 }, active_agents: [] } }));
    await page.route("**/api/backend/agents/runs", (route) => route.fulfill({ json: [{ id: "RUN-1", case_id: "CASE-M001-2026-07", merchant_id: "M001", request_text: "Kiểm tra tháng 7", plan: null, status: "WAITING_FOR_HUMAN", started_at: "2026-07-18T00:00:00Z", completed_at: null, error: null }] }));
    await page.route("**/api/backend/cases", (route) => route.fulfill({ json: { cases: [{ id: "CASE-M001-2026-07", merchant_id: "M001", period: "2026-07", status: "OPEN", priority: "MEDIUM", assigned_rm_id: null, exception_count: 1, created_at: "2026-07-18T00:00:00Z", updated_at: "2026-07-18T00:00:00Z" }] } }));
    await page.route("**/api/backend/cases/CASE-M001-2026-07", (route) => route.fulfill({ json: { id: "CASE-M001-2026-07", merchant_id: "M001", period: "2026-07", status: "OPEN", priority: "MEDIUM", assigned_rm_id: null, tax_rule_version: "2026.07", human_approvals: [], exception_count: 1, exceptions: [{ id: 1, exception_type: "NO_MATCH", status: "PENDING", bank_transaction_id: "TX-1", sale_id: null, ai_suggestion: null, human_decision: null, created_at: "2026-07-18T00:00:00Z" }], actions: [{ id: "ACT-1", action_type: "CREATE_CASE", human_summary: action.human_summary, status: "COMPLETED", version: 4 }], created_at: "2026-07-18T00:00:00Z", updated_at: "2026-07-18T00:00:00Z" } }));

    await page.goto("/ops");
    await expect(page.getByRole("heading", { level: 1, name: "Bàn điều hành danh mục" })).toBeVisible();
    await expect(page.getByText("1 run chờ quyết định")).toBeVisible();
    await page.goto("/ops/cases/CASE-M001-2026-07");
    await expect(page.getByRole("heading", { level: 1, name: "CASE-M001-2026-07" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gán case cho RM" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("operates merchant health, run trace, audit export, and compliance from real contracts", async ({ page }) => {
    const run = { id: "RUN-1", case_id: "CASE-M001-2026-07", merchant_id: "M001", request_text: "Kiểm tra tháng 7", plan: { period: "2026-07", steps: [{ step: 1, action: "Đối soát giao dịch", agent: "reconciliation" }] }, status: "WAITING_FOR_HUMAN", started_at: "2026-07-18T00:00:00Z", completed_at: null, error: null };
    const caseDetail = { id: "CASE-M001-2026-07", merchant_id: "M001", period: "2026-07", status: "OPEN", priority: "HIGH", assigned_rm_id: "U003", tax_rule_version: "2026.07", human_approvals: [], exception_count: 1, exceptions: [{ id: 1, exception_type: "NO_MATCH", status: "PENDING", bank_transaction_id: "TX-1", sale_id: null, ai_suggestion: { amount: 1250000, confidence: 0.88, classification: "revenue", reason: "Khớp nội dung chuyển khoản" }, human_decision: null, created_at: "2026-07-18T00:00:00Z" }], actions: [action], created_at: "2026-07-18T00:00:00Z", updated_at: "2026-07-18T00:00:00Z" };
    await page.route("**/api/backend/merchants", (route) => route.fulfill({ json: { merchants: [{ id: "M001", name: "Salon Hoa", business_type: "HOUSEHOLD", business_category: "beauty", status: "ACTIVE", open_cases: 1, active_runs: 1 }], summary: { total: 1, active: 1, open_cases: 1, active_runs: 1 } } }));
    await page.route("**/api/backend/merchants/M001/dashboard?period=2026-07", (route) => route.fulfill({ json: { merchant_id: "M001", period: "2026-07", total_transactions: 23, reconciled_count: 15, reconciliation_rate: 0.6522, exception_count: 8, missing_invoice_count: 2, unclassified_count: 5, tax_readiness: { score: 92, ready: false, rule_version: "2026.07", bank_reconciliation: 0.6522, cash_session_closure: 1, missing_invoices: 2, unclassified_transactions: 5 }, active_agents: [] } }));
    await page.route("**/api/backend/cases", (route) => route.fulfill({ json: { cases: [caseDetail] } }));
    await page.route("**/api/backend/cases/CASE-M001-2026-07", (route) => route.fulfill({ json: caseDetail }));
    await page.route("**/api/backend/agents/runs", (route) => route.fulfill({ json: [run] }));
    await page.route("**/api/backend/agents/runs/RUN-1", (route) => route.fulfill({ json: run }));
    await page.route("**/api/backend/agents/runs/RUN-1/trace", (route) => route.fulfill({ json: { run_id: "RUN-1", status: "WAITING_FOR_HUMAN", plan: run.plan.steps, progress: [{ agent: "planner", stage: "PLANNED", summary: "Đã lập kế hoạch có thể truy vết." }], evidence: { tool_call_count: 1 }, tool_calls: [{ agent_name: "reconciliation", tool_name: "get_bank_transactions", input_hash: "inputhash", output_hash: "outputhash", confidence: 0.96, rule_version: "2026.07", called_at: "2026-07-18T00:00:01Z", duration_ms: 18 }], actions: [action] } }));
    await page.route("**/api/backend/audit?format=json&limit=200", (route) => route.fulfill({ json: { events: [{ id: 1, actor_type: "agent", actor_id: "reconciliation", agent_name: "reconciliation", action: "classify_transaction", tool_name: "get_bank_transactions", input_hash: "inputhash", output_hash: "outputhash", confidence: 0.96, rule_version: "2026.07", approval_status: "APPROVED", merchant_id: "M001", timestamp: "2026-07-18T00:00:00Z" }] } }));
    await page.route("**/api/backend/tax/rules", (route) => route.fulfill({ json: { rules: [{ version: "2026.07", merchant_type: "HOUSEHOLD", business_category: "beauty", effective_from: "2026-07-01", effective_to: null, legal_source: "Nghị định 70/2025/NĐ-CP", approval_status: "APPROVED", approved_by: "U004", approved_at: "2026-07-01T00:00:00Z" }] } }));

    await page.goto("/ops/merchants");
    await expect(page.getByRole("heading", { level: 1, name: "Danh mục merchant" })).toBeVisible();
    await expect(page.getByText("92%").first()).toBeVisible();

    await page.goto("/ops/cases");
    await expect(page.getByRole("heading", { name: "Decision controls" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Phê duyệt đề xuất" })).toBeEnabled();

    await page.goto("/ops/agent-runs/RUN-1");
    await expect(page.getByRole("heading", { level: 1, name: "RUN-1" })).toBeVisible();
    await expect(page.getByText("get_bank_transactions")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approval state" })).toBeVisible();

    await page.goto("/ops/audit");
    await expect(page.getByText("classify_transaction").filter({ visible: true })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất JSON" }).click();
    expect((await download).suggestedFilename()).toBe("taxlens-audit-filtered.json");

    await page.goto("/ops/compliance");
    await expect(page.getByText("Nghị định 70/2025/NĐ-CP").filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
