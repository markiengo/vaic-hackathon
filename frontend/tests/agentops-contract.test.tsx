import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentActionCard } from "@/features/agentops/AssistantWorkspace";
import {
  decideAgentAction,
  draftCaseMessage,
  executeAgentAction,
  getAgentRunTrace,
  getMerchantDashboard,
  resolveCaseException,
  type AgentAction,
} from "@/lib/api/agentops";
import { streamAgentRun, type AgentStreamEvent } from "@/lib/api/sse-client";

const action: AgentAction = {
  id: "ACT-1",
  agent_run_id: "RUN-1",
  merchant_id: "M001",
  case_id: null,
  requested_by_agent: "merchant_ops",
  tool_name: "create_case",
  action_type: "CREATE_CASE",
  target_type: "case",
  target_id: "CASE-M001-2026-07",
  payload: { period: "2026-07" },
  payload_hash: "abc123",
  human_summary: "Tạo case sau khi người dùng duyệt.",
  status: "PROPOSED",
  decided_by_user_id: null,
  decision_reason: null,
  decided_at: null,
  result: null,
  result_hash: null,
  executed_at: null,
  error: null,
  version: 1,
  created_at: "2026-07-18T00:00:00Z",
  updated_at: "2026-07-18T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "taxlens_csrf=; Max-Age=0; path=/";
});

describe("agent operations contracts", () => {
  it("starts a run via POST /agents/run and yields run_started + progress", async () => {
    document.cookie = "taxlens_csrf=csrf-test; path=/";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          run_id: "RUN-1",
          status: "PLANNING",
          plan: { steps: [{ step: 1, action: "Đối soát", agent: "reconciliation" }] },
        }),
        { status: 202, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const events: AgentStreamEvent[] = [];
    for await (const event of streamAgentRun("M001", "Kiểm tra tháng 7", "2026-07")) {
      events.push(event);
      if (events.length >= 3) break;
    }

    expect(events[0].type).toBe("run_started");
    expect(events[1].type).toBe("plan");
    expect(events[2].type).toBe("progress_summary");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/backend/agents/run");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-test");
    expect(JSON.parse(String(init.body))).toEqual({ merchant_id: "M001", request: "Kiểm tra tháng 7", period: "2026-07" });
  });

  it("polls the run status endpoint after starting a run", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ run_id: "RUN-2", status: "EXECUTING" }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETED", response_text: "Xong" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const events: AgentStreamEvent[] = [];
    for await (const event of streamAgentRun("M001", "Đối soát tháng 7", "2026-07")) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toContain("run_started");
    expect(events.map((e) => e.type)).toContain("done");
    const pollUrl = (fetchMock.mock.calls[1] as [string, RequestInit])[0];
    expect(pollUrl).toBe("/api/backend/agents/runs/RUN-2");
  });

  it("keeps approval and execution as separate versioned requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...action, status: "APPROVED", version: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...action, status: "COMPLETED", version: 4 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await decideAgentAction(action, "APPROVED");
    await executeAgentAction({ ...action, status: "APPROVED", version: 2 });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/backend/agents/actions/ACT-1/decision", expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "APPROVED", expected_version: 1 }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/backend/agents/actions/ACT-1/execute", expect.objectContaining({ method: "POST", body: JSON.stringify({ expected_version: 2 }) }));
  });

  it("uses the real ops detail, trace, draft, and resolution contracts", async () => {
    document.cookie = "taxlens_csrf=csrf-test; path=/";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ recent_transactions: [] }), { status: 200 }))
      .mockImplementation(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    await getMerchantDashboard("M001", "2026-07");
    await getAgentRunTrace("RUN-1");
    await draftCaseMessage("CASE-1", [11, 12]);
    await resolveCaseException(11, { saleId: "SALE-1", classification: "revenue" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/backend/merchants/M001/dashboard?period=2026-07", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/backend/agents/runs/RUN-1/trace", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/backend/cases/CASE-1/draft-message", expect.objectContaining({ method: "POST", body: JSON.stringify({ exception_ids: [11, 12] }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/backend/reconciliation/exceptions/11/resolve", expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "approved", sale_id: "SALE-1", classification: "revenue", note: "SHB Ops approved the recorded proposal." }) }));
    expect(new Headers((fetchMock.mock.calls[3] as [string, RequestInit])[1].headers).get("x-csrf-token")).toBe("csrf-test");
  });

  it("shows one-action approval first and execution only after approval", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...action, status: "APPROVED", version: 2 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { rerender } = render(<QueryClientProvider client={client}><AgentActionCard action={action} runId="RUN-1" /></QueryClientProvider>);

    expect(screen.queryByRole("button", { name: /Thực thi payload/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Duyệt riêng hành động này/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    rerender(<QueryClientProvider client={client}><AgentActionCard action={{ ...action, status: "APPROVED", version: 2 }} runId="RUN-1" /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: /Thực thi payload đã duyệt/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Duyệt riêng hành động này/ })).not.toBeInTheDocument();
  });
});
