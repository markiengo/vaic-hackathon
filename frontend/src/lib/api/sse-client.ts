export type AgentStreamEvent =
  | { type: "run_started"; run_id: string }
  | { type: "progress_summary"; agent: string; status: string; message: string }
  | { type: "plan"; steps: Array<{ step: number; action: string; agent: string }> }
  | { type: "tool_started"; tool: string; args: Record<string, unknown>; agent: string }
  | { type: "tool_completed"; tool: string; output: Record<string, unknown>; duration_ms: number }
  | { type: "approval_required"; action_id: string; summary: string; impact: string }
  | { type: "action_completed"; action_id: string; output: unknown }
  | { type: "artifact"; artifact: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done"; run_id: string };

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export async function* streamAgentRun(
  merchantId: string,
  requestText: string,
  period: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const headers = new Headers({ accept: "text/event-stream", "content-type": "application/json" });
  const csrf = readCookie("taxlens_csrf");
  if (csrf) headers.set("x-csrf-token", csrf);
  const response = await fetch("/api/backend/agents/runs/stream", {
    method: "POST",
    credentials: "same-origin",
    headers,
    signal,
    body: JSON.stringify({ merchant_id: merchantId, request_text: requestText, period }),
  });
  if (response.status === 404 || response.status === 405) {
    const fallback = await fetch("/api/backend/agents/run", {
      method: "POST",
      credentials: "same-origin",
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
    const status = accepted.status ?? "PLANNING";
    yield {
      type: "progress_summary",
      agent: "supervisor",
      status,
      message: status === "PLANNING"
        ? "Yêu cầu đã được nhận và đang chờ backend thực thi kế hoạch."
        : `Backend đã nhận yêu cầu với trạng thái ${status}.`,
    };
    if (["COMPLETED", "DONE"].includes(status)) yield { type: "done", run_id: accepted.run_id };
    return;
  }
  if (!response.ok || !response.body) {
    throw new Error(response.status === 401 ? "Phiên đăng nhập đã hết hạn." : "Không thể bắt đầu trợ lý TaxLens.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.replaceAll("\r\n", "\n").split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) yield JSON.parse(data) as AgentStreamEvent;
    }
    if (done) break;
  }
}
