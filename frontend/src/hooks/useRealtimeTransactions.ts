"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { parseRealtimeEvent, type RealtimeEvent } from "@/lib/realtime/types";
import { transactionWebSocketUrl } from "@/lib/realtime/ws-client";

export type RealtimeConnection = "idle" | "connecting" | "live" | "retrying";

export function useRealtimeTransactions({
  merchantId,
  enabled,
  onEvent,
}: {
  merchantId: string | null;
  enabled: boolean;
  onEvent: (event: RealtimeEvent) => void;
}) {
  const [connection, setConnection] = useState<RealtimeConnection>("idle");
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    if (!enabled || !merchantId || typeof WebSocket === "undefined") {
      return;
    }
    const effectiveMerchantId = merchantId;

    let stopped = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    function connect() {
      if (stopped) return;
      setConnection(attempts ? "retrying" : "connecting");
      socket = new WebSocket(transactionWebSocketUrl(effectiveMerchantId));
      socket.onopen = () => {
        attempts = 0;
        setConnection("live");
      };
      socket.onmessage = (message) => {
        try {
          const event = parseRealtimeEvent(JSON.parse(String(message.data)));
          if (event?.merchant_id === effectiveMerchantId) handleEvent(event);
        } catch {
          // Invalid or private event shapes are ignored at the browser boundary.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        attempts += 1;
        setConnection("retrying");
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts, 15_000));
      };
    }

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [enabled, merchantId]);

  return enabled && merchantId ? connection : "idle";
}
