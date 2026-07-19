import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MerchantRealtimeProvider } from "@/components/realtime/MerchantRealtimeProvider";
import { ToastProvider } from "@/components/ui";
import type { RealtimeEvent } from "@/lib/realtime/types";

let deliver: ((event: RealtimeEvent) => void) | undefined;

vi.mock("@/hooks/useMerchantSession", () => ({
  useMerchantSession: () => ({
    data: { user: { merchant_id: "M001" } },
  }),
}));

vi.mock("@/hooks/useRealtimeTransactions", () => ({
  useRealtimeTransactions: ({ onEvent }: { onEvent: (event: RealtimeEvent) => void }) => {
    deliver = onEvent;
    return "live";
  },
}));

describe("merchant realtime provider", () => {
  beforeEach(() => {
    deliver = undefined;
  });

  it("refreshes every ledger read model and announces incoming money", () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MerchantRealtimeProvider><span>workspace</span></MerchantRealtimeProvider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    act(() => deliver?.({
      type: "money_received",
      event_id: "evt-1",
      merchant_id: "M001",
      occurred_at: "2026-08-03T09:00:00Z",
      transaction_id: "TX-001",
      amount: 1_500_000,
      sender_name: "Nguyễn Văn A",
      match_status: "matched",
    }));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
    expect(screen.getByText(/Đã nhận thanh toán/)).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Văn A/)).toBeInTheDocument();
  });
});
