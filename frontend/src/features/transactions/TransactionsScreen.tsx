"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  ArrowRight,
  Banknote,
  FileText,
  RefreshCw,
  Search,
  ShieldQuestion,
  Upload,
} from "lucide-react";
import { Money } from "@/components/domain/Money";
import {
  buttonVariants,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  StatusPill,
} from "@/components/ui";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { useTransactions } from "@/hooks/useTransactions";
import type { BankTransaction } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  humanize,
  matchStatusLabel,
} from "@/features/ledger/format";

type FilterKey = "all" | "ambiguous" | "matched" | "missing_invoice";

const filters: Array<{ value: FilterKey; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "ambiguous", label: "Cần xử lý" },
  { value: "matched", label: "Đã khớp" },
  { value: "missing_invoice", label: "Thiếu hóa đơn" },
];

export function TransactionsScreen() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "";
  const { period, periodLabel, setPeriod } = useReportingPeriod();
  const [status, setStatus] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("vi"));
  const query = useTransactions({ merchantId, period, pageSize: 100 });

  if (session.isPending || query.isPending) {
    return <LoadingState label="Đang lấy và hợp nhất giao dịch SHB" />;
  }
  if (session.isError || query.isError || !merchantId) {
    return (
      <ErrorState
        title="Chưa thể tải giao dịch"
        description="Kiểm tra kết nối rồi thử lại. Dữ liệu gốc không bị thay đổi."
        retry={() => {
          void session.refetch();
          void query.refetch();
        }}
      />
    );
  }

  const allRows = query.data.transactions;
  const counts: Record<FilterKey, number> = {
    all: allRows.length,
    ambiguous: allRows.filter(needsReview).length,
    matched: allRows.filter((row) => row.match_status === "matched" || row.match_status === "partial").length,
    missing_invoice: allRows.filter((row) => !row.invoice_id && (row.match_status === "matched" || row.match_status === "partial")).length,
  };
  const rows = allRows.filter((row) => {
    const statusMatch =
      status === "all" ||
      (status === "ambiguous" && needsReview(row)) ||
      (status === "matched" && (row.match_status === "matched" || row.match_status === "partial")) ||
      (status === "missing_invoice" && !row.invoice_id && (row.match_status === "matched" || row.match_status === "partial"));
    if (!statusMatch || !deferredSearch) return statusMatch;
    return [
      row.id,
      row.sender_name,
      row.raw_note,
      row.reference_number,
      row.payment_code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(deferredSearch);
  });
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];

  return (
    <div className="space-y-7 animate-[route-in_240ms_ease-out]">
      <PageHeader
        eyebrow="Dòng tiền hợp nhất"
        period={periodLabel}
        title="Giao dịch"
        description="Theo dõi và kiểm tra toàn bộ dòng tiền của cửa hàng từ bản ghi gốc đến phân loại, đối soát và chứng từ liên quan."
        actions={
          <>
            <Link href={`/tax-readiness?period=${period}`} className={buttonVariants({ variant: "outline" })}>
              <Upload aria-hidden size={16} /> Xuất dữ liệu
            </Link>
            <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
              <RefreshCw aria-hidden size={16} /> Cập nhật dữ liệu
            </Link>
            <Link href="/sales" className={buttonVariants({ variant: "primary" })}>
              Tạo giao dịch
            </Link>
          </>
        }
      />

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-surface px-5 py-4 text-sm">
        <span className="font-semibold text-text">{counts.all} giao dịch</span>
        <span className="text-text-secondary">·</span>
        <span className="text-text-secondary">{counts.matched} đã khớp tự động</span>
        <span className="text-text-secondary">·</span>
        <span className={cn("font-medium", counts.ambiguous > 0 ? "text-primary" : "text-text-secondary")}>{counts.ambiguous} cần xử lý</span>
        <span className="text-text-secondary">·</span>
        <span className={cn("font-medium", counts.missing_invoice > 0 ? "text-primary" : "text-text-secondary")}>{counts.missing_invoice} thiếu hóa đơn</span>
      </div>

      <section
        className="grid min-w-0 gap-5 xl:h-[46rem] xl:grid-cols-[minmax(0,44fr)_minmax(0,56fr)]"
        aria-label="Điều tra giao dịch"
      >
        <Card className="flex min-h-0 flex-col p-0">
          <div className="grid gap-4 border-b p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Danh sách giao dịch</h2>
                <p className="mt-1 text-xs text-text-secondary">{rows.length} kết quả trong {periodLabel.toLocaleLowerCase("vi")}</p>
              </div>
              <Search aria-hidden size={18} className="text-text-tertiary" />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_10.5rem]">
              <Field
                label="Tìm giao dịch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Người gửi, nội dung, mã tham chiếu"
              />
              <Field
                label="Kỳ dữ liệu"
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Trạng thái giao dịch">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  role="tab"
                  aria-selected={status === filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  className={cn(
                    "min-h-10 rounded-lg border px-2 text-xs font-semibold text-text-secondary transition-colors hover:border-secondary hover:text-secondary 2xl:px-3 2xl:text-sm",
                    status === filter.value && "border-secondary bg-secondary text-white hover:text-white",
                  )}
                >
                  {filter.label} ({counts[filter.value]})
                </button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              compact
              title="Không tìm thấy giao dịch"
              description="Thử đổi trạng thái hoặc từ khóa. TaxLens không ẩn giao dịch khỏi sổ gốc."
              action={
                search || status !== "all" ? (
                  <button
                    className="text-sm font-semibold text-secondary"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    "grid w-full grid-cols-[1fr_auto] gap-3 p-4 text-left transition-colors hover:bg-background sm:p-5",
                    selected?.id === row.id && "bg-accent/60 ring-1 ring-inset ring-secondary/35",
                  )}
                  aria-pressed={selected?.id === row.id}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold">{row.sender_name ?? "Người gửi chưa rõ"}</strong>
                    <span className="font-mono mt-1 block truncate text-xs text-text-secondary">{row.raw_note ?? "Không có nội dung"}</span>
                    <span className="mt-3 block"><StatusPill status={matchStatusLabel(row.match_status)} /></span>
                  </span>
                  <span className="text-right">
                    <Money value={row.amount} className="block text-sm font-semibold" />
                    <span className="mt-1 block text-xs text-text-tertiary">{formatDateTime(row.transaction_date)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {selected ? <TransactionDetail transaction={selected} period={period} /> : (
          <EmptyState title="Chọn một giao dịch" description="Chi tiết và bằng chứng sẽ xuất hiện ở đây." />
        )}
      </section>
    </div>
  );
}

