"use client";

import { useRef, useState } from "react";
import { streamAgentRun, type AgentStreamEvent } from "@/lib/api/sse-client";

export function useAgentStream(merchantId: string | null, period: string) {
  const abortRef = useRef<AbortController | null>(null);
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [requestText, setRequestText] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    if (!merchantId || !text.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEvents([]);
    setRequestText(text.trim());
    setRunId(null);
    setError(null);
    setIsStreaming(true);
    try {
      for await (const event of streamAgentRun(merchantId, text.trim(), period, controller.signal)) {
        setEvents((current) => [...current, event]);
        if (event.type === "run_started" || event.type === "done") setRunId(event.run_id);
        if (event.type === "error") setError(event.message);
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Luồng trợ lý bị gián đoạn.");
      }
    } finally {
      if (!controller.signal.aborted) setIsStreaming(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setEvents([]);
    setRequestText("");
    setRunId(null);
    setError(null);
    setIsStreaming(false);
  }

  const artifact = [...events].reverse().find((event) => event.type === "artifact");
  const responseEvent = [...events].reverse().find((event) => event.type === "agent_response");
  return {
    events,
    requestText,
    runId,
    isStreaming,
    error,
    responseText: responseEvent?.type === "agent_response" ? responseEvent.response : null,
    send,
    reset,
    artifacts: artifact?.type === "artifact" ? artifact.artifact : null,
    trace: events.filter((event) => ["tool_started", "tool_completed", "approval_required"].includes(event.type)),
  };
}
