import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRealtimeTransactions } from "@/hooks/useRealtimeTransactions";
import type { RealtimeEvent } from "@/lib/realtime/types";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {}
}

function Probe() {
  const [latest, setLatest] = useState("none");
  const connection = useRealtimeTransactions({
    merchantId: "M001",
    enabled: true,
    onEvent: (event: RealtimeEvent) => setLatest(event.type),
  });
  return <div><span>{connection}</span><span>{latest}</span></div>;
}

describe("transaction realtime hook", () => {
  afterEach(() => {
    FakeWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("uses cookie-authenticated tenant URL and rejects cross-tenant events", () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    render(<Probe />);
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toContain("/api/v1/ws/transactions?merchant_id=M001");

    act(() => socket.onopen?.());
    expect(screen.getByText("live")).toBeInTheDocument();
    act(() => socket.onmessage?.({ data: JSON.stringify({
      type: "transaction.matched",
      event_id: "evt-other",
      merchant_id: "M002",
      occurred_at: "2026-07-18T10:00:00Z",
      transaction_id: "TX-OTHER",
      sale_id: "ORDER-OTHER",
      amount: 100_000,
    }) } as MessageEvent));
    expect(screen.getByText("none")).toBeInTheDocument();

    act(() => socket.onmessage?.({ data: JSON.stringify({
      type: "transaction.matched",
      event_id: "evt-own",
      merchant_id: "M001",
      occurred_at: "2026-07-18T10:00:00Z",
      transaction_id: "TX-001",
      sale_id: "ORDER-001",
      amount: 100_000,
    }) } as MessageEvent));
    expect(screen.getByText("transaction.matched")).toBeInTheDocument();
  });
});
