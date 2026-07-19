"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Check,
  CircleDot,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  History,
  Paperclip,
  Plus,
  QrCode,
  Sparkles,
  Store,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { Badge, Button, Card, ErrorState, Skeleton } from "@/components/ui";
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
  { text: "Kiểm tra tháng 7", icon: ClipboardList, title: "Kiểm tra tháng 7", desc: "Tìm các mục đang ảnh hưởng đến mức độ sẵn sàng." },
  { text: "Xử lý giao dịch chưa rõ", icon: Store, title: "Xử lý giao dịch chưa rõ", desc: "Xem và xác nhận các khoản TaxLens chưa thể phân loại." },
  { text: "Kiểm tra hóa đơn", icon: FileCheck2, title: "Kiểm tra hóa đơn", desc: "Tìm các đơn đã thanh toán nhưng chưa có hóa đơn." },
] as const;

const EXTRA_SUGGESTION = "Tạo mã QR thanh toán";

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
          <p className="text-sm font-semibold text-ink">Cần chị xác nhận</p>
          <h3 className="mt-1 text-base font-semibold">{action.action_type.replaceAll("_", " ")}</h3>
        </div>
        <Badge tone={actionTone[action.status]}>{action.status}</Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-text-secondary">Sẽ thay đổi gì</p>
          <p className="mt-1 text-ink">{action.human_summary}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Bản ghi bị ảnh hưởng</p>
          <p className="mt-1 font-mono text-xs text-ink">{action.target_id ?? action.target_type}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Không thay đổi</p>
          <p className="mt-1 text-text-secondary">Các bản ghi khác giữ nguyên giá trị hiện tại.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Sự kiện kiểm toán</p>
          <p className="mt-1 text-text-secondary">Một sự kiện audit sẽ được tạo tự động.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Sau khi duyệt</p>
          <p className="mt-1 text-text-secondary">TaxLens sẽ thực thi thay đổi và cập nhật kết quả.</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 rounded-lg bg-background p-4 text-xs sm:grid-cols-2">
        <div><dt className="text-text-secondary">Payload hash</dt><dd className="mt-1 truncate font-mono text-ink">{action.payload_hash}</dd></div>
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
            Thực thi payload đã duyệt
          </Button>
        )}
      </div>
    </Card>
  );
}

function ProgressStep({ done, active, label, detail }: { done: boolean; active: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className={done ? "mt-0.5 text-success" : active ? "mt-0.5 text-secondary" : "mt-0.5 text-text-tertiary"}>
        {done ? <Check aria-hidden size={16} /> : active ? <CircleDot aria-hidden size={16} className="animate-pulse" /> : <span className="block size-4 rounded-full border border-current" />}
      </span>
      <div>
        <span className={done ? "text-ink" : active ? "text-ink" : "text-text-tertiary"}>{label}</span>
        {detail && <p className="mt-0.5 text-xs text-text-secondary">{detail}</p>}
      </div>
    </div>
  );
}

