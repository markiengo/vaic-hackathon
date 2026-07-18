"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  FileJson2,
  ShieldCheck,
  UserRoundCheck,
  Workflow,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  KpiCard,
  LoadingState,
  PageHeader,
  Select,
  type DataTableColumn,
} from "@/components/ui";
import {
  useAgentRun,
  useAgentRuns,
  useAgentRunTrace,
  useAssignCase,
  useAuditEvents,
  useCaseDetail,
  useCases,
  useComplianceRules,
  useDraftCaseMessage,
  useMerchantDashboard,
  useMerchantDashboards,
  usePortfolio,
  useResolveCaseException,
} from "@/hooks/useAgentOps";
import type {
  AgentRunSummary,
  AuditEvent,
  ComplianceRule,
} from "@/lib/api/agentops";
import { cn } from "@/lib/utils";

function statusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["ACTIVE", "COMPLETED", "APPROVED", "RESOLVED", "CLOSED"].includes(status)) return "success";
  if (["FAILED", "REJECTED", "BLOCKED"].includes(status)) return "danger";
  if (["PLANNING", "EXECUTING", "ASSIGNED"].includes(status)) return "info";
  if (["OPEN", "PENDING", "WAITING_FOR_HUMAN", "WAITING_FOR_CONFIRMATION", "PROPOSED"].includes(status)) return "warning";
  return "neutral";
}

function when(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function age(value: string | null) {
  if (!value) return "—";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? "< 1 ngày" : `${days} ngày`;
}

function duration(start: string | null, end: string | null) {
  if (!start) return "—";
  const milliseconds = new Date(end ?? Date.now()).getTime() - new Date(start).getTime();
  if (milliseconds < 60_000) return `${Math.max(0, Math.round(milliseconds / 1000))} giây`;
  return `${Math.max(1, Math.round(milliseconds / 60_000))} phút`;
}

function money(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount)
    : "—";
}

function SectionError({ title, error, retry }: { title: string; error: Error; retry: () => void }) {
  return <ErrorState title={title} description={error.message} retry={retry} />;
}

