'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type TransactionNotification = {
  id: string;
  merchant_id: string;
  amount: string;
  sender_name: string;
  raw_note: string;
  transaction_type: string;
  reference_number: string | null;
  payment_code: string | null;
  account_number: string | null;
  source: string;
  transaction_date: string;
};

type WsMessage = {
  type: string;
  event: string;
  data: TransactionNotification;
};

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`
    : 'ws://localhost:8000');

export function useTransactionSocket() {
  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    let shouldReconnect = true;

    function connect() {
      const wsUrl = `${WS_BASE_URL}/api/v1/ws/transactions`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          if (msg.type === 'transaction' && msg.event === 'money_received') {
            setNotifications((prev) => [msg.data, ...prev].slice(0, 5));
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (shouldReconnect) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };
    }

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { notifications, connected, dismiss };
}
