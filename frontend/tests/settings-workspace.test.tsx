import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { ToastProvider } from "@/components/ui";
import * as settingsApi from "@/lib/api/settings";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "U001",
        name: "Owner",
        email: "owner@example.test",
        role: "merchant",
        merchant_id: "M001",
      },
    },
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/settings")>();
  return {
    ...actual,
    getIntegrationStatus: vi.fn(),
    getMerchantProfile: vi.fn(),
    importLedger: vi.fn(),
    syncSepay: vi.fn(),
  };
});

const readyImport: settingsApi.LedgerImportResult = {
  batch_id: "IMP-001",
  status: "READY",
  source_type: "CSV",
  total_rows: 2,
  valid_rows: 1,
  imported_rows: 0,
  rejected_rows: 1,
  preview: [{ row_number: 1, date: "2026-07-17", amount: "250000", sender: "Nguyen Van A", note: "ORDER-001", type: "CREDIT" }],
  errors: [{ row_number: 2, reason: "amount must be positive", raw_row: { amount: "bad" } }],
  idempotent_replay: false,
};

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SettingsWorkspace />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("settings workspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getMerchantProfile).mockResolvedValue({
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
    });
    vi.mocked(settingsApi.getIntegrationStatus).mockResolvedValue({
      merchant_id: "M001",
      provider: "SEPAY",
      configured: true,
      latest_run: null,
    });
    vi.mocked(settingsApi.syncSepay).mockResolvedValue({
      id: "SYNC-001",
      merchant_id: "M001",
      initiated_by_user_id: "U001",
      provider: "SEPAY",
      trigger_type: "MANUAL",
      idempotency_key: "stable",
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
    });
  });

  it("shows merchant identity and runs a configured SePay sync", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(await screen.findByRole("heading", { name: "Salon Hương" })).toBeInTheDocument();
    expect(screen.getByText("0312345678")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Tối/ }));
    expect(setTheme).toHaveBeenCalledWith("dark");

    await user.click(screen.getByRole("button", { name: "Đồng bộ SePay ngay" }));
    await waitFor(() => expect(settingsApi.syncSepay).toHaveBeenCalledOnce());
    expect(settingsApi.syncSepay).toHaveBeenCalledWith(
      "M001",
      expect.stringMatching(/^\d{4}-\d{2}$/),
      "",
      expect.stringMatching(/^sepay:/),
    );
    expect(await screen.findByText("Đồng bộ SePay hoàn tất")).toBeInTheDocument();
  });

  it("requires preview before committing an imported ledger", async () => {
    const user = userEvent.setup();
    vi.mocked(settingsApi.importLedger)
      .mockResolvedValueOnce(readyImport)
      .mockResolvedValueOnce({ ...readyImport, status: "PARTIAL", imported_rows: 1 });
    renderWorkspace();

    await screen.findByRole("heading", { name: "Nhập sao kê" });
    const file = new File(["date,amount,note\n2026-07-17,250000,ORDER-001"], "ledger.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Chọn file sao kê"), file);
    expect(screen.getByText("ledger.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận nhập vào sổ" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));
    await waitFor(() => expect(settingsApi.importLedger).toHaveBeenCalledWith("M001", expect.any(String), file, false));
    expect((await screen.findAllByText("Nguyen Van A")).length).toBeGreaterThan(0);
    expect(screen.getByText("amount must be positive")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xác nhận nhập vào sổ" }));
    await waitFor(() => expect(settingsApi.importLedger).toHaveBeenLastCalledWith("M001", expect.any(String), file, true));
    expect(await screen.findByRole("button", { name: "Đã ghi vào sổ" })).toBeDisabled();
  });
});