const runColumns: DataTableColumn<AgentRunSummary>[] = [
  { key: "run", header: "Run", primary: true, cell: (row) => <Link href={`/ops/agent-runs/${row.id}`} className="inline-flex items-center gap-2 font-mono text-xs text-secondary hover:underline">{row.id}<ArrowRight aria-hidden size={14} /></Link> },
  { key: "merchant", header: "Merchant", cell: (row) => row.merchant_id },
  { key: "request", header: "Yêu cầu khởi tạo", cell: (row) => <span className="line-clamp-2 max-w-md">{row.request_text}</span> },
  { key: "status", header: "Trạng thái", cell: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
  { key: "duration", header: "Thời lượng", hideOnMobile: true, cell: (row) => duration(row.started_at, row.completed_at) },
];

const auditColumns: DataTableColumn<AuditEvent>[] = [
  { key: "event", header: "Sự kiện", primary: true, cell: (row) => <span><span className="block">{row.action}</span><span className="mt-1 block font-mono text-xs font-normal text-text-secondary">#{row.id}</span></span> },
  { key: "actor", header: "Tác nhân", cell: (row) => `${row.actor_type} · ${row.actor_id}` },
  { key: "agent", header: "Agent", cell: (row) => row.agent_name ?? "—" },
  { key: "tool", header: "Tool", cell: (row) => row.tool_name ?? "—" },
  { key: "refs", header: "Input / output ref", hideOnMobile: true, cell: (row) => <span className="block max-w-40 truncate font-mono text-[11px]" title={`${row.input_hash ?? "—"} / ${row.output_hash ?? "—"}`}>{row.input_hash?.slice(0, 8) ?? "—"} / {row.output_hash?.slice(0, 8) ?? "—"}</span> },
  { key: "confidence", header: "Confidence", align: "right", cell: (row) => row.confidence == null ? "—" : `${Math.round(row.confidence * 100)}%` },
  { key: "rule", header: "Rule version", hideOnMobile: true, cell: (row) => row.rule_version ?? "—" },
  { key: "approval", header: "Phê duyệt", cell: (row) => row.approval_status ? <Badge tone={statusTone(row.approval_status)}>{row.approval_status}</Badge> : "—" },
  { key: "time", header: "Thời điểm", hideOnMobile: true, cell: (row) => when(row.timestamp) },
];

const ruleColumns: DataTableColumn<ComplianceRule>[] = [
  { key: "version", header: "Phiên bản", primary: true, cell: (row) => <span className="font-mono">{row.version}</span> },
  { key: "scope", header: "Phạm vi", cell: (row) => `${row.merchant_type ?? "all"} · ${row.business_category ?? "all"}` },
  { key: "effective", header: "Hiệu lực", cell: (row) => `${row.effective_from}${row.effective_to ? ` → ${row.effective_to}` : " → hiện tại"}` },
  { key: "source", header: "Nguồn pháp lý", cell: (row) => <span className="line-clamp-2 max-w-md">{row.legal_source}</span> },
  { key: "approver", header: "Người duyệt", hideOnMobile: true, cell: (row) => row.approved_by ?? "—" },
  { key: "approval", header: "Kiểm soát", cell: (row) => <Badge tone={statusTone(row.approval_status)}>{row.approval_status}</Badge> },
];

export function OperationsOverview() {
  const portfolio = usePortfolio();
  const cases = useCases();
  const runs = useAgentRuns();
  const dashboards = useMerchantDashboards(portfolio.data?.merchants.map((merchant) => merchant.id) ?? []);
  if (portfolio.isLoading || cases.isLoading || runs.isLoading) return <LoadingState label="Đang tổng hợp danh mục vận hành" />;
  if (portfolio.isError) return <SectionError title="Không tải được danh mục" error={portfolio.error} retry={() => portfolio.refetch()} />;
  if (cases.isError) return <SectionError title="Không tải được cases" error={cases.error} retry={() => cases.refetch()} />;
  if (runs.isError) return <SectionError title="Không tải được agent runs" error={runs.error} retry={() => runs.refetch()} />;
  if (!portfolio.data || !cases.data || !runs.data) return <EmptyState title="Chưa có dữ liệu vận hành" description="TaxLens chưa nhận được dữ liệu danh mục." />;

  const summary = portfolio.data.summary;
  const waiting = runs.data.filter((run) => run.status === "WAITING_FOR_HUMAN");
  const scored = dashboards.flatMap((query) => query.data ? [query.data.tax_readiness.score] : []);
  const averageReadiness = scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : "—";
  const oldestCase = cases.data.cases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
  const assignedRms = new Set(cases.data.cases.flatMap((item) => item.assigned_rm_id ? [item.assigned_rm_id] : [])).size;
  const operationalRows = portfolio.data.merchants.map((merchant, index) => {
    const relatedCases = cases.data.cases.filter((item) => item.merchant_id === merchant.id);
    const relatedRuns = runs.data.filter((item) => item.merchant_id === merchant.id);
    const openCase = relatedCases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
    return {
      ...merchant,
      readiness: dashboards[index]?.data?.tax_readiness.score ?? null,
      oldestCase: openCase?.created_at ?? null,
      assignedRm: relatedCases.find((item) => item.assigned_rm_id)?.assigned_rm_id ?? null,
      latestRun: relatedRuns[0] ?? null,
    };
  }).sort((a, b) => b.open_cases - a.open_cases);
  const operationalColumns: DataTableColumn<(typeof operationalRows)[number]>[] = [
    { key: "merchant", header: "Merchant", primary: true, cell: (row) => <span><span className="block">{row.name}</span><span className="mt-1 block font-mono text-xs font-normal text-text-secondary">{row.id}</span></span> },
    { key: "readiness", header: "Sẵn sàng thuế", cell: (row) => row.readiness == null ? "—" : <Badge tone={row.readiness >= 90 ? "success" : "warning"}>{row.readiness}%</Badge> },
    { key: "cases", header: "Case mở", align: "right", cell: (row) => row.open_cases },
    { key: "age", header: "Cũ nhất", hideOnMobile: true, cell: (row) => age(row.oldestCase) },
    { key: "rm", header: "Nhân viên phụ trách", cell: (row) => row.assignedRm ?? "Chưa gán" },
    { key: "run", header: "Run gần nhất", hideOnMobile: true, cell: (row) => row.latestRun ? <Link href={`/ops/agent-runs/${row.latestRun.id}`} className="font-mono text-xs text-secondary hover:underline">{row.latestRun.id}</Link> : "—" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="SHB merchant operations" title="Bàn điều hành danh mục" description="Giám sát danh mục merchant, can thiệp khi agent cần con người quyết định và kiểm toán toàn bộ thao tác." updatedAt="vừa xong" />

      {/* Role intro strip */}
      <div className="rounded-xl border bg-accent/30 p-5 sm:p-6">
        <p className="text-sm leading-6 text-text-secondary">
          <strong className="text-text">Vai trò của SHB:</strong> Giám sát danh mục merchant, can thiệp khi agent cần con người quyết định, và kiểm toán toàn bộ thao tác ghi dữ liệu.
        </p>
      </div>

      {/* 3 story cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Danh mục</p>
          <p className="mt-3 font-display text-3xl text-text">{summary.total}</p>
          <p className="mt-1 text-sm text-text-secondary">{summary.active} đang hoạt động</p>
          <Link href="/ops/merchants" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline">Xem danh mục<ArrowRight aria-hidden size={14} /></Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Cần can thiệp</p>
          <p className="mt-3 font-display text-3xl text-text">{summary.open_cases + waiting.length}</p>
          <p className="mt-1 text-sm text-text-secondary">{summary.open_cases} case mở · {waiting.length} run chờ duyệt</p>
          <Link href="/ops/cases" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline">Xem hàng chờ<ArrowRight aria-hidden size={14} /></Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Tuân thủ</p>
          <p className="mt-3 font-display text-3xl text-text">{averageReadiness === "—" ? averageReadiness : `${averageReadiness}%`}</p>
          <p className="mt-1 text-sm text-text-secondary">Mức sẵn sàng thuế bình quân · {scored.length}/{summary.total} đã tính</p>
          <Link href="/ops/compliance" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline">Xem tuân thủ<ArrowRight aria-hidden size={14} /></Link>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div>
          <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold text-secondary">Ưu tiên danh mục</p><h2 className="mt-1 font-display text-3xl">Merchant cần chú ý</h2></div><Link href="/ops/merchants" className="text-sm font-semibold text-secondary">Mở master-detail</Link></div>
          <DataTable caption="Danh mục merchant" columns={operationalColumns} rows={operationalRows.slice(0, 5)} getRowKey={(row) => row.id} empty={<EmptyState title="Chưa có merchant" description="Danh mục sẽ xuất hiện khi dữ liệu được đồng bộ." compact />} />
        </div>
        <Card>
          <p className="text-sm font-semibold text-warning">Hàng chờ quyết định</p>
          <h2 className="mt-2 font-display text-3xl">{waiting.length} run chờ quyết định</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">Mỗi thay đổi dữ liệu được duyệt riêng. Ops có thể mở trace, kiểm tra bằng chứng rồi mới quyết định.</p>
          <div className="mt-6 divide-y">{waiting.slice(0, 4).map((run) => <Link key={run.id} href={`/ops/agent-runs/${run.id}`} className="block py-4 first:pt-0"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs">{run.id}</span><Badge tone="warning">Chờ quyết định</Badge></div><p className="mt-2 line-clamp-2 text-sm text-text-secondary">{run.request_text}</p></Link>)}{waiting.length === 0 && <p className="text-sm text-text-secondary">Không có run chờ duyệt.</p>}</div>
        </Card>
      </section>
    </div>
  );
}

export function MerchantPortfolioView() {
  const portfolio = usePortfolio();
  const cases = useCases();
  const [selected, setSelected] = useState("");
  const selectedId = selected || portfolio.data?.merchants[0]?.id || "";
  const dashboard = useMerchantDashboard(selectedId);
  const merchant = portfolio.data?.merchants.find((item) => item.id === selectedId);
  const merchantCases = cases.data?.cases.filter((item) => item.merchant_id === selectedId) ?? [];
  const rmIds = Array.from(new Set(merchantCases.flatMap((item) => item.assigned_rm_id ? [item.assigned_rm_id] : [])));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Portfolio intelligence" title="Danh mục merchant" description="Master-detail vận hành với health score, reconciliation rate, case exposure và RM ownership từ dữ liệu backend." />
      {portfolio.isLoading && <LoadingState />}
      {portfolio.isError && <SectionError title="Không tải được merchant" error={portfolio.error} retry={() => portfolio.refetch()} />}
      {portfolio.data && (
        <section className="grid min-h-[34rem] overflow-hidden rounded-xl border bg-surface lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="border-b lg:border-b-0 lg:border-r">
            <div className="border-b bg-background px-5 py-4"><p className="text-sm font-semibold">{portfolio.data.summary.total} merchant trong danh mục</p><p className="mt-1 text-xs text-text-secondary">Chọn merchant để mở operational profile</p></div>
            <div className="max-h-[32rem] overflow-y-auto p-2">{portfolio.data.merchants.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={cn("w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent", item.id === selectedId && "bg-accent")}><span className="flex items-center justify-between gap-3"><strong className="text-sm font-semibold">{item.name}</strong><Badge tone={statusTone(item.status)}>{item.status}</Badge></span><span className="mt-1 flex items-center justify-between text-xs text-text-secondary"><span className="font-mono">{item.id}</span><span>{item.open_cases} case mở</span></span></button>)}</div>
          </div>
          <div className="p-5 sm:p-7">
            {!merchant && <EmptyState title="Chọn merchant" description="Operational profile sẽ xuất hiện tại đây." />}
            {merchant && <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-text-secondary">{merchant.id}</p><h2 className="mt-1 font-display text-3xl">{merchant.name}</h2><p className="mt-2 text-sm text-text-secondary">{merchant.business_category ?? merchant.business_type}</p></div><Badge tone={statusTone(merchant.status)}>{merchant.status}</Badge></div>{dashboard.isLoading && <LoadingState label="Đang tính merchant health" />}{dashboard.isError && <SectionError title="Không tải được merchant health" error={dashboard.error} retry={() => dashboard.refetch()} />}{dashboard.data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Điểm sức khỏe" value={`${dashboard.data.tax_readiness.score}%`} accent={dashboard.data.tax_readiness.ready ? "mist" : "mango"} /><KpiCard label="Đối soát" value={`${Math.round(dashboard.data.reconciliation_rate * 100)}%`} detail={`${dashboard.data.reconciled_count}/${dashboard.data.total_transactions} giao dịch`} /><KpiCard label="Case mở" value={merchant.open_cases} detail={`${dashboard.data.exception_count} ngoại lệ`} /><KpiCard label="Agent đang chạy" value={merchant.active_runs} /></div><dl className="grid gap-4 border-t pt-5 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Nhân viên phụ trách</dt><dd className="mt-1 font-medium">{rmIds.join(", ") || "Chưa gán"}</dd></div><div><dt className="text-text-secondary">Rule version</dt><dd className="mt-1 font-mono">{dashboard.data.tax_readiness.rule_version}</dd></div><div><dt className="text-text-secondary">Thiếu hóa đơn</dt><dd className="mt-1 font-medium">{dashboard.data.missing_invoice_count}</dd></div><div><dt className="text-text-secondary">Chưa phân loại</dt><dd className="mt-1 font-medium">{dashboard.data.unclassified_count}</dd></div></dl></>}</div>}
          </div>
        </section>
      )}
    </div>
  );
}

export function CasesView() {
  const cases = useCases();
  const [selected, setSelected] = useState("");
  const selectedId = selected || cases.data?.cases[0]?.id || "";
  return <div className="space-y-8"><PageHeader eyebrow="Human intervention" title="Cases" description="Queue và detail đồng bộ cho triage, evidence review, merchant confirmation draft và RM assignment." />{cases.isLoading && <LoadingState />}{cases.isError && <SectionError title="Không tải được cases" error={cases.error} retry={() => cases.refetch()} />}{cases.data && cases.data.cases.length === 0 && <EmptyState title="Không có case" description="Các ngoại lệ cần can thiệp sẽ xuất hiện tại đây." />}{cases.data && cases.data.cases.length > 0 && <section className="grid gap-6 xl:grid-cols-[minmax(20rem,.7fr)_minmax(0,1.3fr)]"><div className="space-y-2">{cases.data.cases.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={cn("w-full rounded-xl border bg-surface p-4 text-left transition-colors hover:bg-accent", item.id === selectedId && "border-secondary bg-accent")}><span className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-semibold">{item.id}</span><Badge tone={statusTone(item.status)}>{item.status}</Badge></span><span className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary"><span>Merchant <strong className="text-text">{item.merchant_id}</strong></span><span>Priority <strong className="text-text">{item.priority}</strong></span><span>{item.exception_count} ngoại lệ</span><span>{age(item.created_at)}</span></span></button>)}</div><CaseWorkspace caseId={selectedId} compact /></section>}</div>;
}

function suggestionValue(suggestion: Record<string, unknown> | null, key: string) {
  const value = suggestion?.[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

const classifications = new Set(["internal_transfer", "revenue", "loan", "deposit", "refund", "other"]);

function CaseWorkspace({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  const detail = useCaseDetail(caseId);
  const assignment = useAssignCase(caseId);
  const draft = useDraftCaseMessage(caseId);
  const resolution = useResolveCaseException(caseId);
  const [rmId, setRmId] = useState("U003");
  if (detail.isLoading) return <LoadingState label="Đang tải case" />;
  if (detail.isError) return <SectionError title="Không tải được case" error={detail.error} retry={() => detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Không tìm thấy case" description="Case có thể đã được đóng hoặc không còn trong danh mục." />;
  const item = detail.data;
  const pending = item.exceptions.find((exception) => !["RESOLVED", "CLOSED"].includes(exception.status));
  const proposedClassification = pending ? suggestionValue(pending.ai_suggestion, "classification") : null;
  const safeClassification = typeof proposedClassification === "string" && classifications.has(proposedClassification) ? proposedClassification : null;
  const totalAmount = item.exceptions.reduce((sum, exception) => sum + Number(suggestionValue(exception.ai_suggestion, "amount") ?? 0), 0);
  const confidenceValues = item.exceptions.flatMap((exception) => {
    const value = Number(suggestionValue(exception.ai_suggestion, "confidence"));
    return Number.isFinite(value) && value > 0 ? [value] : [];
  });
  const confidence = confidenceValues.length ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100) : null;

  return (
    <div className={cn("space-y-6", !compact && "space-y-8")}>
      {!compact && <PageHeader eyebrow="Case workspace" title={item.id} description={`Merchant ${item.merchant_id} · kỳ ${item.period}`} actions={<Badge tone={statusTone(item.status)}>{item.status}</Badge>} />}
      {compact && <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-text-secondary">{item.id}</p><h2 className="mt-1 font-display text-3xl">Case detail</h2></div><Link href={`/ops/cases/${item.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">Mở toàn trang<ArrowRight size={15} /></Link></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Priority" value={item.priority} /><KpiCard label="Amount evidence" value={totalAmount ? money(totalAmount) : "—"} /><KpiCard label="Confidence" value={confidence == null ? "—" : `${confidence}%`} /><KpiCard label="Case age" value={age(item.created_at)} /></section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-text-secondary">Ngoại lệ liên kết</p><h3 className="mt-2 font-display text-2xl">{item.exception_count} điểm cần làm rõ</h3></div><FileClock aria-hidden className="text-secondary" size={24} /></div><div className="mt-5 divide-y">{item.exceptions.map((exception) => <div key={exception.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-text">{exception.exception_type}</span><Badge tone={statusTone(exception.status)}>{exception.status}</Badge></div><dl className="mt-3 grid gap-3 text-xs text-text-secondary sm:grid-cols-2"><div><dt>Bank transaction</dt><dd className="mt-1 font-mono text-text">{exception.bank_transaction_id ?? "—"}</dd></div><div><dt>Sale</dt><dd className="mt-1 font-mono text-text">{exception.sale_id ?? "—"}</dd></div><div><dt>AI suggestion</dt><dd className="mt-1 text-text">{String(suggestionValue(exception.ai_suggestion, "reason") ?? suggestionValue(exception.ai_suggestion, "classification") ?? "Không có")}</dd></div><div><dt>Human decision</dt><dd className="mt-1 text-text">{exception.human_decision ?? "Chưa có"}</dd></div></dl></div>)}</div></Card>
          <Card><p className="text-sm font-semibold text-text-secondary">Lịch sử agent action</p><div className="mt-4 divide-y">{item.actions.map((action) => <div key={action.id} className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><div><p className="font-semibold text-text">{action.action_type}</p><p className="mt-1 text-sm text-text-secondary">{action.human_summary}</p></div><Badge tone={statusTone(action.status)}>{action.status}</Badge></div>)}{item.actions.length === 0 && <p className="text-sm text-text-secondary">Chưa có agent action cho case này.</p>}</div></Card>
          {draft.data && <Card variant="information"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Merchant confirmation draft</h3><Badge tone="info">{draft.data.status}</Badge></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{draft.data.message}</p></Card>}
        </div>
        <Card className="h-fit">
          <UserRoundCheck aria-hidden className="text-secondary" size={22} />
          <h3 className="mt-4 font-display text-2xl">Decision controls</h3>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-text-secondary">Status</dt><dd className="mt-1"><Badge tone={statusTone(item.status)}>{item.status}</Badge></dd></div><div><dt className="text-text-secondary">RM hiện tại</dt><dd className="mt-1 font-medium">{item.assigned_rm_id ?? "Chưa gán"}</dd></div><div><dt className="text-text-secondary">Tax rule</dt><dd className="mt-1 font-mono">{item.tax_rule_version ?? "—"}</dd></div></dl>
          <div className="mt-6 space-y-3">
            <Button className="w-full" disabled={!pending || resolution.isPending} onClick={() => pending && resolution.mutate({ exceptionId: pending.id, saleId: pending.sale_id, classification: safeClassification })}>{resolution.isPending ? "Đang ghi quyết định" : "Phê duyệt đề xuất"}</Button>
            <Button variant="outline" className="w-full" disabled={item.exceptions.length === 0 || draft.isPending} onClick={() => draft.mutate(item.exceptions.map((exception) => exception.id))}>{draft.isPending ? "Đang tạo bản nháp" : "Soạn yêu cầu merchant xác nhận"}</Button>
          </div>
          <div className="mt-6 border-t pt-5"><label className="block text-sm font-semibold" htmlFor={`rm-${caseId}`}>Mã RM</label><input id={`rm-${caseId}`} value={rmId} onChange={(event) => setRmId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border bg-surface px-3 font-mono text-sm text-text" /><Button variant="secondary" className="mt-3 w-full" disabled={!rmId.trim() || assignment.isPending} onClick={() => assignment.mutate(rmId.trim())}>{assignment.isPending ? "Đang phân công" : "Gán case cho RM"}</Button></div>
          {(assignment.isError || resolution.isError || draft.isError) && <p role="alert" className="mt-3 text-sm text-danger">{assignment.error?.message ?? resolution.error?.message ?? draft.error?.message}</p>}
          {(assignment.isSuccess || resolution.isSuccess) && <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-success"><CheckCircle2 size={16} />Đã cập nhật case</p>}
        </Card>
      </section>
    </div>
  );
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  return <CaseWorkspace caseId={caseId} />;
}

export function AgentRunsView() {
  const runs = useAgentRuns();
  return <div className="space-y-8"><PageHeader eyebrow="Execution control" title="Agent runs" description="Theo dõi kế hoạch, workflow stage, approval boundary và technical evidence mà không hiển thị private reasoning." />{runs.isLoading && <LoadingState />}{runs.isError && <SectionError title="Không tải được agent runs" error={runs.error} retry={() => runs.refetch()} />}{runs.data && <><section className="grid gap-4 sm:grid-cols-3"><KpiCard label="Tổng run gần đây" value={runs.data.length} accent="mist" /><KpiCard label="Đang thực thi" value={runs.data.filter((run) => ["PLANNING", "EXECUTING"].includes(run.status)).length} /><KpiCard label="Chờ con người" value={runs.data.filter((run) => run.status === "WAITING_FOR_HUMAN").length} accent="mango" /></section><DataTable caption="Agent runs" columns={runColumns} rows={runs.data} getRowKey={(row) => row.id} empty={<EmptyState title="Chưa có agent run" description="Run sẽ xuất hiện khi merchant gửi yêu cầu cho trợ lý." />} /></>}</div>;
}

export function AgentRunDetailView({ runId }: { runId: string }) {
  const run = useAgentRun(runId);
  const trace = useAgentRunTrace(runId);
  if (run.isLoading || trace.isLoading) return <LoadingState label="Đang tải workflow trace" />;
  if (run.isError) return <SectionError title="Không tải được agent run" error={run.error} retry={() => run.refetch()} />;
  if (trace.isError) return <SectionError title="Không tải được technical trace" error={trace.error} retry={() => trace.refetch()} />;
  if (!run.data || !trace.data) return <EmptyState title="Không tìm thấy run" description="Run không tồn tại hoặc không thuộc phạm vi truy cập." />;
  const item = run.data;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent run detail" title={item.id} description={item.request_text} actions={<Badge tone={statusTone(item.status)}>{item.status}</Badge>} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Merchant" value={item.merchant_id} /><KpiCard label="Duration" value={duration(item.started_at, item.completed_at)} /><KpiCard label="Tool calls" value={trace.data.tool_calls.length} /><KpiCard label="Approval actions" value={trace.data.actions.length} accent={trace.data.actions.some((action) => action.status === "PROPOSED") ? "mango" : "default"} /></section>
      <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-6">
          <Card><div className="flex items-center gap-3"><Workflow className="text-secondary" size={22} /><h2 className="font-display text-2xl">Execution plan</h2></div><ol className="mt-5 space-y-4">{trace.data.plan.map((step, index) => <li key={`${step.step ?? index}-${step.action}`} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-secondary">{step.step ?? index + 1}</span><div><p className="font-medium">{step.action ?? "Workflow step"}</p><p className="mt-1 font-mono text-xs text-text-secondary">{step.agent ?? "workflow"}</p></div></li>)}{trace.data.plan.length === 0 && <li className="text-sm text-text-secondary">Run chưa ghi plan steps.</li>}</ol></Card>
          <Card><h2 className="font-display text-2xl">Run metadata</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-text-secondary">Started</dt><dd className="mt-1">{when(item.started_at)}</dd></div><div><dt className="text-text-secondary">Completed</dt><dd className="mt-1">{when(item.completed_at)}</dd></div><div><dt className="text-text-secondary">Related case</dt><dd className="mt-1">{item.case_id ? <Link href={`/ops/cases/${item.case_id}`} className="font-mono text-secondary hover:underline">{item.case_id}</Link> : "—"}</dd></div><div><dt className="text-text-secondary">Period</dt><dd className="mt-1 font-mono">{item.plan?.period ?? "—"}</dd></div></dl></Card>
        </div>
        <Card><div className="flex items-center gap-3"><Clock3 className="text-secondary" size={22} /><h2 className="font-display text-2xl">Workflow timeline</h2></div><div className="relative mt-6 space-y-0 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-border">{trace.data.progress.map((event, index) => <div key={`${event.agent}-${event.stage}-${index}`} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-4 border-surface bg-secondary" /><div><div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(event.stage)}>{event.stage}</Badge><span className="font-mono text-xs text-text-secondary">{event.agent}</span></div><p className="mt-2 text-sm leading-6 text-text-secondary">{event.summary}</p></div></div>)}{trace.data.tool_calls.map((call, index) => <div key={`${call.tool_name}-${call.called_at}-${index}`} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-4 border-surface bg-mango" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{call.tool_name}</span><Badge tone="neutral">{call.agent_name}</Badge></div><p className="mt-2 text-xs text-text-secondary">{when(call.called_at)} · {call.duration_ms ?? 0} ms · confidence {call.confidence == null ? "—" : `${Math.round(call.confidence * 100)}%`}</p><p className="mt-2 break-all font-mono text-[11px] text-text-tertiary">input {call.input_hash ?? "—"} · output {call.output_hash ?? "—"}</p></div></div>)}{trace.data.progress.length === 0 && trace.data.tool_calls.length === 0 && <p className="text-sm text-text-secondary">Run chưa ghi trace events.</p>}</div></Card>
      </section>
      <Card><h2 className="font-display text-2xl">Approval state</h2><div className="mt-5 divide-y">{trace.data.actions.map((action) => <div key={action.id} className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><div><p className="font-semibold">{action.human_summary}</p><p className="mt-1 font-mono text-xs text-text-secondary">{action.tool_name} · payload {action.payload_hash.slice(0, 12)}</p></div><Badge tone={statusTone(action.status)}>{action.status}</Badge></div>)}{trace.data.actions.length === 0 && <p className="text-sm text-text-secondary">Run không có write action cần phê duyệt.</p>}</div></Card>
    </div>
  );
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadAudit(events: AuditEvent[], format: "json" | "csv") {
  const content = format === "json"
    ? JSON.stringify({ events }, null, 2)
    : [Object.keys(events[0] ?? {}).map(csvCell).join(","), ...events.map((event) => Object.values(event).map(csvCell).join(","))].join("\n");
  const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `taxlens-audit-filtered.${format}`;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function AuditView() {
  const audit = useAuditEvents();
  const [merchant, setMerchant] = useState("");
  const [agent, setAgent] = useState("");
  const [tool, setTool] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const events = audit.data?.events ?? [];
  const merchants = Array.from(new Set(events.flatMap((event) => event.merchant_id ? [event.merchant_id] : []))).sort();
  const agents = Array.from(new Set(events.flatMap((event) => event.agent_name ? [event.agent_name] : []))).sort();
  const tools = Array.from(new Set(events.flatMap((event) => event.tool_name ? [event.tool_name] : []))).sort();
  const filtered = events.filter((event) => {
    const day = event.timestamp?.slice(0, 10) ?? "";
    return (!merchant || event.merchant_id === merchant) && (!agent || event.agent_name === agent) && (!tool || event.tool_name === tool) && (!from || day >= from) && (!to || day <= to);
  });

  return <div className="space-y-8"><PageHeader eyebrow="Immutable evidence" title="Truy vết & kiểm toán" description="Lọc chính xác trên dữ liệu audit thật và xuất đúng tập kết quả đang hiển thị." actions={<><Button variant="outline" disabled={!filtered.length} onClick={() => downloadAudit(filtered, "json")}><FileJson2 aria-hidden size={16} />Xuất JSON</Button><Button variant="outline" disabled={!filtered.length} onClick={() => downloadAudit(filtered, "csv")}><Download aria-hidden size={16} />Xuất CSV</Button></>} />{audit.isLoading && <LoadingState />}{audit.isError && <SectionError title="Không tải được audit" error={audit.error} retry={() => audit.refetch()} />}{audit.data && <><FilterBar summary={<span className="text-xs text-text-secondary">{filtered.length}/{events.length} events</span>}><Select label="Merchant" value={merchant} onChange={(event) => setMerchant(event.target.value)}><option value="">Tất cả merchant</option>{merchants.map((value) => <option key={value} value={value}>{value}</option>)}</Select><Select label="Agent" value={agent} onChange={(event) => setAgent(event.target.value)}><option value="">Tất cả agent</option>{agents.map((value) => <option key={value} value={value}>{value}</option>)}</Select><Select label="Tool" value={tool} onChange={(event) => setTool(event.target.value)}><option value="">Tất cả tool</option>{tools.map((value) => <option key={value} value={value}>{value}</option>)}</Select><Field label="Từ ngày" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><Field label="Đến ngày" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></FilterBar><p role="status" className="text-sm text-text-secondary">Hiển thị {filtered.length}/{events.length} audit events. Export áp dụng toàn bộ bộ lọc hiện tại.</p><DataTable caption="Audit trail" columns={auditColumns} rows={filtered} getRowKey={(row) => row.id} empty={<EmptyState title="Không có audit event phù hợp" description="Điều chỉnh bộ lọc để mở rộng kết quả." />} /></>}</div>;
}

export function ComplianceView() {
  const rules = useComplianceRules();
  return <div className="space-y-8"><PageHeader eyebrow="Deterministic governance" title="Tuân thủ" description="Rule versions, effective periods, legal sources và approval ownership từ kho quy tắc backend." />{rules.isLoading && <LoadingState />}{rules.isError && <SectionError title="Không tải được tax rules" error={rules.error} retry={() => rules.refetch()} />}{rules.data && <><Card variant="information" className="flex items-start gap-4"><ShieldCheck aria-hidden className="mt-1 shrink-0 text-secondary" size={22} /><div><h2 className="font-display text-2xl">Rule engine là nguồn quyết định</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Agent chỉ truy xuất và giải thích rule đã duyệt. Công thức, version và nguồn pháp lý không do mô hình tự tạo.</p><p className="mt-3 text-xs font-semibold text-secondary">{rules.data.rules.length} rule versions · {rules.data.rules.filter((rule) => rule.approval_status === "APPROVED").length} đã duyệt</p></div></Card><DataTable caption="Phiên bản tax rule" columns={ruleColumns} rows={rules.data.rules} getRowKey={(row) => row.version} empty={<EmptyState title="Chưa có rule version" description="Cần seed rule đã duyệt trước khi đánh giá readiness." />} /></>}</div>;
}
