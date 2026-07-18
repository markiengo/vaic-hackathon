"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  PlusCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
} from "lucide-react";
import { Card, ErrorState, LoadingState, QuickActionCard, RecommendationPanel, SectionHeader, StatusPill } from "@/components/ui";
import { useDashboard, useExceptions } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import type { ReconciliationException } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, humanize, matchStatusLabel } from "@/features/ledger/format";

const quickActions = [
  { href: "/sales", icon: PlusCircle, label: "Tạo đơn mới" },
  { href: "/sales", icon: QrCode, label: "Tạo QR thanh toán" },
  { href: "/exceptions", icon: CircleAlert, label: "Xem ngoại lệ" },
  { href: "/tax-readiness", icon: ShieldCheck, label: "Xem sẵn sàng thuế" },
] as const;

export function DashboardScreen() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? undefined;
  const { period, periodLabel } = useReportingPeriod();
  const dashboard = useDashboard(merchantId, period);
  const exceptions = useExceptions(merchantId, period);

  if (session.isPending || dashboard.isPending) return <LoadingState label="Đang tổng hợp sổ vận hành" />;
  if (session.isError || dashboard.isError || !merchantId) {
    return (
      <ErrorState
        title="Chưa thể mở tổng quan"
        description="TaxLens chưa lấy được dữ liệu merchant. Vui lòng thử lại."
        retry={() => { void session.refetch(); void dashboard.refetch(); }}
      />
    );
  }

  const data = dashboard.data;
  const score = data.tax_readiness.score;
  const totalItems = data.exception_count + data.missing_invoice_count;
  const actionHref = data.exception_count > 0 ? "/exceptions" : "/invoices";
  const actionLabel = totalItems > 0 ? `Xử lý ${totalItems} mục` : "Xem sẵn sàng thuế";
  const recentTx = data.recent_transactions.slice(0, 5);
  const topExceptions = (exceptions.data ?? []).slice(0, 3);
  const featuredException = topExceptions[0];
  const compactExceptions = topExceptions.slice(1, 3);

  return (
    <div className="animate-[route-in_240ms_ease-out]">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full bg-[#F5F6F8] px-3 py-1 text-xs font-semibold text-secondary">Salon Hương</span>
            <span className="text-xs text-text-tertiary">{periodLabel} • Cập nhật lúc 10:42</span>
          </div>
          <h2 className="mb-2 font-display text-[44px] leading-tight tracking-[-0.02em] text-ink">Xin chào, chị Hương</h2>
          <p className="text-sm text-text-secondary">
            {totalItems > 0
              ? `Hôm nay cửa hàng có ${totalItems} mục cần xác nhận.`
              : "Hôm nay cửa hàng không có mục nào cần xử lý."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5"
          >
            Tạo đơn mới
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5"
          >
            <RefreshCw aria-hidden size={18} />
            Cập nhật dữ liệu
          </Link>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12" aria-label="Tóm tắt vận hành">
        <div className="lg:col-span-4">
          <Card className="relative h-full overflow-hidden border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
            <div className="absolute right-6 top-6">
              <Bell aria-hidden className="text-text-secondary" size={20} />
            </div>
            <div className="mb-8">
              <h3 className="mb-1 font-display text-[22px] font-bold text-ink">Dữ liệu tháng 7</h3>
              <p className="text-xs text-text-secondary">Cập nhật 07/07/2026</p>
            </div>
            <div className="mb-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid size-8 place-items-center rounded-full border-2 border-white bg-[#F5F6F8] text-xs font-semibold text-text-secondary">
                    {"HD"[i] ?? "H"}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-text-secondary">{score}% Sẵn sàng</span>
            </div>
            <div className="mb-8 flex-1 space-y-4">
              {data.unclassified_count > 0 && (
                <div className="flex items-center gap-3 text-sm text-text">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>Còn {data.unclassified_count} giao dịch chưa phân loại</span>
                </div>
              )}
              {data.missing_invoice_count > 0 && (
                <div className="flex items-center gap-3 text-sm text-text">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>Còn {data.missing_invoice_count} đơn thiếu hóa đơn</span>
                </div>
              )}
              {data.unclassified_count === 0 && data.missing_invoice_count === 0 && (
                <div className="flex items-center gap-3 text-sm text-text">
                  <CheckCircle2 aria-hidden className="text-success" size={16} />
                  <span>Tất cả mục đã được xử lý</span>
                </div>
              )}
            </div>
            <Link
              href={`${actionHref}?period=${period}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              {actionLabel}
              <ArrowRight aria-hidden size={18} />
            </Link>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="flex h-full flex-col justify-between border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
            <span className="mb-6 block text-sm font-medium text-text-secondary">Đối soát 7 ngày gần đây</span>
            <div className="mb-4">
              <span className="mb-2 block font-display text-[38px] leading-tight text-ink">
                {data.reconciled_count} / {data.total_transactions} đã khớp
              </span>
              <span className="text-xs text-text-secondary">
                {Math.round(data.reconciliation_rate * 100)}% tự động xử lý
              </span>
            </div>
            <div className="mt-auto flex h-32 items-end gap-2">
              {recentTx.slice(0, 6).map((tx, i) => {
                const isMatched = tx.match_status === "matched" || tx.match_status === "partial";
                const heights = ["h-1/3", "h-1/2", "h-2/3", "h-3/4", "h-full", "h-1/4"];
                const opacities = ["bg-secondary/20", "bg-secondary/40", "bg-secondary/60", "bg-secondary/80", "bg-secondary", "bg-[#FFF3E0]"];
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "w-1/6 rounded-t-sm transition-all",
                      isMatched ? opacities[i % opacities.length] : "bg-[#FFF3E0]",
                      heights[i % heights.length],
                    )}
                  />
                );
              })}
              {recentTx.length === 0 && (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="flex h-full flex-col justify-between border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
            <span className="mb-6 block text-sm font-medium text-text-secondary">Hóa đơn &amp; thuế</span>
            <div className="mb-6 space-y-4">
              {data.missing_invoice_count > 0 && (
                <div className="flex items-start gap-3">
                  <TriangleAlert aria-hidden className="mt-0.5 shrink-0 text-primary" size={18} />
                  <span className="text-sm text-text">{data.missing_invoice_count} đơn thiếu hóa đơn</span>
                </div>
              )}
              {data.exception_count > 0 && (
                <div className="flex items-start gap-3">
                  <CircleAlert aria-hidden className="mt-0.5 shrink-0 text-primary" size={18} />
                  <span className="text-sm text-text">{data.exception_count} mục đang chờ xác nhận</span>
                </div>
              )}
              {data.missing_invoice_count === 0 && data.exception_count === 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 aria-hidden className="mt-0.5 shrink-0 text-success" size={18} />
                  <span className="text-sm text-text">Không có blocker nào</span>
                </div>
              )}
            </div>
            <div className="mt-auto border-t border-border pt-4">
              <span className="text-xs text-text-secondary">
                Bộ quy tắc {data.tax_readiness.rule_version ?? "2026.07"}
              </span>
            </div>
          </Card>
        </div>
      </section>

      <section className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4" aria-label="Thao tác nhanh">
        {quickActions.map(({ href, icon: Icon, label }) => (
          <QuickActionCard key={label} href={`${href}?period=${period}`} icon={Icon} label={label} />
        ))}
      </section>

      {topExceptions.length > 0 && (
        <section className="mb-12" aria-label="Cần bạn xác nhận">
          <SectionHeader
            title="Cần bạn xác nhận"
            action={
              <Link
                href={`/exceptions?period=${period}`}
                className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                Xem tất cả {topExceptions.length} mục
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {featuredException && (
              <div className="md:col-span-6">
                <ExceptionFeatureCard exception={featuredException} period={period} />
              </div>
            )}
            <div className="md:col-span-6 grid grid-rows-2 gap-8">
              {compactExceptions.map((exc) => (
                <ExceptionCompactCard key={exc.id} exception={exc} period={period} />
              ))}
              {compactExceptions.length === 0 && (
                <>
                  <div className="flex items-center justify-center rounded-2xl border border-dashed bg-surface p-6 text-sm text-text-tertiary">
                    Không còn mục khác cần xác nhận
                  </div>
                  <div className="flex items-center justify-center rounded-2xl border border-dashed bg-surface p-6 text-sm text-text-tertiary">
                    Hàng chờ sẽ cập nhật tự động
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mb-10 w-full" aria-label="Giao dịch gần đây">
        <Card className="h-full border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
          <div className="mb-8 flex items-center justify-between">
            <h4 className="font-display text-[22px] font-bold text-ink">Giao dịch gần đây</h4>
            <Link
              href={`/transactions?period=${period}`}
              className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              Xem tất cả giao dịch
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/50 text-text-tertiary">
                  <th className="w-1/4 px-6 pb-4 text-[13px] font-medium">Người gửi</th>
                  <th className="w-[15%] px-6 pb-4 text-right text-[13px] font-medium">Số tiền</th>
                  <th className="w-[30%] px-6 pb-4 text-[13px] font-medium">Nội dung</th>
                  <th className="w-[15%] px-6 pb-4 text-[13px] font-medium">Phân loại</th>
                  <th className="w-[10%] px-6 pb-4 text-[13px] font-medium">Trạng thái</th>
                  <th className="w-[10%] px-6 pb-4 text-right text-[13px] font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentTx.map((tx) => (
                  <tr key={tx.id} className="cursor-pointer transition-colors hover:bg-gray-50/50">
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-4">
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-soft">
                          <Store aria-hidden className="text-text-tertiary" size={18} />
                        </div>
                        <span className="truncate text-sm font-medium text-text">
                          {tx.sender_name ?? "Người gửi chưa rõ"}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-6 text-right text-sm font-semibold whitespace-nowrap tabular-nums text-text">
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="py-6 px-6">
                      <span className="block truncate font-mono text-xs text-text-secondary">
                        {tx.raw_note ?? "Không có nội dung"}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-sm text-text-secondary">
                      {humanize(tx.classification)}
                    </td>
                    <td className="py-6 px-6">
                      <StatusPill status={matchStatusLabel(tx.match_status)} />
                    </td>
                    <td className="py-6 px-6 text-right text-sm whitespace-nowrap text-text-secondary">
                      {formatDateTime(tx.transaction_date).split(",")[0]}
                    </td>
                  </tr>
                ))}
                {recentTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-tertiary">
                      Chưa có giao dịch. Dữ liệu mới sẽ xuất hiện sau khi đồng bộ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ExceptionFeatureCard({ exception, period }: { exception: ReconciliationException; period: string }) {
  const suggestion = exception.ai_suggestion;
  const confidence = suggestion?.confidence != null
    ? Math.round(Math.min(100, Math.max(0, suggestion.confidence <= 1 ? suggestion.confidence * 100 : suggestion.confidence)))
    : null;
  const reasoning = suggestion?.reasoning ?? (suggestion?.reason ? [suggestion.reason] : []);

  return (
    <Card className="flex h-full flex-col border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-neutral-soft">
            <Store aria-hidden className="text-text-tertiary" size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{exception.sender_name ?? "Người gửi chưa rõ"}</p>
            <p className="text-xs text-text-secondary">
              {exception.created_at ? formatDateTime(exception.created_at) : "Hôm nay"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#FFF3E0] px-3 py-1 text-xs font-medium text-primary">
          ưu tiên
        </span>
      </div>
      <div className="mb-8 flex-1">
        <p className="mb-3 whitespace-nowrap font-display text-[36px] font-bold tabular-nums text-text">
          {formatMoney(exception.amount)}
        </p>
        <div className="rounded-xl bg-[#F5F6F8] p-4">
          <p className="break-all font-mono text-xs text-text-secondary">{exception.raw_note ?? "Không có nội dung"}</p>
        </div>
      </div>
      {suggestion && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles aria-hidden className="text-secondary" size={18} />
            <span className="text-sm font-bold text-secondary">
              Gợi ý từ TaxLens: {humanize(suggestion.suggested_type)} ({confidence ?? "--"}%)
            </span>
          </div>
          {reasoning.length > 0 && (
            <ul className="list-inside list-disc space-y-2 text-xs text-text-secondary">
              {reasoning.slice(0, 3).map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <Link
          href={`/exceptions?period=${period}`}
          className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Xem và xác nhận
        </Link>
        <Link
          href="/assistant"
          className="flex-1 rounded-xl border border-primary bg-white py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Nhờ SHB hỗ trợ
        </Link>
      </div>
    </Card>
  );
}

function ExceptionCompactCard({ exception, period }: { exception: ReconciliationException; period: string }) {
  const suggestion = exception.ai_suggestion;
  const confidence = suggestion?.confidence != null
    ? Math.round(Math.min(100, Math.max(0, suggestion.confidence <= 1 ? suggestion.confidence * 100 : suggestion.confidence)))
    : null;

  return (
    <Link
      href={`/exceptions?period=${period}`}
      className="flex flex-col justify-center rounded-2xl border bg-surface p-6 shadow-[0_4px_24px_rgba(25,36,78,0.04)] transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-soft">
            <Store aria-hidden className="text-text-tertiary" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{exception.sender_name ?? "Người gửi chưa rõ"}</p>
            <p className="text-xs text-text-secondary">Hôm nay</p>
          </div>
        </div>
        <p className="whitespace-nowrap font-display text-[22px] font-bold tabular-nums text-text">
          {formatMoney(exception.amount)}
        </p>
      </div>
      <p
        className="mb-4 truncate rounded-lg bg-[#F5F6F8] p-2 font-mono text-xs text-text-secondary"
        title={exception.raw_note ?? ""}
      >
        {exception.raw_note ?? "Không có nội dung"}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden className="text-secondary" size={16} />
          <span className="text-xs font-medium text-secondary">
            {suggestion?.suggested_type ? humanize(suggestion.suggested_type) : "Chưa phân loại"}
            {confidence != null ? ` · ${confidence}%` : ""}
          </span>
        </div>
        <ChevronRight aria-hidden className="text-text-tertiary" size={20} />
      </div>
    </Link>
  );
}
