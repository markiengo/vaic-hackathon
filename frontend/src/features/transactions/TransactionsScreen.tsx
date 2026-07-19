"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Banknote,
  ChevronRight,
  Download,
  EllipsisVertical,
  FileText,
  Link2,
  RefreshCw,
  Search,
  ShieldQuestion,
  Sparkles,
  Store,
} from "lucide-react";
import { Button, Skeleton, StatusPill } from "@/components/ui";
import { useTransactions } from "@/hooks/useTransactions";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import type { BankTransaction } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  formatTime,
  formatTimeFirst,
  humanize,
  matchStatusLabel,
  sourceLabel,
} from "@/features/ledger/format";

type TabValue = "all" | "needs_review" | "matched" | "missing_invoice";

export function TransactionsScreen() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "M001";
  const { period, periodLabel, setPeriod } = useReportingPeriod();

  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const transactions = useTransactions({
    merchantId,
    period,
    status: "all",
    search: undefined,
    pageSize: 100,
  });

  const allTransactions = transactions.data?.transactions ?? [];

  const counts = useMemo(() => {
    const total = allTransactions.length;
    const matched = allTransactions.filter((t) => t.match_status === "matched").length;
    const needsReview = allTransactions.filter(
      (t) => Boolean(t.pending_exception_id) || ["ambiguous", "unmatched"].includes(t.match_status ?? ""),
    ).length;
    const missingInvoice = allTransactions.filter(
      (t) => t.match_status === "matched" && !t.invoice_id,
    ).length;
    return { total, matched, needsReview, missingInvoice };
  }, [allTransactions]);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (activeTab === "needs_review") {
        return Boolean(t.pending_exception_id) || ["ambiguous", "unmatched"].includes(t.match_status ?? "");
      }
      if (activeTab === "matched") return t.match_status === "matched";
      if (activeTab === "missing_invoice") return t.match_status === "matched" && !t.invoice_id;
      return true;
    }).filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.sender_name?.toLowerCase().includes(q) ||
        t.raw_note?.toLowerCase().includes(q) ||
        t.reference_number?.toLowerCase().includes(q)
      );
    });
  }, [allTransactions, activeTab, search]);

  const selected = useMemo(() => {
    if (!selectedId && filtered.length > 0) return filtered[0];
    return filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;
  }, [selectedId, filtered]);

  if (session.isPending) {
    return (
      <div className="animate-[route-in_240ms_ease-out] space-y-8">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-10 w-full max-w-3xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const tabs: { value: TabValue; label: string; count: number; warn?: boolean }[] = [
    { value: "all", label: "Tất cả", count: counts.total },
    { value: "needs_review", label: "Cần xác nhận", count: counts.needsReview, warn: true },
    { value: "matched", label: "Đã khớp", count: counts.matched },
    { value: "missing_invoice", label: "Thiếu hóa đơn", count: counts.missingInvoice },
  ];

  return (
    <div className="flex flex-col gap-6 animate-[route-in_240ms_ease-out]">
      <PageHeader periodLabel={periodLabel} />
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <section
        className={cn(
          "grid min-h-0 gap-6",
          "grid-cols-1",
          "lg:grid-cols-[minmax(380px,0.44fr)_minmax(0,0.56fr)]",
          "xl:grid-cols-[minmax(420px,0.42fr)_minmax(0,0.58fr)]",
        )}
        style={{ height: "calc(100dvh - 300px)", minHeight: "620px" }}
      >
        <TransactionListPane
          transactions={filtered}
          totalCount={counts.total}
          periodLabel={periodLabel}
          search={search}
          onSearch={setSearch}
          period={period}
          onPeriodChange={setPeriod}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          isLoading={transactions.isPending}
        />
        {selected ? (
          <TransactionDetailPane transaction={selected} period={period} />
        ) : (
          <EmptyDetailPane />
        )}
      </section>
    </div>
  );
}

function PageHeader({ periodLabel }: { periodLabel: string }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[620px]">
        <div className="mb-3 flex items-center gap-2 text-[13px] text-text-tertiary">
          <span className="font-medium text-text-secondary">Dòng tiền</span>
          <span aria-hidden>·</span>
          <span>{periodLabel}</span>
        </div>
        <h1 className="mb-2 font-display text-[44px] leading-tight tracking-[-0.02em] text-ink">Giao dịch</h1>
        <p className="text-[15px] leading-relaxed text-text-secondary">
          Theo dõi, đối soát và kiểm tra các khoản tiền vào của cửa hàng.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="min-h-10">
          <RefreshCw aria-hidden size={16} />
          Cập nhật dữ liệu
        </Button>
        <Button variant="primary" className="min-h-10">
          <Download aria-hidden size={16} />
          Xuất dữ liệu
        </Button>
        <div className="relative">
          <details className="group">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-neutral-soft">
              <EllipsisVertical aria-hidden size={16} />
              <span className="hidden sm:inline">Thao tác khác</span>
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--taxlens-shadow-md)]">
              <Link
                href="/sales"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-neutral-soft hover:text-ink"
              >
                <Banknote aria-hidden size={16} />
                Ghi nhận giao dịch thủ công
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: TabValue; label: string; count: number; warn?: boolean }[];
  active: TabValue;
  onChange: (v: TabValue) => void;
}) {
  return (
    <div role="tablist" aria-label="Lọc giao dịch" className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-secondary text-secondary"
                : "border-transparent text-text-tertiary hover:text-text-secondary",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                tab.warn && tab.count > 0
                  ? "bg-primary-soft text-primary"
                  : isActive
                    ? "bg-selection-soft text-secondary"
                    : "bg-neutral-soft text-text-tertiary",
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TransactionListPane({
  transactions,
  totalCount,
  periodLabel,
  search,
  onSearch,
  period,
  onPeriodChange,
  selectedId,
  onSelect,
  isLoading,
}: {
  transactions: BankTransaction[];
  totalCount: number;
  periodLabel: string;
  search: string;
  onSearch: (v: string) => void;
  period: string;
  onPeriodChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--taxlens-shadow-card)]">
      <div className="shrink-0 border-b border-border p-6">
        <h2 className="text-[18px] font-semibold text-ink">Danh sách giao dịch</h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          {totalCount} kết quả trong {periodLabel.toLowerCase()}
        </p>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search aria-hidden size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Tìm theo người gửi, nội dung hoặc mã tham chiếu"
              className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-text-tertiary focus:border-secondary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-ink focus:border-secondary focus:outline-none"
            />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Store aria-hidden size={24} className="text-text-tertiary" />
            <p className="text-sm text-text-secondary">Không có giao dịch phù hợp.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                selected={tx.id === selectedId}
                onClick={() => onSelect(tx.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  selected,
  onClick,
}: {
  tx: BankTransaction;
  selected: boolean;
  onClick: () => void;
}) {
  const status = tx.match_status === "matched" && !tx.invoice_id ? "Thiếu hóa đơn" : matchStatusLabel(tx.match_status);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-4 px-6 py-[18px] text-left transition-colors",
          selected ? "bg-[#E8F3F3]" : "hover:bg-neutral-soft",
        )}
        style={selected ? { boxShadow: "inset 3px 0 0 0 var(--taxlens-secondary)" } : undefined}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-soft">
          <Store aria-hidden size={18} className="text-text-tertiary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[15px] font-semibold text-ink">
              {tx.sender_name ?? "Người gửi chưa rõ"}
            </p>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
              {formatMoney(tx.amount)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="truncate font-mono text-xs text-text-secondary">
              {tx.reference_number ?? tx.raw_note ?? "Không có nội dung"}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={status} className="px-2.5 py-0.5 text-xs" />
            <span className="text-xs text-text-tertiary">{formatTime(tx.transaction_date)}</span>
          </div>
        </div>
      </button>
    </li>
  );
}