function TransactionDetail({ transaction, period }: { transaction: BankTransaction; period: string }) {
  const suggestion = suggestionFor(transaction);
  return (
    <Card variant="workspace" className="flex min-h-0 flex-col p-0">
      <div className="border-b p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Bản ghi ngân hàng</p>
            <h2 className="font-display mt-2 text-3xl">{transaction.sender_name ?? "Người gửi chưa rõ"}</h2>
            <Money value={transaction.amount} className="mt-3 block text-3xl tracking-[-0.04em]" />
          </div>
          <StatusPill status={matchStatusLabel(transaction.match_status)} />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-7">
        <section className="grid gap-4 sm:grid-cols-2">
          <Evidence icon={Banknote} label="Nguồn và thời điểm" value={`${transaction.source ?? "Ngân hàng"} · ${formatDateTime(transaction.transaction_date)}`} />
          <Evidence icon={FileText} label="Mã tham chiếu" value={transaction.reference_number ?? transaction.payment_code ?? "Chưa có"} />
        </section>

        <section className="rounded-xl border bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Nội dung gốc</p>
          <blockquote className="font-mono mt-3 text-base leading-7">“{transaction.raw_note ?? "Không có nội dung"}”</blockquote>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Phân loại" value={humanize(transaction.classification)} />
          <Fact label="Đã phân bổ" value={<Money value={transaction.allocated_amount ?? 0} />} />
          <Fact label="Nguồn" value={transaction.source ?? "Chưa rõ"} />
          <Fact label="Hóa đơn" value={transaction.invoice_id ? "Đã liên kết" : "Chưa liên kết"} />
        </section>

        <section className="rounded-xl bg-accent/55 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldQuestion aria-hidden className="mt-0.5 shrink-0 text-secondary" size={20} />
              <div>
                <h3 className="text-sm font-semibold">Đề xuất TaxLens</h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{suggestion.summary}</p>
              </div>
            </div>
            <span className="rounded-full border bg-surface px-3 py-1 font-mono text-xs font-semibold">
              {suggestion.confidence == null ? "Chưa đủ dữ liệu tin cậy" : `${suggestion.confidence}% tin cậy`}
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Bằng chứng</p>
            <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
              {suggestion.evidence.map((item) => (
                <li key={item} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" />{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t pt-5">
          <h3 className="text-sm font-semibold">Kết quả đối soát</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {transaction.match_status === "matched"
              ? `Đã nối giao dịch với ${transaction.matched_sale_ids?.length ?? 1} đơn hàng và lưu bằng chứng phân bổ.`
              : transaction.match_status === "partial"
                ? "Một phần số tiền đã được phân bổ; phần còn lại cần kiểm tra trước khi khép sổ."
                : "Chưa có đủ bằng chứng để tự động ghi nhận kết quả cuối cùng."}
          </p>
        </section>
      </div>

      <footer className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-surface p-4 sm:px-7">
        <Link href={`/exceptions?period=${period}`} className={buttonVariants({ variant: needsReview(transaction) ? "primary" : "outline" })}>
          {needsReview(transaction) ? "Xem và xác nhận" : "Đổi phân loại"}
          <ArrowRight aria-hidden size={16} />
        </Link>
        <Link href={`/assistant?period=${period}`} className={buttonVariants({ variant: "ghost" })}>Chuyển cho ngân hàng xử lý</Link>
      </footer>
    </Card>
  );
}

function needsReview(transaction: BankTransaction): boolean {
  return Boolean(transaction.pending_exception_id) || ["ambiguous", "unmatched"].includes(transaction.match_status ?? "");
}

function suggestionFor(transaction: BankTransaction) {
  const raw = transaction.ai_interpretation;
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const rawConfidence = typeof payload.confidence === "number" ? payload.confidence : null;
  const confidence = rawConfidence == null
    ? null
    : Math.round(Math.min(100, Math.max(0, rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)));
  const reasoning = Array.isArray(payload.reasoning)
    ? payload.reasoning.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
  const evidence = [
    ...reasoning,
    transaction.reference_number || transaction.payment_code ? `Mã tham chiếu: ${transaction.reference_number ?? transaction.payment_code}` : null,
    transaction.raw_note ? `Nội dung chuyển khoản: “${transaction.raw_note}”` : "Nội dung chuyển khoản đang để trống",
    transaction.matched_sale_ids?.length ? `${transaction.matched_sale_ids.length} đơn hàng có liên quan trong ledger` : null,
  ].filter((item): item is string => Boolean(item)).slice(0, 4);
  const summary = typeof payload.summary === "string"
    ? payload.summary
    : needsReview(transaction)
      ? "Bằng chứng chưa đủ để tự động khớp. Bạn là người quyết định phân loại cuối cùng."
      : "Kết quả được truy ngược từ mã tham chiếu, phân bổ và record liên quan trong ledger.";
  return { confidence, evidence, summary };
}

function Evidence({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border p-4">
      <Icon aria-hidden className="mt-0.5 shrink-0 text-secondary" size={18} />
      <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-secondary">{label}</p><p className="mt-2 text-sm">{value}</p></div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-xs uppercase tracking-[0.1em] text-text-secondary">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>;
}
