import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvoices, linkInvoice, markInvoiceIssuedElsewhere } from "@/lib/api/invoices";
import { getDashboard } from "@/lib/api/dashboard";
import { createSale, getSales } from "@/lib/api/sales";
import { downloadTaxExport, getTaxReadiness } from "@/lib/api/tax";
import { getTransactions } from "@/lib/api/transactions";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "taxlens_csrf=ledger-csrf; path=/";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

describe("canonical ledger API modules", () => {
  it("uses the canonical paginated invoice contract", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ merchant_id: "M001", period: "2026-07", missing_count: 0, items: [], records: [], total: 0, next_cursor: null }));
    await getInvoices("M001", "2026-07", "missing");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/invoices?merchant_id=M001&period=2026-07&status=missing");
  });

  it("sends tenant scope and CSRF on both canonical invoice writes", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ invoice_id: "I001", sale_id: "S001", status: "LINKED" })));
    await linkInvoice("M001", "S001", "I001");
    await markInvoiceIssuedElsewhere("M001", "S002", "HD-002", "VNPT");
    const first = fetchMock.mock.calls[0][1] as RequestInit;
    const second = fetchMock.mock.calls[1][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/invoices/link");
    expect(JSON.parse(String(first.body))).toEqual({ merchant_id: "M001", sale_id: "S001", invoice_id: "I001" });
    expect(new Headers(first.headers).get("x-csrf-token")).toBe("ledger-csrf");
    expect(JSON.parse(String(second.body))).toMatchObject({ merchant_id: "M001", sale_id: "S002", source: "VNPT" });
  });

  it("preserves idempotency and JSON headers on POS writes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ sale_id: "ORDER-1", payment_status: "UNPAID" }));
    const cartItem = { key: "P002", product_id: "P002", product_name: "Cắt tóc nam", quantity: 1, unit_price: 100_000 };
    await createSale(
      {
        merchant_id: "M001",
        store_id: "S001",
        store_name: "Salon Hương",
        device_id: "D001",
        staff_id: "U005",
        active_cash_session: null,
      },
      [cartItem],
      0,
      "sale-idempotency-1",
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("idempotency-key")).toBe("sale-idempotency-1");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-csrf-token")).toBe("ledger-csrf");
    expect(JSON.parse(String(init.body)).items).toEqual([
      { product_id: "P002", product_name: "Cắt tóc nam", quantity: 1, unit_price: 100_000 },
    ]);
  });

  it("passes search and pagination to the live transaction read model", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ transactions: [], total: 0, page: 2, page_size: 10 }));
    const result = await getTransactions({ merchantId: "M001", period: "2026-07", status: "ambiguous", search: "HUONG", page: 2, pageSize: 10 });
    expect(fetchMock.mock.calls[0][0]).toContain("transactions?merchant_id=M001&period=2026-07&page=2&page_size=10&status=ambiguous&search=HUONG");
    expect(result).toMatchObject({ transactions: [], total: 0, page: 2, page_size: 10, next_cursor: null });
  });

  it("normalizes main readiness and downloads through its POST export contract", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      merchant_id: "M001",
      period: "2026-07",
      ready: false,
      rule_version: "2026.07",
      generated_at: "2026-07-31T00:00:00Z",
      checklist: [
        { name: "bank_reconciliation", value: 0.83, threshold: 0.95, passed: false, details: "Cần đạt 95%" },
        { name: "cash_session_closure", value: true, threshold: true, passed: true },
      ],
    }));
    const readiness = await getTaxReadiness("M001", "2026-07");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/tax/readiness?merchant_id=M001&period=2026-07");
    expect(readiness).toMatchObject({ score: 50, export_allowed: false, ready: false });
    expect(readiness.checks[0]).toMatchObject({ item: "bank_reconciliation", pass: false });

    fetchMock.mockResolvedValueOnce(new Response("MaChungTu\nTX-1", { status: 200, headers: { "content-disposition": "attachment; filename=ledger.csv", "content-type": "text/csv" } }));
    const createObjectURL = vi.fn(() => "blob:ledger");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await downloadTaxExport("M001", "2026-07", "csv");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/tax/export");
    const exportInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(exportInit.method).toBe("POST");
    expect(JSON.parse(String(exportInit.body))).toEqual({ merchant_id: "M001", period: "2026-07", format: "csv" });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:ledger");
  });

  it("normalizes the integrated dashboard and sales response shapes", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        merchant_id: "M001",
        period: "2026-07",
        total_transactions: 30,
        matched: 25,
        reconciliation_rate: 0.83,
        open_exceptions: 5,
        missing_invoice_count: 2,
        unclassified_count: 5,
        tax_readiness: {
          bank_reconciliation: false,
          cash_session_closure: true,
          missing_invoices: false,
          unclassified_transactions: false,
          rule_version: "2026.07",
          ready: false,
        },
        active_agents: [{ run_id: "RUN-1", status: "PLANNING", request: "Kiểm tra tháng 7" }],
      }))
      .mockResolvedValueOnce(jsonResponse({ transactions: [{ id: "TX-1", amount: 100_000 }], total: 1 }))
      .mockResolvedValueOnce(jsonResponse([{ id: "ORDER-1", merchant_id: "M001", store_id: "S001", net_amount: 100_000, payment_status: "UNPAID", invoice_status: "PENDING", created_at: "2026-07-31T00:00:00Z" }]));

    const dashboard = await getDashboard("M001", "2026-07");
    expect(dashboard).toMatchObject({
      reconciled_count: 25,
      reconciliation_rate: 0.83,
      exception_count: 5,
      recent_transactions: [{ id: "TX-1", amount: 100_000 }],
      tax_readiness: { score: 25, ready: false },
    });

    const sales = await getSales("M001", "2026-07");
    expect(sales).toMatchObject({ total: 1, next_cursor: null });
    expect(sales.items[0]).toMatchObject({ id: "ORDER-1", lines: [], relationship: { order_id: "ORDER-1" } });
  });
});
