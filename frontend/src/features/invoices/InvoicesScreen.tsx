"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, FileCheck2, ReceiptText } from "lucide-react";
import { Button, Card, Dialog, EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusPill, ToastProvider, useToast } from "@/components/ui";
import { useInvoices, useLinkInvoice, useMarkInvoiceIssuedElsewhere } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import type { InvoiceCoverageStatus } from "@/lib/api/invoices";
import { cn } from "@/lib/utils";
import { RecordRelationshipChain } from "@/components/domain/RecordRelationshipChain";
import { formatDateTime, formatMoney } from "@/features/ledger/format";

const tabs: Array<[InvoiceCoverageStatus | "sync", string]> = [["missing", "Cần xử lý"], ["linked", "Đã khớp"], ["sync", "Chờ đồng bộ"], ["all", "Tất cả"]];

export function InvoicesScreen() { return <ToastProvider><InvoicesWorkspace /></ToastProvider>; }

function InvoicesWorkspace() {
  const { toast } = useToast();
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "";
  const { period, periodLabel } = useReportingPeriod();
  const [status, setStatus] = useState<InvoiceCoverageStatus | "sync">("all");
  const query = useInvoices(merchantId || undefined, period, status === "sync" ? "all" : status);
  const linkMutation = useLinkInvoice(merchantId, period);
  const issuedMutation = useMarkInvoiceIssuedElsewhere(merchantId, period);
  const [selectedId, setSelectedId] = useState<string>();
  const [dialog, setDialog] = useState<"link" | "external" | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [source, setSource] = useState("MISA");

  if (session.isPending || query.isPending) return <LoadingState label="Đang kiểm tra độ phủ hóa đơn" />;
  if (session.isError || query.isError || !merchantId) return <ErrorState title="Chưa thể tải hóa đơn" description="TaxLens chưa thay đổi bất kỳ liên kết nào. Vui lòng thử lại." retry={() => { void session.refetch(); void query.refetch(); }} />;
  const allRecords = query.data.items ?? query.data.records;
  const records = status === "sync" ? allRecords.filter((record) => record.readiness_blocker && !record.provider) : allRecords;
  const selected = records.find((record) => record.sale_id === selectedId) ?? records[0];

  async function submitLink() {
    if (!selected || !invoiceId.trim()) return;
    try { await linkMutation.mutateAsync({ saleId: selected.sale_id, invoiceId: invoiceId.trim() }); setDialog(null); setInvoiceId(""); toast({ title: "Đã liên kết hóa đơn", description: "Độ phủ và readiness đã được tính lại.", tone: "success" }); }
    catch (error) { toast({ title: "Chưa thể liên kết", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" }); }
  }
  async function submitExternal() {
    if (!selected || !invoiceNumber.trim()) return;
    try { await issuedMutation.mutateAsync({ saleId: selected.sale_id, invoiceNumber: invoiceNumber.trim(), source: source.trim() || "EXTERNAL" }); setDialog(null); setInvoiceNumber(""); toast({ title: "Đã ghi nhận bằng chứng", description: "TaxLens chỉ lưu trạng thái đã xuất bên ngoài, không phát hành hóa đơn.", tone: "success" }); }
    catch (error) { toast({ title: "Chưa thể ghi nhận", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" }); }
  }

  return (
    <div className="space-y-7 animate-[route-in_240ms_ease-out]">
      <PageHeader eyebrow="Độ phủ chứng từ" period={periodLabel} title="Hóa đơn" description="Nối đơn đã thanh toán với hóa đơn có thật. TaxLens không thay thế hệ thống phát hành hóa đơn." />

      {/* Expandable context */}
      <details className="rounded-xl border bg-surface p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-text-secondary">
          <ChevronDown aria-hidden size={16} className="transition-transform" />
          Tại sao cần hóa đơn?
        </summary>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Mỗi đơn đã thanh toán cần hóa đơn để bộ xuất thuế đạt điều kiện. TaxLens không phát hành hóa đơn — chỉ liên kết bằng chứng từ hệ thống bạn đã dùng (MISA, VNPT, v.v.).
        </p>
      </details>

      {/* Progress bar */}
      <div className="flex items-center gap-4 rounded-xl border bg-surface px-5 py-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text">{Math.max(0, (query.data.total ?? allRecords.length) - query.data.missing_count)}/{query.data.total ?? allRecords.length} đơn đã có hóa đơn</span>
            <span className="text-text-secondary">{query.data.total ? Math.round(((query.data.total - query.data.missing_count) / query.data.total) * 100) : 0}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-secondary transition-all" style={{ width: `${query.data.total ? Math.round(((query.data.total - query.data.missing_count) / query.data.total) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {query.data.missing_count > 0 ? <Card className="grid gap-4 border-danger/25 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="grid size-11 place-items-center rounded-full bg-danger/10 text-danger"><ReceiptText aria-hidden size={20} /></span><div><p className="font-display text-2xl">Còn {query.data.missing_count} đơn thiếu hóa đơn</p><p className="mt-1 text-sm text-text-secondary">Mỗi khoảng trống là một blocker trực tiếp của bộ xuất thuế. {Math.max(0, (query.data.total ?? allRecords.length) - query.data.missing_count)}/{query.data.total ?? allRecords.length} đơn đã có hóa đơn hợp lệ.</p></div><Link href={`/invoices?period=${period}&status=missing`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white hover:opacity-90">Xử lý {query.data.missing_count} đơn</Link></Card> : <Card className="flex items-center gap-4 border-success/25"><span className="grid size-11 place-items-center rounded-full bg-success/10 text-success"><FileCheck2 aria-hidden size={20} /></span><div><p className="font-display text-2xl">Độ phủ hóa đơn đã hoàn tất</p><p className="mt-1 text-sm text-text-secondary">Mọi đơn đã thanh toán đều có bằng chứng chứng từ.</p></div></Card>}
      <div role="tablist" aria-label="Lọc hóa đơn" className="flex flex-wrap gap-2">{tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setSelectedId(undefined); }} className={cn("min-h-11 rounded-lg border bg-surface px-4 text-sm font-semibold text-text-secondary hover:border-secondary", status === value && "border-secondary bg-secondary text-white")}>{label}{value === "missing" && query.data.missing_count > 0 ? ` (${query.data.missing_count})` : ""}</button>)}</div>
      {records.length === 0 ? <EmptyState title="Không có hồ sơ trong bộ lọc này" description="Đổi bộ lọc để xem các đơn hàng và hóa đơn liên quan." /> : <section className="grid gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(30rem,1.28fr)]">
        <Card className="p-0"><div className="border-b p-5"><h2 className="text-sm font-semibold">Đơn đã thanh toán</h2><p className="mt-1 text-xs text-text-secondary">{query.data.total ?? records.length} hồ sơ trong kỳ</p></div><div className="max-h-[42rem] divide-y overflow-y-auto">{records.map((record) => <button key={record.sale_id} type="button" onClick={() => setSelectedId(record.sale_id)} aria-pressed={selected?.sale_id === record.sale_id} className={cn("grid w-full grid-cols-[1fr_auto] gap-3 p-5 text-left hover:bg-background", selected?.sale_id === record.sale_id && "bg-accent/60")}><span><strong className="font-mono block text-sm">{record.sale_id}</strong><span className="mt-1 block text-xs text-text-secondary">{formatDateTime(record.created_at)}</span><span className="mt-3 block"><StatusPill status={record.readiness_blocker ? "Thiếu hóa đơn" : "Đạt"} /></span></span><strong className="font-mono text-sm">{formatMoney(record.amount)}</strong></button>)}</div></Card>
        {selected && <Card variant="workspace" className="p-0"><div className="border-b p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Quan hệ đơn hàng · thanh toán · hóa đơn</p><h2 className="font-mono mt-3 text-2xl">{selected.sale_id}</h2><p className="font-display mt-2 text-3xl">{formatMoney(selected.amount)}</p></div><StatusPill status={selected.readiness_blocker ? "Thiếu hóa đơn" : "Đạt"} /></div></div><div className="space-y-6 p-5 sm:p-7">
          <RecordRelationshipChain order={{ id: selected.sale_id, amount: selected.amount }} payment={{ id: selected.sale_id, amount: selected.amount }} invoice={selected.invoice_number || selected.invoice_id ? { id: selected.invoice_number ?? selected.invoice_id ?? "invoice", amount: selected.amount } : null} />
          <div className="rounded-xl border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Trạng thái đồng bộ</p><p className="mt-2 text-sm">{selected.provider ? `Đã nhận từ ${selected.provider}` : "Chưa có dữ liệu nhà cung cấp"}</p></div>
          {!selected.readiness_blocker ? <div className="rounded-xl border bg-background p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Bằng chứng hóa đơn</p><dl className="mt-4 grid gap-4 sm:grid-cols-3"><Fact label="Số hóa đơn" value={selected.invoice_number ?? selected.invoice_id ?? "-"} /><Fact label="Nhà cung cấp" value={selected.provider ?? "Không rõ"} /><Fact label="Ngày phát hành" value={formatDateTime(selected.issued_at)} /></dl></div> : <div className="rounded-xl border border-warning/30 bg-warning/5 p-5"><h3 className="text-sm font-semibold">Cần bổ sung bằng chứng</h3><p className="mt-2 text-sm leading-6 text-text-secondary">Liên kết một hóa đơn đã đồng bộ bằng ID, hoặc ghi nhận số hóa đơn đã phát hành ở hệ thống khác.</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => setDialog("link")}>Nhập ID hóa đơn từ MISA/VNPT</Button><Button variant="outline" onClick={() => setDialog("external")}>Ghi nhận đã xuất ở hệ thống khác</Button></div></div>}
        </div></Card>}
      </section>}
      <Dialog open={dialog === "link"} onOpenChange={(open) => !open && setDialog(null)} title="Liên kết hóa đơn đã có" description="Nhập ID hóa đơn đã đồng bộ từ nhà cung cấp." footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Hủy</Button><Button disabled={!invoiceId.trim() || linkMutation.isPending} onClick={() => void submitLink()}>{linkMutation.isPending ? "Đang lưu..." : "Liên kết"}</Button></>}><Field autoFocus label="ID hóa đơn" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} placeholder="Ví dụ: INV-00029" required /></Dialog>
      <Dialog open={dialog === "external"} onOpenChange={(open) => !open && setDialog(null)} title="Ghi nhận đã xuất ở nơi khác" description="TaxLens lưu bằng chứng, không phát hành hoặc gửi hóa đơn thay bạn." footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Hủy</Button><Button disabled={!invoiceNumber.trim() || issuedMutation.isPending} onClick={() => void submitExternal()}>{issuedMutation.isPending ? "Đang lưu..." : "Ghi nhận"}</Button></>}><div className="grid gap-4"><Field label="Số hóa đơn" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} required /><Field label="Nhà cung cấp" value={source} onChange={(event) => setSource(event.target.value)} hint="Ví dụ: MISA, VNPT, Viettel" /></div></Dialog>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>; }
