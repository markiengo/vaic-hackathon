import { z } from "zod";

export const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("money_received"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    transaction_id: z.string(),
    amount: z.number(),
    sender_name: z.string().nullish(),
    match_status: z.string(),
  }),
  z.object({
    type: z.literal("transaction.received"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    transaction_id: z.string(),
    amount: z.number(),
    sender_name: z.string().nullish(),
    match_status: z.string(),
  }),
  z.object({
    type: z.literal("transaction.matched"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    transaction_id: z.string(),
    sale_id: z.string(),
    amount: z.number(),
  }),
  z.object({
    type: z.literal("agent.progress"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    run_id: z.string(),
    agent: z.string(),
    stage: z.string(),
    summary: z.string(),
    progress: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("agent.action_proposed"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    run_id: z.string(),
    action_id: z.string(),
    title: z.string(),
    impact: z.string(),
  }),
  z.object({
    type: z.literal("agent.completed"),
    event_id: z.string(),
    merchant_id: z.string(),
    occurred_at: z.string(),
    run_id: z.string(),
    status: z.enum(["COMPLETED", "FAILED", "CANCELLED"]),
    summary: z.string(),
  }),
]);

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

export function parseRealtimeEvent(value: unknown): RealtimeEvent | null {
  const envelope = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const data = envelope?.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)
    ? envelope.data as Record<string, unknown>
    : null;
  const normalized = envelope?.type === "transaction" && envelope.event === "money_received" && data
    ? {
        type: "money_received",
        event_id: typeof data.event_id === "string" ? data.event_id : `transaction:${String(data.id ?? "unknown")}`,
        merchant_id: data.merchant_id,
        occurred_at: data.occurred_at ?? data.transaction_date,
        transaction_id: data.transaction_id ?? data.id,
        amount: typeof data.amount === "string" ? Number(data.amount) : data.amount,
        sender_name: data.sender_name,
        match_status: typeof data.match_status === "string" ? data.match_status : "unmatched",
      }
    : value;
  const result = realtimeEventSchema.safeParse(normalized);
  return result.success ? result.data : null;
}
