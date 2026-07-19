import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SalesWorkspace } from "@/components/sales/SalesWorkspace";
import { ToastProvider } from "@/components/ui";
import * as salesApi from "@/lib/api/sales";

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

vi.mock("@/components/realtime/MerchantRealtimeProvider", () => ({
  useMerchantRealtime: () => ({ connection: "live", latestEvent: null }),
}));

vi.mock("@/lib/api/sales", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/sales")>();
  return {
    ...actual,
    closeCashSession: vi.fn(),
    createPaymentIntent: vi.fn(),
    createSale: vi.fn(),
    getPosContext: vi.fn(),
    getProducts: vi.fn(),
    getSales: vi.fn(),
    recordCashPayment: vi.fn(),
  };
});

function renderWorkspace() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SalesWorkspace />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("sales workspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
    vi.mocked(salesApi.getPosContext).mockResolvedValue({
      merchant_id: "M001",
      store_id: "S001",
      store_name: "Salon Hương",
      device_id: "D001",
      staff_id: "U001",
      active_cash_session: null,
    });
    vi.mocked(salesApi.getProducts).mockResolvedValue([
      {
        id: "P001",
        name: "Cắt tóc",
        category: "Dịch vụ",
        price: 100_000,
        is_service: true,
      },
    ]);
    vi.mocked(salesApi.getSales).mockResolvedValue({ items: [], total: 0, next_cursor: null });
    vi.mocked(salesApi.createSale).mockResolvedValue({
      sale_id: "ORDER-001",
      gross_amount: 100_000,
      discount: 0,
      net_amount: 100_000,
      payment_status: "UNPAID",
      invoice_status: "PENDING",
      idempotent_replay: false,
    });
    vi.mocked(salesApi.recordCashPayment).mockResolvedValue({
      sale_id: "ORDER-001",
      payment_status: "PAID",
      cash_session_id: "1",
    });
  });

  it("creates and records a cash sale with visible evidence", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole("button", { name: /Cắt tóc/ }));
    expect(screen.getByText("1 mặt hàng")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiền mặt" }));

    await waitFor(() => expect(salesApi.createSale).toHaveBeenCalledOnce());
    expect(salesApi.recordCashPayment).toHaveBeenCalledWith(
      "ORDER-001",
      100_000,
      expect.objectContaining({ merchant_id: "M001", store_id: "S001" }),
      expect.stringMatching(/^cash:/),
    );
    expect(await screen.findByText("Đã nhận thanh toán · Đã tự động khớp")).toBeInTheDocument();
    expect(screen.getByText("ORDER-001")).toBeInTheDocument();
    expect(screen.getByText("CASH-SESSION-1")).toBeInTheDocument();
  });

  it("keeps the order retry-safe while creating a QR intent", async () => {
    const user = userEvent.setup();
    vi.mocked(salesApi.createPaymentIntent).mockResolvedValue({
      payment_intent_id: "PAY-ABC123",
      amount: 100_000,
      qr_data: "VIETQR|PAY-ABC123",
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      status: "PENDING",
      idempotent_replay: false,
    });
    renderWorkspace();

    await user.click(await screen.findByRole("button", { name: /Cắt tóc/ }));
    await user.click(screen.getByRole("button", { name: "Tạo QR" }));

    expect(await screen.findByRole("dialog", { name: "Chờ chuyển khoản" })).toBeInTheDocument();
    expect(screen.getByText("PAY-ABC123")).toBeInTheDocument();
    expect(salesApi.createPaymentIntent).toHaveBeenCalledWith(
      "ORDER-001",
      100_000,
      expect.stringMatching(/^intent:/),
    );

    await user.click(screen.getAllByRole("button", { name: "Đóng" }).at(-1)!);
    expect(screen.getByRole("button", { name: /Dịch vụCắt tóc/ })).toBeDisabled();
    expect(screen.getByText(/Đơn đã được lưu và đang chờ chuyển khoản/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mở lại QR" }));
    expect(await screen.findByRole("dialog", { name: "Chờ chuyển khoản" })).toBeInTheDocument();
    expect(salesApi.createSale).toHaveBeenCalledOnce();
    expect(salesApi.createPaymentIntent).toHaveBeenCalledOnce();
  });
});