function TransactionDetailPane({
  transaction,
  period,
}: {
  transaction: BankTransaction;
  period: string;
}) {
  const isMatched = transaction.match_status === "matched";
  const needsReview = Boolean(transaction.pending_exception_id) || ["ambiguous", "unmatched"].includes(transaction.match_status ?? "");
  const status = isMatched && !transaction.invoice_id ? "Thiếu hóa đơn" : matchStatusLabel(transaction.match_status);
  const suggestion = suggestionFor(transaction);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--taxlens-shadow-card)]">
      <div className="shrink-0 border-b border-border px-8 py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-text-tertiary">Bản ghi ngân hàng</p>
            <p className="mt-1 font-mono text-xs text-text-secondary">{transaction.id}</p>
            <h3 className="mt-4 font-display text-[32px] leading-tight text-ink">
              {transaction.sender_name ?? "Người gửi chưa rõ"}
            </h3>
          </div>
          <StatusPill status={status} className="shrink-0" />
        </div>
        <p className="mt-3 font-display text-[34px] leading-tight tabular-nums text-ink">
          {formatMoney(transaction.amount)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <DetailSection title="Thông tin giao dịch">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Fact label="Nguồn" value={sourceLabel(transaction.source)} />
            <Fact label="Thời điểm" value={formatTimeFirst(transaction.transaction_date)} mono />
            <Fact label="Mã tham chiếu" value={transaction.reference_number ?? "—"} mono />
            <Fact label="Số tài khoản" value={"•••• 2481"} mono />
          </dl>
        </DetailSection>

        <DetailSection title="Nội dung chuyển khoản">
          <div className="rounded-xl bg-neutral-soft px-4 py-3">
            <p className="font-mono text-sm text-text-secondary">
              {transaction.raw_note ?? "Không có nội dung"}
            </p>
          </div>
        </DetailSection>

        <DetailSection title="Đối soát">
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-soft">
                <Banknote aria-hidden size={18} className="text-text-tertiary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Giao dịch SHB</p>
                <p className="font-mono text-xs text-text-secondary">{formatMoney(transaction.amount)}</p>
              </div>
              <StatusPill status={isMatched ? "Đã khớp" : "Cần xác nhận"} />
            </div>
            {transaction.matched_sale_id && (
              <>
                <div className="flex justify-center">
                  <Link2 aria-hidden size={16} className="text-text-tertiary" />
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-soft">
                    <Store aria-hidden size={18} className="text-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Đơn hàng {transaction.matched_sale_id}</p>
                    <p className="text-xs text-text-secondary">{humanize(transaction.classification)}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatMoney(transaction.allocated_amount ?? transaction.amount)}
                  </span>
                </div>
              </>
            )}
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Fact label="Phương thức khớp" value={isMatched ? "Mã tham chiếu chính xác" : "Chưa khớp"} />
              <Fact label="Độ tin cậy" value={suggestion.confidence ? `${suggestion.confidence}%` : "Chưa xác định"} />
              <Fact label="Hóa đơn" value={transaction.invoice_id ? "Đã liên kết" : "Chưa liên kết"} />
              <Fact label="Phân loại" value={humanize(transaction.classification)} />
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Bằng chứng">
          <div className="rounded-xl border border-border bg-[var(--taxlens-information-soft)] px-4 py-3.5">
            <p className="text-sm leading-relaxed text-ink">
              {suggestion.summary}
            </p>
          </div>
        </DetailSection>

        <DetailSection title="Lịch sử" last>
          <ol className="space-y-4">
            <TimelineItem time={formatTime(transaction.transaction_date)} text="Giao dịch được nhận từ SHB" />
            {isMatched && (
              <TimelineItem time={formatTime(transaction.transaction_date)} text={`TaxLens khớp với đơn ${transaction.matched_sale_id ?? ""}`} />
            )}
            {transaction.invoice_id && (
              <TimelineItem time={formatTime(transaction.transaction_date)} text={`Hóa đơn ${transaction.invoice_id} được liên kết`} />
            )}
          </ol>
        </DetailSection>
      </div>

      <DetailFooter transaction={transaction} period={period} needsReview={needsReview} isMatched={isMatched} />
    </div>
  );
}

function DetailSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={cn(!last && "mb-7 pb-7 border-b border-border")}>
      <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">{title}</h4>
      {children}
    </section>
  );
}

function Fact({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] text-text-tertiary">{label}</dt>
      <dd className={cn("mt-1 text-sm font-medium text-ink", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function TimelineItem({ time, text }: { time: string; text: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="size-2 rounded-full bg-secondary" />
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-1">
        <p className="font-mono text-xs text-text-tertiary">{time}</p>
        <p className="mt-0.5 text-sm text-ink">{text}</p>
      </div>
    </li>
  );
}

function DetailFooter({
  transaction,
  period,
  needsReview,
  isMatched,
}: {
  transaction: BankTransaction;
  period: string;
  needsReview: boolean;
  isMatched: boolean;
}) {
  if (needsReview) {
    return (
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Link
          href={`/exceptions?period=${period}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Sparkles aria-hidden size={16} />
          Xác nhận phân loại
        </Link>
        <Link
          href={`/transactions?period=${period}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-neutral-soft"
        >
          Chọn phương án khác
        </Link>
        <Link
          href="/assistant"
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <ShieldQuestion aria-hidden size={16} />
          Nhờ SHB hỗ trợ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-6 py-4">
      {transaction.matched_sale_id ? (
        <Link
          href={`/sales?period=${period}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-neutral-soft"
        >
          <FileText aria-hidden size={16} />
          Xem đơn liên kết
        </Link>
      ) : (
        <Link
          href={`/invoices?period=${period}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-neutral-soft"
        >
          <FileText aria-hidden size={16} />
          Xem hóa đơn
        </Link>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/assistant"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <ShieldQuestion aria-hidden size={16} />
          Nhờ SHB hỗ trợ
        </Link>
        <Link
          href={`/exceptions?period=${period}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-neutral-soft"
        >
          Điều chỉnh phân loại
          <ChevronRight aria-hidden size={14} />
        </Link>
      </div>
    </div>
  );
}

function EmptyDetailPane() {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center rounded-2xl border border-border bg-surface shadow-[var(--taxlens-shadow-card)]">
      <Store aria-hidden size={28} className="text-text-tertiary" />
      <p className="mt-3 text-sm text-text-secondary">Chọn một giao dịch để xem chi tiết.</p>
    </div>
  );
}

function suggestionFor(transaction: BankTransaction) {
  const raw = transaction.ai_interpretation;
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const rawConfidence = typeof payload.confidence === "number" ? payload.confidence : null;
  const confidence = rawConfidence == null
    ? null
    : Math.round(Math.min(100, Math.max(0, rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)));
  const summary = typeof payload.summary === "string"
    ? payload.summary
    : transaction.reference_number
      ? `Mã ${transaction.reference_number} trùng với yêu cầu thanh toán. Số tiền khớp hoàn toàn và mã chưa được sử dụng cho giao dịch khác.`
      : "Bằng chứng chưa đủ để tự động khớp. Bạn là người quyết định phân loại cuối cùng.";
  return { confidence, summary };
}