function EventBlock({ event }: { event: AgentStreamEvent }) {
  if (event.type === "run_started") {
    return <div className="flex items-center gap-3 text-xs text-text-secondary"><CircleDot aria-hidden size={15} className="text-secondary" /><span className="font-mono">{event.run_id}</span><Badge tone="info">STARTED</Badge></div>;
  }
  if (event.type === "progress_summary") {
    return (
      <div className="rounded-xl border border-secondary/20 bg-accent/50 p-4">
        <p className="text-xs font-semibold text-secondary">{event.agent} · {event.status}</p>
        <p className="mt-2 text-sm leading-6 text-ink">{event.message}</p>
      </div>
    );
  }
  if (event.type === "plan") {
    return (
      <div className="rounded-xl border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">TaxLens đã chia yêu cầu thành {event.steps.length} việc</p>
        <ol className="mt-4 space-y-3">
          {event.steps.map((step) => <li key={`${step.step}-${step.agent}`} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-bold text-white">{step.step}</span><span><strong className="block text-ink">{step.agent}</strong><span className="text-text-secondary">{step.action}</span></span></li>)}
        </ol>
      </div>
    );
  }
  if (event.type === "tool_started") {
    return (
      <div className="rounded-xl border border-l-4 border-l-mango bg-neutral-soft p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary"><Wrench aria-hidden size={14} />{event.agent}</div>
        <p className="mt-2 font-mono text-sm font-semibold text-ink">{event.tool}</p>
      </div>
    );
  }
  if (event.type === "tool_completed") {
    return (
      <div className="ml-4 rounded-xl border border-success/25 bg-success/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm text-ink">{event.tool}</span><span className="inline-flex items-center gap-1 text-xs text-text-secondary">{event.duration_ms} ms</span></div>
      </div>
    );
  }
  if (event.type === "approval_required") {
    return <div className="rounded-xl border border-mango bg-warning/10 p-4"><p className="text-xs font-semibold text-warning">Cần phê duyệt riêng · {event.impact}</p><p className="mt-2 text-sm leading-6 text-ink">{event.summary}</p></div>;
  }
  if (event.type === "artifact") {
    return <div className="flex items-center gap-3 rounded-xl border bg-surface p-4 text-sm text-ink"><FileCheck2 aria-hidden className="text-success" size={18} />Kết quả có cấu trúc đã sẵn sàng ở bảng bên phải.</div>;
  }
  if (event.type === "error") return <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">{event.message}</p>;
  if (event.type === "done") return <div className="flex items-center gap-2 text-sm font-semibold text-success"><Check aria-hidden size={17} />Luồng đã kết thúc an toàn.</div>;
  return null;
}

function ArtifactCard({ title, subtitle, href, icon: Icon }: { title: string; subtitle: string; href: string; icon: typeof FileCheck2 }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Icon aria-hidden className="mt-0.5 shrink-0 text-secondary" size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
        </div>
      </div>
      <a href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-secondary/80">
        Xem chi tiết <ExternalLink aria-hidden size={12} />
      </a>
    </Card>
  );
}

function ArtifactPane({ artifacts, hasArtifacts }: { artifacts: Record<string, unknown> | null; hasArtifacts: boolean }) {
  return (
    <div className="p-6">
      <h3 className="mb-1 text-sm font-semibold text-ink">Tài liệu &amp; kết quả</h3>
      <p className="mb-4 text-xs text-text-secondary">Các kết quả TaxLens đã tạo trong cuộc trò chuyện này.</p>

      {!hasArtifacts && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-text-tertiary">Chưa có kết quả nào</p>
          <p className="mt-1 text-xs text-text-tertiary">Kết quả sẽ xuất hiện khi TaxLens hoàn thành công việc.</p>
        </div>
      )}

      {hasArtifacts && (
        <div className="space-y-3">
          <ArtifactCard
            title="Báo cáo tháng 7"
            subtitle="Tổng hợp sổ vận hành"
            href="/dashboard"
            icon={FileCheck2}
          />
          <ArtifactCard
            title="3 giao dịch cần xác nhận"
            subtitle="Tổng giá trị: 8.500.000₫ · Đã xử lý: 1/3"
            href="/exceptions"
            icon={TriangleAlert}
          />
          <ArtifactCard
            title="2 đơn thiếu hóa đơn"
            subtitle="DH-1027 · DH-1028"
            href="/invoices"
            icon={FileCheck2}
          />
          {artifacts && (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border bg-background p-4 font-mono text-xs leading-6 text-ink">
              {JSON.stringify(artifacts, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantWorkspace() {
  const queryClient = useQueryClient();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showArtifactDrawer, setShowArtifactDrawer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stream = useAgentStream(merchantId, PERIOD);
  const hasApproval = stream.events.some((event) => event.type === "approval_required");
  const actions = useAgentActions(stream.runId ?? undefined, hasApproval);
  const hasArtifacts = stream.artifacts != null;
  const isIdle = !stream.requestText && !stream.isStreaming && stream.events.length === 0;

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

  function handleSend() {
    if (!request.trim() || !merchantId || stream.isStreaming) return;
    stream.send(request);
    setRequest("");
  }

  function handleSuggestion(text: string) {
    setRequest(text);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const toolLabels: Record<string, { label: string; detail?: string }> = {
    fetch_transactions: { label: "Đối soát giao dịch", detail: "25 giao dịch đã tự ęng khớp" },
    check_orders: { label: "Kiểm tra đơn và tiền mặt", detail: "30 đơn đã kiểm tra" },
    check_invoices: { label: "Kiểm tra hóa đơn", detail: "Đã kiểm tra 28/30 đơn" },
    assess_readiness: { label: "Đánh giá sẵn sàng thuế" },
  };

  const completedTools = stream.events.filter((e) => e.type === "tool_completed") as Array<{ type: "tool_completed"; tool: string }>;
  const activeTool = stream.events.find((e) => e.type === "tool_started") as { type: "tool_started"; tool: string } | undefined;
  const planSteps = stream.events.find((e) => e.type === "plan") as { type: "plan"; steps: Array<{ step: number; action: string; agent: string }> } | undefined;
  const allPlanTools = planSteps?.steps.map((s) => s.action) ?? [];
  const completedToolNames = completedTools.map((e) => e.tool);
  const activeToolName = activeTool?.tool;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-ink">Trợ lý TaxLens</h1>
          <span className="rounded-full bg-[#F5F6F8] px-2.5 py-0.5 text-xs font-medium text-text-secondary">Salon Hương</span>
          <span className="text-xs text-text-tertiary">Tháng 07/2026</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-ink"
          >
            <History aria-hidden size={16} />
            Lịch sử
          </button>
          <button
            type="button"
            onClick={() => { setRequest(""); }}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-ink"
          >
            <Plus aria-hidden size={16} />
            Cuộc trò chuyện mới
          </button>
        </div>
      </div>

      {/* Main workspace — two permanent columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Conversation and work journal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isIdle ? (
            /* Centered welcome state */
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8" style={{ justifyContent: "flex-start", paddingTop: "10vh" }}>
              <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[#EAF0FF] text-secondary">
                <Sparkles aria-hidden size={24} />
              </div>
              <h2 className="mb-2 text-center font-display text-[30px] leading-tight text-ink">Hôm nay TaxLens có thể giúp gì?</h2>
              <p className="mb-8 max-w-[520px] text-center text-sm text-text-secondary">
                Mô tả việc cần kiểm tra hoặc chọn một gợi ý bên dưới.
              </p>

              <div className="mb-5 flex flex-wrap justify-center gap-4">
                {SUGGESTIONS.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.text}
                      type="button"
                      onClick={() => handleSuggestion(suggestion.text)}
                      className="flex w-[200px] flex-col items-start gap-2.5 rounded-2xl border bg-surface p-5 text-left transition-all hover:border-secondary/30 hover:shadow-sm"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-[#EAF0FF] text-secondary">
                        <Icon aria-hidden size={18} />
                      </span>
                      <strong className="text-[15px] font-semibold text-ink">{suggestion.title}</strong>
                      <span className="text-xs leading-5 text-text-secondary">{suggestion.desc}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleSuggestion(EXTRA_SUGGESTION)}
                className="mb-8 rounded-full border bg-surface px-4 py-2 text-sm text-text-secondary transition-colors hover:border-secondary/30 hover:text-ink"
              >
                {EXTRA_SUGGESTION}
              </button>

              <div className="w-full max-w-[760px]">
                <div className="rounded-2xl border bg-surface p-4 shadow-sm">
                  <textarea
                    ref={textareaRef}
                    value={request}
                    onChange={(event) => setRequest(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    aria-label="Yêu cầu cho trợ lý"
                    placeholder="Hỏi TaxLens hoặc mô tả việc chị cần làm…"
                    className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-text-tertiary"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" className="grid size-8 place-items-center rounded-lg text-text-tertiary transition-colors hover:bg-[#F5F6F8] hover:text-ink" aria-label="Đính kèm tài liệu">
                        <Paperclip aria-hidden size={18} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!request.trim() || !merchantId || stream.isStreaming}
                      className="grid size-9 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Gửi yêu cầu"
                    >
                      <ArrowUp aria-hidden size={18} />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-text-tertiary">
                  TaxLens sẽ yêu cầu chị xác nhận trước khi thay đổi dữ liệu.
                </p>
              </div>
            </div>
          ) : (
            /* Active conversation state */
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[800px] space-y-4 px-6 py-6">
                {stream.requestText && (
                  <div className="ml-auto max-w-[80%] rounded-2xl bg-[#F5F6F8] px-4 py-3 text-sm leading-6 text-ink">
                    {stream.requestText}
                  </div>
                )}

                {stream.events.length > 0 && (
                  <div className="text-sm leading-6 text-ink">
                    Em sẽ kiểm tra giao dịch, đơn hàng, tiền mặt và hóa đơn tháng 7.
                  </div>
                )}

                {/* Structured plan with checkmarks */}
                {(planSteps || completedTools.length > 0) && (
                  <div className="rounded-xl border bg-surface p-4">
                    <p className="mb-3 text-sm font-semibold text-ink">
                      {planSteps ? `TaxLens đã chia yêu cầu thành ${planSteps.steps.length} việc` : "Các bước TaxLens đã thực hiện"}
                    </p>
                    <div className="space-y-3">
                      {(planSteps?.steps ?? []).map((step) => {
                        const toolInfo = toolLabels[step.action];
                        const isDone = completedToolNames.includes(step.action);
                        const isActive = activeToolName === step.action;
                        return (
                          <ProgressStep
                            key={`${step.step}-${step.agent}`}
                            done={isDone}
                            active={isActive}
                            label={toolInfo?.label ?? step.action}
                            detail={isDone ? toolInfo?.detail : undefined}
                          />
                        );
                      })}
                      {/* Fallback if no plan but tools completed */}
                      {!planSteps && completedTools.map((tool, i) => {
                        const info = toolLabels[tool.tool];
                        return <ProgressStep key={i} done active={false} label={info?.label ?? tool.tool} detail={info?.detail} />;
                      })}
                      {stream.isStreaming && !activeTool && (
                        <ProgressStep done={false} active label="Đang xử lý…" />
                      )}
                    </div>
                  </div>
                )}

                {/* Event stream */}
                {stream.events.map((event, index) => <EventBlock key={`${event.type}-${index}`} event={event} />)}
                {stream.error && <ErrorState title="Luồng trợ lý bị gián đoạn" description={stream.error} compact />}

                {/* Approval section */}
                {stream.runId && hasApproval && (
                  <div className="space-y-3 pt-4">
                    <p className="text-sm font-semibold text-ink">Cần chị xác nhận</p>
                    {actions.isLoading && <Skeleton className="h-32" />}
                    {actions.isError && <ErrorState title="Không tải được hành động" description={actions.error.message} retry={() => actions.refetch()} compact />}
                    {actions.data?.map((action) => <AgentActionCard key={action.id} action={action} runId={stream.runId!} />)}
                  </div>
                )}

                {/* Sticky composer */}
                <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-4">
                  <div className="rounded-2xl border bg-surface p-3 shadow-sm">
                    <textarea
                      ref={textareaRef}
                      value={request}
                      onChange={(event) => setRequest(event.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      aria-label="Yêu cầu cho trợ lý"
                      placeholder="Hỏi TaxLens hoặc mô tả việc chị cần làm…"
                      className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-text-tertiary"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <button type="button" className="grid size-8 place-items-center rounded-lg text-text-tertiary transition-colors hover:bg-[#F5F6F8] hover:text-ink" aria-label="Đính kèm tài liệu">
                        <Paperclip aria-hidden size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!request.trim() || !merchantId || stream.isStreaming}
                        className="grid size-9 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Gửi yêu cầu"
                      >
                        <ArrowUp aria-hidden size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs text-text-tertiary">
                    TaxLens sẽ yêu cầu chị xác nhận trước khi thay đổi dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Artifact pane — permanent, 400px at desktop */}
        <div className="hidden w-[400px] shrink-0 border-l overflow-y-auto xl:block">
          <ArtifactPane artifacts={stream.artifacts} hasArtifacts={hasArtifacts} />
        </div>

        {/* Mobile artifact drawer toggle */}
        {hasArtifacts && (
          <button
            type="button"
            onClick={() => setShowArtifactDrawer(true)}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-lg xl:hidden"
          >
            <FileCheck2 aria-hidden size={16} />
            Tài liệu
          </button>
        )}

        {/* Mobile artifact drawer */}
        {showArtifactDrawer && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowArtifactDrawer(false)} />
            <div className="absolute right-0 top-0 h-full w-[340px] overflow-y-auto border-l bg-surface">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="text-sm font-semibold text-ink">Tài liệu &amp; kết quả</h3>
                <button type="button" onClick={() => setShowArtifactDrawer(false)} className="grid size-8 place-items-center rounded-lg text-text-secondary hover:bg-[#F5F6F8]">
                  <X aria-hidden size={18} />
                </button>
              </div>
              <ArtifactPane artifacts={stream.artifacts} hasArtifacts={hasArtifacts} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
