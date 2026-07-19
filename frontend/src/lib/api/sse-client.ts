export type AgentStreamEvent =
  | { type: "run_started"; run_id: string }
  | { type: "progress_summary"; agent: string; status: string; message: string }
  | { type: "plan"; steps: Array<{ step: number; action: string; agent: string }> }
  | { type: "tool_started"; tool: string; args: Record<string, unknown>; agent: string }
  | { type: "tool_completed"; tool: string; output: Record<string, unknown>; duration_ms: number }
  | { type: "approval_required"; action_id: string; summary: string; impact: string }
  | { type: "action_completed"; action_id: string; output: unknown }
  | { type: "agent_response"; response: string }
  | { type: "artifact"; artifact: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done"; run_id: string };

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function isDemoMode(): boolean {
  return readCookie("taxlens_demo") === "1";
}

const DEMO_BACKEND_URL = "http://127.0.0.1:8000/api/v1";

export async function* streamAgentRun(
  merchantId: string,
  requestText: string,
  period: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const headers = new Headers({ accept: "text/event-stream", "content-type": "application/json" });
  const csrf = readCookie("taxlens_csrf");
  if (csrf) headers.set("x-csrf-token", csrf);

  // Demo mode: call backend directly, no auth needed
  const demo = isDemoMode();
  const baseUrl = demo ? DEMO_BACKEND_URL : "";

  const fallbackUrl = demo ? `${baseUrl}/agents/run` : "/api/backend/agents/run";

  {
    const fallback = await fetch(fallbackUrl, {
      method: "POST",
      credentials: demo ? undefined : "same-origin",
      headers: new Headers(headers),
      signal,
      body: JSON.stringify({ merchant_id: merchantId, request: requestText, period }),
    });
    if (!fallback.ok) {
      throw new Error(fallback.status === 401 ? "Phiên đăng nhập đã hết hạn." : "Không thể bắt đầu trợ lý TaxLens.");
    }
    const accepted = await fallback.json() as {
      run_id: string;
      status?: string;
      plan?: { steps?: Array<{ step: number; action: string; agent: string }> };
    };
    yield { type: "run_started", run_id: accepted.run_id };
    if (accepted.plan?.steps?.length) yield { type: "plan", steps: accepted.plan.steps };
    yield {
      type: "progress_summary",
      agent: "supervisor",
      status: "PLANNING",
      message: "TaxLens đang phân tích yêu cầu và lên kế hoạch xử lý.",
    };

    // Poll run status until terminal
    const pollInterval = 1000;
    const maxAttempts = 60;
    let traceFetched = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      try {
        const pollUrl = demo
          ? `${baseUrl}/agents/runs/${accepted.run_id}`
          : `/api/backend/agents/runs/${accepted.run_id}`;
        const pollResp = await fetch(pollUrl, {
          method: "GET",
          credentials: demo ? undefined : "same-origin",
          headers: new Headers({ accept: "application/json" }),
          signal,
        });
        if (!pollResp.ok) continue;
        const runState = await pollResp.json() as {
          status: string;
          plan?: { steps?: Array<{ step: number; action: string; agent: string }> };
          error?: string;
          response_text?: string;
        };
        if (runState.plan?.steps?.length) {
          yield { type: "plan", steps: runState.plan.steps };
        }
        yield {
          type: "progress_summary",
          agent: "supervisor",
          status: runState.status,
          message: runState.status === "EXECUTING"
            ? "TaxLens đang thực thi các bước đã lên kế hoạch."
            : runState.status === "COMPLETED"
              ? "TaxLens đã hoàn thành xử lý yêu cầu."
              : runState.status === "FAILED"
                ? `Lỗi xử lý: ${runState.error ?? "không xác định"}`
                : `Đang xử lý… (${runState.status})`,
        };

        // When the run reaches WAITING_FOR_HUMAN or a terminal state, fetch the trace
        // to surface tool calls and approval-required actions to the UI.
        if (["WAITING_FOR_HUMAN", "COMPLETED", "DONE", "FAILED"].includes(runState.status) && !traceFetched) {
          traceFetched = true;
          try {
            const traceUrl = demo
              ? `${baseUrl}/agents/runs/${accepted.run_id}/trace`
              : `/api/backend/agents/runs/${accepted.run_id}/trace`;
            const traceResp = await fetch(traceUrl, {
              method: "GET",
              credentials: demo ? undefined : "same-origin",
              headers: new Headers({ accept: "application/json" }),
              signal,
            });
            if (traceResp.ok) {
              const trace = await traceResp.json() as {
                tool_calls?: Array<{ tool_name: string; agent_name: string; duration_ms?: number; output?: Record<string, unknown> }>;
                actions?: Array<{ id: string; status: string; human_summary: string; action_type: string }>;
              };
              for (const tc of trace.tool_calls ?? []) {
                yield { type: "tool_started", tool: tc.tool_name, args: {}, agent: tc.agent_name };
                yield { type: "tool_completed", tool: tc.tool_name, output: tc.output ?? {}, duration_ms: tc.duration_ms ?? 0 };
              }
              for (const act of trace.actions ?? []) {
                if (act.status === "PROPOSED") {
                  yield { type: "approval_required", action_id: act.id, summary: act.human_summary, impact: act.action_type };
                }
              }
            }
          } catch {
            // Trace fetch failed — continue without tool/approval events
          }
        }

        if (["COMPLETED", "DONE", "FAILED"].includes(runState.status)) {
          if (runState.status === "FAILED") {
            yield { type: "error", message: runState.error ?? "Xử lý thất bại." };
          } else {
            if (runState.response_text) {
              yield { type: "agent_response", response: runState.response_text };
            }
            yield { type: "artifact", artifact: { run_id: accepted.run_id, status: runState.status } };
          }
          yield { type: "done", run_id: accepted.run_id };
          return;
        }
      } catch {
        // Network error during poll, continue
      }
    }
    // Timeout — yield done so UI unblocks
    yield { type: "done", run_id: accepted.run_id };
    return;
  }
}
