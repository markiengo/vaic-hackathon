"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, StatusPill, ToastProvider, useToast } from "@/components/ui";
import { useExceptions, useResolveException } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { cn } from "@/lib/utils";
import { formatConfidence, formatMoney } from "@/features/ledger/format";

const choices = [
  ["revenue", "Doanh thu", "Khoản thanh toán cho dịch vụ hoặc đơn hàng"],
  ["internal_transfer", "Chuyển khoản nội bộ", "Dòng tiền giữa các tài khoản của chủ cửa hàng"],
  ["loan", "Khoản vay", "Tiền vay hoặc hoàn trả khoản vay"],
  ["deposit", "Tiền đặt cọc", "Khoản nhận trước chưa ghi nhận đủ doanh thu"],
  ["refund", "Hoàn tiền", "Khoản hoàn trả cho khách hoặc từ nhà cung cấp"],
  ["other", "Khác", "Không thuộc các nhóm trên"],
] as const;

export function ExceptionsScreen() {
  return <ToastProvider><ExceptionsWorkspace /></ToastProvider>;
}

function ExceptionsWorkspace() {
  const { toast } = useToast();
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "";
  const { period, periodLabel } = useReportingPeriod();
  const queue = useExceptions(merchantId || undefined, period);
  const resolution = useResolveException(merchantId, period);
  const [selectedId, setSelectedId] = useState<number>();
  const [classification, setClassification] = useState<(typeof choices)[number][0]>();

  if (session.isPending || queue.isPending) return <LoadingState label="Đang chuẩn bị bằng chứng ngoại lệ" />;
  if (session.isError || queue.isError || !merchantId) return <ErrorState title="Chưa thể mở hàng chờ" description="Không có quyết định nào được ghi khi dữ liệu chưa tải thành công." retry={() => { void session.refetch(); void queue.refetch(); }} />;

  const selected = queue.data.find((item) => item.id === selectedId) ?? queue.data[0];
  if (!selected) {
    return <div className="space-y-7"><PageHeader eyebrow="Ngoại lệ cần phán đoán" period={periodLabel} title="Cần xác nhận" description="TaxLens giữ lại mọi trường hợp chưa đủ chắc chắn để bạn là người quyết định cuối cùng." /><EmptyState title="Đã xử lý xong hàng chờ" description={`Không còn ngoại lệ chưa giải quyết trong ${periodLabel.toLocaleLowerCase("vi")}. Readiness đã được tính lại từ dữ liệu đã lưu.`} action={<Link href={`/tax-readiness?period=${period}`} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">Xem sẵn sàng thuế<ArrowRight aria-hidden size={16} /></Link>} /></div>;
  }

  async function confirm() {
    if (!classification) return;
    try {
      await resolution.mutateAsync({ exceptionId: selected.id, decision: "approved", classification, sale_id: selected.sale_id });
      setClassification(undefined);
      setSelectedId(undefined);
      toast({ title: "Đã lưu quyết định", description: "Ledger và readiness đã được tính lại từ dữ liệu persisted.", tone: "success" });
    } catch (error) {
      toast({ title: "Chưa thể lưu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" });
    }
  }

  return (
    <div className="space-y-7 animate-[route-in_240ms_ease-out]">
      <PageHeader eyebrow="Ngoại lệ cần phán đoán" period={periodLabel} title="Cần xác nhận" description="Mỗi mục gồm dữ liệu gốc, đề xuất và lý do. TaxLens chỉ ghi quyết định sau khi bạn xác nhận." actions={<StatusPill status="Cần xác nhận" />} />

      {/* Context banner */}
      <div className="rounded-xl border border-secondary/20 bg-accent/30 p-5">
        <p className="text-sm leading-6 text-ink">
          TaxLens đã tự động xử lý các giao dịch đủ chắc chắn. Đây là <strong>{queue.data.length} mục</strong> không đủ bằng chứng để tự quyết — bạn là người quyết định cuối cùng.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between rounded-xl border bg-surface px-5 py-4"><div><p className="text-[13px] font-medium text-text-tertiary">Tiến độ hàng chờ</p><p className="mt-1 text-sm"><strong>{queue.data.length}</strong> mục còn lại</p></div><div className="h-2 w-32 overflow-hidden rounded-full bg-border"><div className="h-full bg-secondary" style={{ width: `${Math.max(10, 100 - queue.data.length * 16)}%` }} /></div></div>
      <section className="grid gap-5 xl:grid-cols-[minmax(16rem,0.58fr)_minmax(32rem,1.42fr)]">
        <Card className="p-0"><div className="border-b px-5 py-4"><h2 className="text-sm font-semibold">Hàng chờ</h2><p className="mt-1 text-xs text-text-secondary">Chọn một mục để xem bằng chứng</p></div><div className="max-h-[46rem] divide-y overflow-y-auto">{queue.data.map((item, index) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setClassification(undefined); }} aria-pressed={selected.id === item.id} className={cn("grid w-full grid-cols-[auto_1fr] gap-3 p-4 text-left hover:bg-background", selected.id === item.id && "bg-accent/60")}><span className="font-mono grid size-7 place-items-center rounded-full border text-xs">{index + 1}</span><span className="min-w-0"><strong className="block truncate text-sm">{item.sender_name ?? "Người gửi chưa rõ"}</strong><span className="mt-1 block truncate text-xs text-text-secondary">{formatMoney(item.amount)} · {item.raw_note ?? "Không nội dung"}</span></span></button>)}</div></Card>
        <Card variant="workspace" className="p-0">
          <div className="border-b p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[13px] font-medium text-text-tertiary">Ngoại lệ #{selected.id}</p><h2 className="font-display mt-2 text-3xl text-ink">{selected.sender_name ?? "Người gửi chưa rõ"}</h2><p className="font-mono mt-2 text-2xl">{formatMoney(selected.amount)}</p></div><StatusPill status="Cần xác nhận" /></div></div>
          <div className="space-y-7 p-5 sm:p-7">
            <div className="rounded-xl border bg-background p-5"><p className="text-[13px] font-medium text-text-tertiary">Nội dung ngân hàng</p><blockquote className="font-display mt-3 text-2xl text-ink">“{selected.raw_note ?? "Không có nội dung"}”</blockquote></div>
            {selected.ai_suggestion && <div className="flex gap-3 rounded-xl border border-secondary/20 bg-accent p-5"><Sparkles aria-hidden className="mt-0.5 shrink-0 text-secondary" size={20} /><div><p className="text-sm font-semibold">TaxLens đề xuất: {selected.ai_suggestion.suggested_type ?? "Chưa có phân loại"}</p><p className="mt-1 text-xs text-text-secondary">Độ tin cậy {formatConfidence(selected.ai_suggestion.confidence)}</p><ul className="mt-3 space-y-1 text-sm text-text-secondary">{(selected.ai_suggestion.reasoning ?? (selected.ai_suggestion.reason ? [selected.ai_suggestion.reason] : ["Chưa có lý do chi tiết."])).map((reason) => <li key={reason}>• {reason}</li>)}</ul></div></div>}
            <fieldset><legend className="font-display text-2xl text-ink">Khoản tiền này là gì?</legend><p className="mt-2 text-sm text-text-secondary">Chọn một phân loại. Quyết định chưa được lưu cho đến khi bạn bấm xác nhận.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{choices.map(([value, label, detail]) => { const isSuggested = selected.ai_suggestion?.suggested_type === value; return <button key={value} type="button" onClick={() => setClassification(value)} aria-pressed={classification === value} className={cn("relative min-h-24 rounded-xl border p-4 text-left hover:border-primary", classification === value && "border-primary bg-primary-soft", isSuggested && !classification && "border-primary/40 bg-primary-soft/50")}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{detail}</span>{isSuggested && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"><Sparkles aria-hidden size={10} />Đề xuất</span>}{classification === value && <Check aria-hidden className="absolute right-3 top-3 text-primary" size={18} />}</button>; })}</div></fieldset>
            <div className="flex flex-wrap justify-end gap-3 border-t pt-5"><Button variant="ghost" onClick={() => setClassification(undefined)} disabled={!classification}>Để sau</Button><Link href="/assistant" className="inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold text-text-secondary hover:bg-background">Nhờ SHB hỗ trợ</Link><Button onClick={() => void confirm()} disabled={!classification || resolution.isPending}>{resolution.isPending ? "Đang lưu..." : "Xác nhận lựa chọn"}</Button></div>
          </div>
        </Card>
      </section>
    </div>
  );
}
