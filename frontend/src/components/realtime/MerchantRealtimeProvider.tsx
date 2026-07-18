"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/components/domain/Money";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import {
  useRealtimeTransactions,
  type RealtimeConnection,
} from "@/hooks/useRealtimeTransactions";
import { useToast } from "@/components/ui";
import type { RealtimeEvent } from "@/lib/realtime/types";

type MerchantRealtimeContextValue = {
  connection: RealtimeConnection;
  latestEvent: RealtimeEvent | null;
};

const MerchantRealtimeContext = createContext<MerchantRealtimeContextValue>({
  connection: "idle",
  latestEvent: null,
});

const LEDGER_QUERY_ROOTS = new Set([
  "dashboard",
  "exceptions",
  "invoices",
  "sales",
  "tax-readiness",
  "transactions",
]);

export function MerchantRealtimeProvider({ children }: { children: ReactNode }) {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [latestEvent, setLatestEvent] = useState<RealtimeEvent | null>(null);
  const connection = useRealtimeTransactions({
    merchantId,
    enabled: Boolean(merchantId),
    onEvent: (event) => {
      setLatestEvent(event);
      if (
        event.type === "money_received" ||
        event.type === "transaction.received" ||
        event.type === "transaction.matched"
      ) {
        void queryClient.invalidateQueries({
          predicate: (query) => LEDGER_QUERY_ROOTS.has(String(query.queryKey[0])),
        });
      }
      if (event.type === "money_received" || event.type === "transaction.received") {
        toast({
          title: `Đã nhận thanh toán: ${formatMoney(event.amount)}`,
          description: event.sender_name
            ? `Từ ${event.sender_name}. Dữ liệu đang được đối soát tự động.`
            : "Giao dịch mới đang được đối soát tự động.",
          tone: "success",
        });
      }
    },
  });

  return (
    <MerchantRealtimeContext.Provider value={{ connection, latestEvent }}>
      {children}
    </MerchantRealtimeContext.Provider>
  );
}

export function useMerchantRealtime() {
  return useContext(MerchantRealtimeContext);
}
