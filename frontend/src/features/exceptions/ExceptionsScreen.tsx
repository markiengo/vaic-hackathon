"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ToastProvider,
  useToast,
} from "@/components/ui";
import { useExceptions, useResolveException } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { cn } from "@/lib/utils";
import { vi } from "@/lib/i18n/vi";
import {
  formatConfidence,
  formatMoney,
  formatTimeFirst,
  humanize,
  sourceLabel,
} from "@/features/ledger/format";
import type { ReconciliationException } from "@/lib/domain/types";
import { createSupportRequest } from "@/lib/api/agentops";

const CLASSIFICATION_CHOICES = [
  { value: "revenue", label: "Doanh thu dịch vụ", description: "Khoản thu từ khách hàng" },
  { value: "internal_transfer", label: "Chuyển nội bộ", description: "Tiền chuyển giữa các tài khoản của cửa hàng" },
  { value: "loan", label: "Khoản vay hoặc góp vốn", description: "Không phải doanh thu" },
  { value: "refund", label: "Chi phí được hoàn lại", description: "Khoản hoàn từ nhân viên hoặc đối tác" },
  { value: "other", label: "Chưa xác định", description: "Để lại và nhờ SHB hỗ trợ" },
] as const;

type ClassificationValue = (typeof CLASSIFICATION_CHOICES)[number]["value"];

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
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [classification, setClassification] = useState<ClassificationValue | undefined>();
  const [escalating, setEscalating] = useState(false);

  const pendingItems = useMemo(
    () => (queue.data ?? []).filter((item) => item.status === "PENDING"),
    [queue.data],
  );

  const selectedIndex = useMemo(
    () => pendingItems.findIndex((item) => item.id === selectedId),
    [pendingItems, selectedId],
  );

  const selected = useMemo(() => {
    if (selectedIndex >= 0) return pendingItems[selectedIndex];
    return pendingItems[0];
  }, [pendingItems, selectedIndex]);

  if (session.isPending || queue.isPending)
    return <LoadingState label="Đang chuẩn bị bằng chứng ngoại lệ" />;

  if (session.isError || queue.isError || !merchantId)
    return (
      <ErrorState
        title="Chưa thể mở hàng chờ"
        description="Không có quyết định nào được ghi khi dữ liệu chưa tải thành công."
        retry={() => { void session.refetch(); void queue.refetch(); }}
      />
    );

  if (pendingItems.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] animate-[route-in_240ms_ease-out] px-12 py-10">
        <PageHeader periodLabel={periodLabel} remaining={0} total={0} current={0} />
        <div className="mt-8">
          <EmptyState
            title="Đã xử lý xong các giao dịch cần xác nhận"
            description={`TaxLens đã tính lại mức độ sẵn sàng ${periodLabel.toLocaleLowerCase("vi")}.`}
            action={
              <div className="flex flex-wrap gap-3">
                <Link href={`/tax-readiness?period=${period}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Xem mức độ sẵn sàng</Link>
                <Link href="/dashboard" className="inline-flex min-h-10 items-center justify-center rounded-xl border px-5 text-sm font-semibold text-text-secondary hover:bg-background">Quay lại Tổng quan</Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const current = selectedIndex >= 0 ? selectedIndex + 1 : 1;
  const total = pendingItems.length;
  const remaining = total;
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;

  async function confirm() {
    if (!classification || !selected) return;
    try {
      await resolution.mutateAsync({ exceptionId: selected.id, decision: "approved", classification, sale_id: selected.sale_id });
      const txId = selected.bank_transaction_id ?? `#${selected.id}`;
      toast({ title: "Đã xác nhận giao dịch", description: `Giao dịch ${txId} đã được phân loại.`, tone: "success" });
      setClassification(undefined);
      const nextIndex = selectedIndex + 1;
      if (nextIndex < pendingItems.length) setSelectedId(pendingItems[nextIndex].id);
      else setSelectedId(undefined);
    } catch (error) {
      toast({ title: "Chưa thể lưu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" });
    }
  }

  async function escalateToSHB() {
    if (!selected || !merchantId) return;
    setEscalating(true);
    try {
      await createSupportRequest({
        merchantId,
        period,
        topic: "unmatched_transaction",
        description: `Yêu cầu SHB hỗ trợ xác nhận giao dịch ${selected.bank_transaction_id ?? `#${selected.id}`}`,
        priority: "MEDIUM",
      });
      toast({ title: "Đã chuyển tới SHB", description: "SHB sẽ liên hệ trong 3 ngày làm việc.", tone: "success" });
      setClassification(undefined);
      const nextIndex = selectedIndex + 1;
      if (nextIndex < pendingItems.length) setSelectedId(pendingItems[nextIndex].id);
      else setSelectedId(undefined);
    } catch (error) {
      toast({ title: "Chưa thể gửi yêu cầu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" });
    } finally {
      setEscalating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] animate-[route-in_240ms_ease-out] px-12 py-10">
      <PageHeader periodLabel={periodLabel} remaining={remaining} total={total} current={current} />
      <QueueToolbar remaining={remaining} current={current} total={total} progressPercent={progressPercent} />
      <section className="mt-6 grid gap-6" style={{ gridTemplateColumns: "minmax(320px, 0.31fr) minmax(0, 0.69fr)" }}>
        <QueuePanel items={pendingItems} selectedId={selected?.id} onSelect={(id) => { setSelectedId(id); setClassification(undefined); }} />
        {selected && (
          <DetailPanel
            item={selected}
            classification={classification}
            onClassificationChange={setClassification}
            onConfirm={() => void confirm()}
            onDefer={() => { setClassification(undefined); const nextIndex = selectedIndex + 1; if (nextIndex < pendingItems.length) setSelectedId(pendingItems[nextIndex].id); }}
            onEscalate={() => void escalateToSHB()}
            isSubmitting={resolution.isPending}
            isEscalating={escalating}
          />
        )}
      </section>
    </div>
  );
}

