import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money, formatMoney } from "@/components/domain/Money";
import { RecordRelationshipChain } from "@/components/domain/RecordRelationshipChain";
import { formatConfidence } from "@/features/ledger/format";
import { parseRealtimeEvent } from "@/lib/realtime/types";

describe("money", () => {
  it("formats Vietnamese dong without a separating space", () => {
    expect(formatMoney(1_500_000)).toBe("1.500.000₫");
    render(<Money value={-200_000} />);
    expect(screen.getByText("-200.000₫")).toHaveClass("text-danger", "whitespace-nowrap");
  });
});

describe("confidence", () => {
  it("normalizes fractional and percentage API representations", () => {
    expect(formatConfidence(0.78)).toBe("78%");
    expect(formatConfidence(78)).toBe("78%");
    expect(formatConfidence(150)).toBe("100%");
    expect(formatConfidence(null)).toBe("Chưa xác định");
  });
});

describe("record relationship chain", () => {
  it("renders every ledger node and an explicit missing state", () => {
    render(
      <RecordRelationshipChain
        order={{ id: "DH-1023", amount: 1_500_000 }}
        payment={{ id: "TXN-456", amount: 1_500_000 }}
        invoice={null}
      />,
    );
    expect(screen.getByLabelText("Liên kết chứng từ")).toBeInTheDocument();
    expect(screen.getByText("DH-1023")).toBeInTheDocument();
    expect(screen.getByText("Chưa liên kết")).toBeInTheDocument();
  });
});

describe("safe realtime events", () => {
  it("accepts progress summaries and rejects unknown payloads", () => {
    expect(
      parseRealtimeEvent({
        type: "agent.progress",
        event_id: "evt-1",
        merchant_id: "M001",
        occurred_at: "2026-08-03T09:00:00Z",
        run_id: "RUN-001",
        agent: "reconciliation",
        stage: "matching",
        summary: "Đã đối chiếu 25 giao dịch với đơn hàng.",
        progress: 0.7,
      }),
    ).not.toBeNull();
    expect(
      parseRealtimeEvent({
        type: "money_received",
        event_id: "evt-payment",
        merchant_id: "M001",
        occurred_at: "2026-08-03T09:00:00Z",
        transaction_id: "TX-001",
        amount: 1_500_000,
        sender_name: "Nguyễn Văn A",
        match_status: "matched",
      }),
    ).not.toBeNull();
    expect(parseRealtimeEvent({ type: "agent.chain_of_thought", content: "private" })).toBeNull();
  });
});
