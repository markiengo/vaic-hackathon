"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  CircleDot,
  Clock3,
  FileCheck2,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton, Tabs } from "@/components/ui";
import {
  agentOpsKeys,
  useActionDecision,
  useActionExecution,
  useAgentActions,
} from "@/hooks/useAgentOps";
import { useAgentStream } from "@/hooks/useAgentStream";
import type { AgentAction } from "@/lib/api/agentops";
import type { AgentStreamEvent } from "@/lib/api/sse-client";
import type { SessionResponse } from "@/lib/auth/contracts";

const PERIOD = "2026-07";
const SUGGESTIONS = [
  "Kiểm tra tháng 7 flow giúp chị",
  "Tổng quan sẵn sàng thuế và việc cần tôi duyệt",
  "Có bao nhiêu ngoại lệ cần SHB hỗ trợ?",
];

const actionTone: Record<AgentAction["status"], "neutral" | "info" | "success" | "warning" | "danger"> = {
  PROPOSED: "warning",
  APPROVED: "info",
  REJECTED: "neutral",
  EXECUTING: "info",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export function AgentActionCard({ action, runId }: { action: AgentAction; runId: string }) {
  const decision = useActionDecision(runId);
  const execution = useActionExecution(runId);
  const busy = decision.isPending || execution.isPending;
  return (
    <Card className="border-l-4 border-l-mango bg-surface-elevated">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Hành động cần kiểm soát</p>
          <h3 className="mt-2 font-display text-2xl">{action.action_type.replaceAll("_", " ")}</h3>
        </div>
        <Badge tone={actionTone[action.status]}>{action.status}</Badge>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">{action.human_summary}</p>
      <dl className="mt-5 grid gap-3 rounded-lg bg-background p-4 text-xs sm:grid-cols-2">
        <div><dt className="text-text-secondary">Đích ghi</dt><dd className="mt-1 font-mono text-text">{action.target_id ?? action.target_type}</dd></div>
        <div><dt className="text-text-secondary">Payload hash</dt><dd className="mt-1 truncate font-mono text-text">{action.payload_hash}</dd></div>
      </dl>
      {(decision.isError || execution.isError || action.error) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {decision.error?.message ?? execution.error?.message ?? action.error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {action.status === "PROPOSED" && (
          <>
            <Button disabled={busy} onClick={() => decision.mutate({ action, decision: "APPROVED" })}>
              <Check aria-hidden size={16} />Duyệt riêng hành động này
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => decision.mutate({ action, decision: "REJECTED" })}>
              <X aria-hidden size={16} />Từ chối
            </Button>
          </>
        )}
        {action.status === "APPROVED" && (
          <Button disabled={busy} onClick={() => execution.mutate(action)}>
            <Play aria-hidden size={16} />Thực thi payload đã duyệt
          </Button>
        )}
      </div>
    </Card>
  );
}

function EventBlock({ event }: { event: AgentStreamEvent }) {
  if (event.type === "run_started") {
    return <div className="flex items-center gap-3 text-xs text-text-secondary"><CircleDot aria-hidden size={15} className="text-secondary" /><span className="font-mono">{event.run_id}</span><Badge tone="info">STARTED</Badge></div>;
  }
  if (event.type === "progress_summary") {
    return (
      <details open className="rounded-xl border border-secondary/20 bg-accent p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{event.agent} · {event.status}</summary>
        <p className="mt-2 text-sm leading-6 text-text">{event.message}</p>
      </details>
    );
  }
  if (event.type === "plan") {
    return (
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Kế hoạch có thể truy vết</p>
        <ol className="mt-4 space-y-3">
          {event.steps.map((step) => <li key={`${step.step}-${step.agent}`} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-bold text-white">{step.step}</span><span><strong className="block text-text">{step.agent}</strong><span className="text-text-secondary">{step.action}</span></span></li>)}
        </ol>
      </Card>
    );
  }
  if (event.type === "tool_started") {
    return (
      <div className="rounded-xl border border-l-4 border-l-mango bg-brand-navy p-4 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/65"><Wrench aria-hidden size={14} />{event.agent}</div>
        <p className="mt-2 font-mono text-sm font-semibold text-white">{event.tool}</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-white/75">{JSON.stringify(event.args, null, 2)}</pre>
      </div>
    );
  }
  if (event.type === "tool_completed") {
    return (
      <div className="ml-4 rounded-xl border border-success/25 bg-success/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm text-text">{event.tool}</span><span className="inline-flex items-center gap-1 text-xs text-text-secondary"><Clock3 aria-hidden size={13} />{event.duration_ms} ms</span></div>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-text-secondary">{JSON.stringify(event.output, null, 2)}</pre>
      </div>
    );
  }
  if (event.type === "approval_required") {
    return <div className="rounded-xl border border-mango bg-warning/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">Cần phê duyệt riêng · {event.impact}</p><p className="mt-2 text-sm leading-6 text-text">{event.summary}</p></div>;
  }
  if (event.type === "artifact") {
    return <div className="flex items-center gap-3 rounded-xl border bg-surface p-4 text-sm text-text"><FileCheck2 aria-hidden className="text-success" size={18} />Kết quả có cấu trúc đã sẵn sàng ở bảng bên phải.</div>;
  }
  if (event.type === "error") return <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">{event.message}</p>;
  if (event.type === "done") return <div className="flex items-center gap-2 text-sm font-semibold text-success"><Check aria-hidden size={17} />Luồng đã kết thúc an toàn.</div>;
  return null;
}

function ArtifactPanel({ artifacts }: { artifacts: Record<string, unknown> | null }) {
  if (!artifacts) return <p className="text-sm leading-6 text-text-secondary">Kết quả có cấu trúc sẽ xuất hiện sau khi các công cụ hoàn tất.</p>;
  return <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-background p-4 font-mono text-xs leading-6 text-text">{JSON.stringify(artifacts, null, 2)}</pre>;
}

export function AssistantWorkspace() {
  const queryClient = useQueryClient();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [request, setRequest] = useState(SUGGESTIONS[0]);
  const stream = useAgentStream(merchantId, PERIOD);
  const actions = useAgentActions(stream.runId ?? undefined);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session: SessionResponse) => setMerchantId(session.user.merchant_id ?? "M001"))
      .catch(() => setMerchantId("M001"));
  }, []);

  useEffect(() => {
    if (!stream.runId) return;
    queryClient.invalidateQueries({ queryKey: agentOpsKeys.actions(stream.runId) });
    queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
  }, [queryClient, stream.events.length, stream.runId]);

  const summary = stream.artifacts
    ? `TaxLens đã hoàn tất ${stream.events.filter((event) => event.type === "tool_completed").length} công cụ và tạo ${stream.events.filter((event) => event.type === "approval_required").length} điểm kiểm soát cần con người quyết định.`
    : "Bản tóm tắt chỉ được tạo từ sự kiện và artifact an toàn, không hiển thị suy nghĩ riêng của mô hình.";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Điều phối có kiểm soát" title="Trợ lý TaxLens" description="Giao mục tiêu bằng tiếng Việt. Theo dõi kế hoạch, bằng chứng công cụ và duyệt riêng từng thay đổi trước khi dữ liệu được ghi." merchant="Salon Hương" period="Tháng 07/2026" />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(21rem,2fr)]">
        <div className="space-y-5">
          <Card variant="workspace" className="border-t-4 border-t-secondary p-0">
            <div className="border-b p-6 sm:p-8">
              <div className="flex items-center gap-3 text-secondary"><Sparkles aria-hidden size={18} /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Yêu cầu mới</span></div>
              <textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={4} aria-label="Yêu cầu cho trợ lý" className="mt-5 w-full resize-none border-0 bg-transparent font-display text-2xl leading-snug text-text outline-none placeholder:text-text-secondary sm:text-3xl" />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs text-text-secondary"><ShieldCheck aria-hidden size={15} />Không hành động ghi nào tự chạy.</p>
                <Button size="lg" className="font-bold hover:bg-primary" onClick={() => stream.send(request)} disabled={!merchantId || stream.isStreaming || !request.trim()}><Send aria-hidden size={18} />{stream.isStreaming ? "Đang kiểm tra" : "Bắt đầu kiểm tra"}</Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-4 sm:px-8">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => setRequest(suggestion)} className="min-h-10 shrink-0 rounded-full border bg-surface px-4 text-xs font-semibold text-text-secondary hover:border-secondary hover:text-text">{suggestion}</button>)}</div>
          </Card>

          <Card aria-live="polite" className="min-h-[24rem]">
            <div className="flex items-center justify-between gap-4 border-b pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Hội thoại & tiến độ</p><h2 className="mt-1 font-display text-2xl">Luồng bằng chứng trực tiếp</h2></div>{stream.isStreaming && <span className="inline-flex items-center gap-2 text-xs font-semibold text-secondary"><span className="size-2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />Đang chạy</span>}</div>
            <div className="mt-5 space-y-4">
              {stream.requestText && <div className="ml-auto max-w-[85%] rounded-xl bg-background p-4 text-sm leading-6 text-text">{stream.requestText}</div>}
              {!stream.requestText && <div className="grid min-h-52 place-items-center text-center"><div><Bot aria-hidden className="mx-auto text-secondary" size={28} /><p className="mt-3 text-sm text-text-secondary">Chọn một gợi ý hoặc mô tả mục tiêu để bắt đầu.</p></div></div>}
              {stream.events.map((event, index) => <EventBlock key={`${event.type}-${index}`} event={event} />)}
              {stream.error && <ErrorState title="Luồng trợ lý bị gián đoạn" description={stream.error} compact />}
            </div>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="bg-brand-navy text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Cam kết hiển thị</p>
            <h2 className="mt-4 font-display text-3xl">Bằng chứng, không phải suy nghĩ riêng.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-white/75"><li className="flex gap-3"><Check aria-hidden className="mt-1 shrink-0 text-mango" size={16} />Tiến độ bằng ngôn ngữ nghiệp vụ.</li><li className="flex gap-3"><Check aria-hidden className="mt-1 shrink-0 text-mango" size={16} />Tool, duration và kết quả đã khử dữ liệu nhạy cảm.</li><li className="flex gap-3"><Check aria-hidden className="mt-1 shrink-0 text-mango" size={16} />Duyệt và thực thi là hai bước tách biệt.</li></ul>
          </Card>
          <Card>
            <Tabs ariaLabel="Kết quả trợ lý" items={[
              { value: "result", label: "Kết quả", content: <ArtifactPanel artifacts={stream.artifacts} /> },
              { value: "summary", label: "Tóm tắt", content: <p className="text-sm leading-7 text-text-secondary">{summary}</p> },
              { value: "audit", label: "Audit trail", content: <ol className="space-y-3">{stream.trace.length ? stream.trace.map((event, index) => <li key={`${event.type}-${index}`} className="border-l-2 border-secondary pl-3 text-xs text-text-secondary"><span className="font-mono text-text">{event.type}</span></li>) : <li className="text-sm text-text-secondary">Chưa có tool hoặc approval event.</li>}</ol> },
            ]} />
          </Card>
        </div>
      </section>

      {stream.runId && (
        <section aria-labelledby="approval-heading" className="space-y-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-mango">Human checkpoint</p><h2 id="approval-heading" className="mt-2 font-display text-3xl">Hành động chờ quyết định</h2></div>
          {actions.isLoading && <Skeleton className="h-48" />}
          {actions.isError && <ErrorState title="Không tải được hành động" description={actions.error.message} retry={() => actions.refetch()} compact />}
          {actions.data?.map((action) => <AgentActionCard key={action.id} action={action} runId={stream.runId!} />)}
          {actions.data?.length === 0 && <Card><p className="text-sm text-text-secondary">Run này không đề xuất thay đổi dữ liệu.</p></Card>}
        </section>
      )}
    </div>
  );
}