function PageHeader({ periodLabel, remaining, total, current }: { periodLabel: string; remaining: number; total: number; current: number }) {
  const subtitle = total === 0 ? "TaxLens đã xử lý xong tất cả giao dịch trong kỳ này." : `TaxLens đã xử lý các trường hợp rõ ràng. Chị chỉ cần quyết định ${remaining} mục còn thiếu bằng chứng.`;
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-[680px]">
        <p className="mb-2 text-xs font-medium text-text-tertiary">{periodLabel} · Đối soát giao dịch</p>
        <h1 className="font-display text-[44px] leading-tight tracking-[-0.02em] text-ink">Cần xác nhận</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{subtitle}</p>
      </div>
      {total > 0 && (
        <div className="flex shrink-0 items-center gap-3 rounded-xl border bg-surface px-4 py-3">
          <div className="text-right">
            <p className="font-display text-2xl leading-none text-ink">{current}<span className="text-text-tertiary"> / {total}</span></p>
            <p className="mt-1 text-[11px] font-medium text-text-tertiary">Đang xử lý</p>
          </div>
        </div>
      )}
    </header>
  );
}

function QueueToolbar({ remaining, current, total, progressPercent }: { remaining: number; current: number; total: number; progressPercent: number }) {
  return (
    <div className="mt-6 rounded-xl border bg-surface px-5 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{remaining} mục còn lại</span>
        <span className="text-text-secondary">{current} / {total} đã mở</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

function QueuePanel({ items, selectedId, onSelect }: { items: ReconciliationException[]; selectedId?: number; onSelect: (id: number) => void }) {
  return (
    <aside className="flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Hàng đợi</h2>
        <p className="mt-1 text-xs text-text-secondary">{items.length} mục cần xác nhận</p>
      </div>
      <div className="max-h-[calc(100vh-340px)] divide-y overflow-y-auto">
        {items.map((item, index) => (
          <QueueRow key={item.id} item={item} index={index + 1} isSelected={item.id === selectedId} onSelect={() => onSelect(item.id)} />
        ))}
      </div>
    </aside>
  );
}

function QueueRow({ item, index, isSelected, onSelect }: { item: ReconciliationException; index: number; isSelected: boolean; onSelect: () => void }) {
  const sender = item.sender_name || "Chưa xác định người gửi";
  const note = item.raw_note || "Không có nội dung chuyển khoản";
  const time = formatTimeFirst(item.transaction_date);
  const statusLabel = vi(item.exception_type) || "Chưa phân loại";
  return (
    <button type="button" onClick={onSelect} aria-pressed={isSelected} className={cn("grid w-full grid-cols-[auto_1fr] gap-3 px-5 py-4 text-left transition-colors hover:bg-background", isSelected && "bg-[var(--taxlens-selection-soft)]")} style={isSelected ? { borderLeft: "3px solid var(--taxlens-secondary)" } : undefined}>
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium text-text-secondary">{index}</span>
      <span className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="truncate text-[15px] font-semibold text-ink">{sender}</strong>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatMoney(item.amount)}</span>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-text-secondary">{note}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-text-tertiary">{time}</span>
          <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-secondary">{statusLabel}</span>
        </div>
      </span>
    </button>
  );
}

function DetailPanel({ item, classification, onClassificationChange, onConfirm, onDefer, onEscalate, isSubmitting, isEscalating }: {
  item: ReconciliationException;
  classification: ClassificationValue | undefined;
  onClassificationChange: (value: ClassificationValue) => void;
  onConfirm: () => void;
  onDefer: () => void;
  onEscalate: () => void;
  isSubmitting: boolean;
  isEscalating: boolean;
}) {
  const suggestion = item.ai_suggestion;
  const suggestedType = suggestion?.suggested_type;
  const confidence = suggestion?.confidence;
  const evidence = suggestion?.evidence ?? [];
  const uncertainties = suggestion?.uncertainties ?? [];
  const reasoning = suggestion?.reasoning ?? (suggestion?.reason ? [suggestion.reason] : []);
  const evidenceItems = evidence.length > 0 ? evidence : reasoning;
  const uncertaintyItems = uncertainties;
  const hasSuggestion = Boolean(suggestedType);
  const hasConfidence = typeof confidence === "number" && Number.isFinite(confidence);
  const txnId = item.bank_transaction_id ?? `#${item.id}`;
  const question = getDecisionQuestion(item);
  const selectedChoice = CLASSIFICATION_CHOICES.find((c) => c.value === classification);
  const canSubmit = Boolean(classification) && !isSubmitting;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-text-tertiary">Giao dịch cần xác nhận · <span className="font-mono">{txnId}</span></p>
            <h2 className="font-display mt-2 text-[30px] leading-tight tracking-[-0.01em] text-ink">{question}</h2>
            <p className="mt-2 text-sm text-text-secondary">{item.sender_name || "Chưa xác định người gửi"} · {formatTimeFirst(item.transaction_date)}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-background px-3 py-1 text-[13px] font-medium text-text-secondary">{vi(item.exception_type) || "Chưa phân loại"}</span>
        </div>
      </div>

      <div className="max-h-[calc(100vh-520px)] overflow-y-auto">
        <div className="space-y-6 px-6 py-5">
          <SourceRecord item={item} />
          <RecommendationBlock hasSuggestion={hasSuggestion} suggestedType={suggestedType} hasConfidence={hasConfidence} confidence={confidence} evidenceItems={evidenceItems} uncertaintyItems={uncertaintyItems} />
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Chị muốn phân loại giao dịch này thế nào?</legend>
            <p className="mt-1 text-xs text-text-secondary">Chọn một phân loại. Quyết định chưa được lưu cho đến khi chị bấm xác nhận.</p>
            <div className="mt-4 grid gap-3">
              {CLASSIFICATION_CHOICES.map((choice) => {
                const isSuggested = suggestedType === choice.value;
                const isSelected = classification === choice.value;
                return (
                  <button key={choice.value} type="button" onClick={() => onClassificationChange(choice.value)} aria-pressed={isSelected} className={cn("relative min-h-[60px] rounded-xl border p-4 text-left transition-colors hover:border-border-strong", isSelected ? "border-secondary bg-[var(--taxlens-selection-soft)]" : "border-border bg-surface", isSuggested && !isSelected && "border-secondary/40")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-[15px] font-semibold text-ink">{choice.label}</strong>
                        <span className="mt-1 block text-[13px] leading-5 text-text-secondary">{choice.description}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isSuggested && <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary"><Sparkles aria-hidden size={10} />Đề xuất</span>}
                        {isSelected && <Check aria-hidden className="text-secondary" size={18} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {selectedChoice && <ImpactPreview classification={selectedChoice.label} />}
        </div>
      </div>

      <div className="border-t bg-surface px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-tertiary">Mọi thay đổi chỉ được ghi sau khi chị xác nhận.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onDefer} disabled={isSubmitting}>Để sau</Button>
            <Button variant="outline" onClick={onEscalate} disabled={isEscalating || isSubmitting}><LifeBuoy aria-hidden size={16} />{isEscalating ? "Đang gửi..." : "Nhờ SHB hỗ trợ"}</Button>
            <Button variant="primary" onClick={onConfirm} disabled={!canSubmit}>{isSubmitting ? "Đang xác nhận..." : "Xác nhận phân loại"}</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SourceRecord({ item }: { item: ReconciliationException }) {
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Người gửi", value: item.sender_name || "Chưa xác định được người gửi" },
    { label: "Số tiền", value: formatMoney(item.amount) },
    { label: "Thời điểm", value: formatTimeFirst(item.transaction_date) },
    { label: "Nguồn", value: sourceLabel(item.source) },
    { label: "Mã tham chiếu", value: item.reference_number || "Không có", mono: true },
  ];
  const note = item.raw_note;
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">Dữ liệu giao dịch</h3>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
            <dt className="text-[13px] text-text-tertiary">{row.label}</dt>
            <dd className={cn("text-right text-sm text-ink", row.mono && "font-mono text-[13px]")}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {note ? (
        <div className="mt-3 rounded-lg bg-[var(--taxlens-neutral-soft)] px-4 py-3">
          <p className="text-[13px] font-medium text-text-tertiary">Nội dung chuyển khoản</p>
          <p className="mt-1 font-mono text-sm text-ink">{note}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-[var(--taxlens-neutral-soft)] px-4 py-3">
          <p className="text-sm text-text-secondary">Ngân hàng không cung cấp nội dung chuyển khoản.</p>
        </div>
      )}
    </section>
  );
}

function RecommendationBlock({ hasSuggestion, suggestedType, hasConfidence, confidence, evidenceItems, uncertaintyItems }: {
  hasSuggestion: boolean;
  suggestedType?: string | null;
  hasConfidence: boolean;
  confidence?: number | null;
  evidenceItems: string[];
  uncertaintyItems: string[];
}) {
  return (
    <section className="rounded-xl border border-secondary/20 bg-[var(--taxlens-information-soft)] p-5">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="text-secondary" size={18} />
        <h3 className="text-sm font-semibold text-ink">TaxLens đề xuất</h3>
      </div>
      {hasSuggestion ? (
        <>
          <p className="mt-3 text-[15px] font-semibold text-ink">Phân loại là {humanize(suggestedType)}</p>
          {hasConfidence && <p className="mt-1 text-xs text-text-secondary">Độ tin cậy {formatConfidence(confidence)}</p>}
          {(evidenceItems.length > 0 || uncertaintyItems.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 aria-hidden size={14} />Bằng chứng hỗ trợ</p>
                <ul className="space-y-1.5">
                  {evidenceItems.slice(0, 3).map((item, i) => <li key={i} className="flex gap-1.5 text-[13px] leading-5 text-text-secondary"><span aria-hidden className="text-success">•</span><span>{viOrSafe(item)}</span></li>)}
                  {evidenceItems.length === 0 && <li className="text-[13px] text-text-tertiary">Không có bằng chứng cụ thể.</li>}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-warning"><HelpCircle aria-hidden size={14} />Điều TaxLens chưa chắc chắn</p>
                <ul className="space-y-1.5">
                  {uncertaintyItems.slice(0, 3).map((item, i) => <li key={i} className="flex gap-1.5 text-[13px] leading-5 text-text-secondary"><span aria-hidden className="text-warning">•</span><span>{viOrSafe(item)}</span></li>)}
                  {uncertaintyItems.length === 0 && <li className="text-[13px] text-text-tertiary">Không có điểm chưa rõ.</li>}
                </ul>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-text-secondary">TaxLens chưa đủ bằng chứng để đề xuất một phân loại. Chị có thể chọn phân loại phù hợp hoặc nhờ SHB hỗ trợ.</p>
      )}
    </section>
  );
}

function ImpactPreview({ classification }: { classification: string }) {
  return (
    <section className="rounded-lg bg-[var(--taxlens-neutral-soft)] px-4 py-3">
      <p className="text-xs font-semibold text-text-secondary">Sau khi xác nhận</p>
      <ul className="mt-2 space-y-1 text-[13px] leading-5 text-text-secondary">
        <li className="flex gap-1.5"><ChevronRight aria-hidden size={14} className="mt-0.5 shrink-0 text-text-tertiary" />Giao dịch sẽ được phân loại là {classification}</li>
        <li className="flex gap-1.5"><ChevronRight aria-hidden size={14} className="mt-0.5 shrink-0 text-text-tertiary" />Mục này sẽ rời hàng chờ</li>
        <li className="flex gap-1.5"><ChevronRight aria-hidden size={14} className="mt-0.5 shrink-0 text-text-tertiary" />Mức độ sẵn sàng sẽ được tính lại</li>
        <li className="flex gap-1.5"><ChevronRight aria-hidden size={14} className="mt-0.5 shrink-0 text-text-tertiary" />Quyết định sẽ được ghi vào lịch sử truy vết</li>
      </ul>
    </section>
  );
}

function getDecisionQuestion(item: ReconciliationException): string {
  const exType = item.exception_type?.toUpperCase();
  if (exType === "DUPLICATE_CANDIDATE" || exType === "MULTI_ORDER") return "Giao dịch này thuộc đơn hàng nào?";
  if (exType === "TWO_PAYER") return "Người thanh toán có phải khách của đơn hàng này không?";
  if (exType === "SPLIT_PAYMENT") return `Chị muốn phân bổ ${formatMoney(item.amount)} vào các đơn nào?`;
  return `Khoản tiền ${formatMoney(item.amount)} này là gì?`;
}

function viOrSafe(text: string): string {
  if (!text) return "";
  const mapped = vi(text);
  if (mapped === text && /[a-zA-Z]{4,}/.test(text) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) return text;
  return mapped;
}
