"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2, ListChecks, ReceiptText, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buttonVariants, Card, DataTable, EmptyState, ErrorState, KpiCard, LoadingState, PageHeader, StatusPill } from "@/components/ui";
import { useDashboard, useExceptions } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import type { BankTransaction } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, matchStatusLabel } from "@/features/ledger/format";

const transactionColumns = [
  { key: "sender", header: "Người gửi", primary: true, cell: (row: BankTransaction) => row.sender_name ?? "Không rõ" },
  { key: "note", header: "Nội dung", cell: (row: BankTransaction) => row.raw_note ?? "Không có nội dung", hideOnMobile: true },
  { key: "status", header: "Đối soát", cell: (row: BankTransaction) => <StatusPill status={matchStatusLabel(row.match_status)} /> },
  { key: "amount", header: "Số tiền", align: "right" as const, cell: (row: BankTransaction) => formatMoney(row.amount) },
];

export function DashboardScreen() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? undefined;
  const { period, periodLabel } = useReportingPeriod();
  const dashboard = useDashboard(merchantId, period);
  const exceptions = useExceptions(merchantId, period);

  if (session.isPending || dashboard.isPending) return <LoadingState label="Đang tổng hợp sổ vận hành" />;
  if (session.isError || dashboard.isError || !merchantId) {
    return <ErrorState title="Chưa thể mở tổng quan" description="TaxLens chưa lấy được dữ liệu merchant. Vui lòng thử lại." retry={() => { void session.refetch(); void dashboard.refetch(); }} />;
  }

  const data = dashboard.data;
  const score = data.tax_readiness.score;
  const actionHref = data.exception_count > 0 ? "/exceptions" : "/invoices";
  const actionLabel = data.exception_count > 0 ? `Xử lý ${data.exception_count} mục` : `Bổ sung ${data.missing_invoice_count} hóa đơn`;
  const reconciliationBars = data.recent_transactions.slice(0, 7).reverse().map((transaction, index) => ({
    day: formatDateTime(transaction.transaction_date).slice(0, 5) || `#${index + 1}`,
    matched: transaction.match_status === "matched" || transaction.match_status === "partial" ? 1 : 0,
    pending: transaction.match_status === "matched" || transaction.match_status === "partial" ? 0 : 1,
  }));

  return (
    <div className="space-y-8 animate-[route-in_240ms_ease-out]">
      <PageHeader
        eyebrow="Salon Hương"
        period={periodLabel}
        title="Tổng quan vận hành"
        description="Một đường dẫn rõ ràng từ dòng tiền đến bộ dữ liệu thuế có thể kiểm chứng."
        actions={<Link className={buttonVariants({ variant: "primary" })} href={`${actionHref}?period=${period}`}>{actionLabel}<ArrowRight aria-hidden size={17} /></Link>}
      />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]" aria-label="Mức sẵn sàng">
        <Card variant="information" className="relative overflow-hidden p-7 sm:p-9">
          <div aria-hidden className="absolute -right-12 -top-12 size-48 rounded-full border-[28px] border-secondary/10" />
          <div className="relative max-w-2xl">
            <div className="flex flex-wrap items-center gap-3"><StatusPill status={data.tax_readiness.ready ? "Sẵn sàng" : "Chưa sẵn sàng"} /><span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Readiness tháng 7</span></div>
            <p className="font-display mt-7 text-7xl leading-none tracking-[-0.06em] sm:text-8xl">{score}<span className="ml-1 text-3xl">%</span></p>
            <h2 className="font-display mt-6 text-2xl sm:text-3xl">{score === 100 ? "Bộ dữ liệu đã sẵn sàng để xuất." : "Chỉ còn một vòng kiểm tra có chủ đích."}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">{data.exception_count} giao dịch cần phán đoán, {data.missing_invoice_count} đơn hàng còn thiếu bằng chứng hóa đơn. TaxLens không tự quyết khi dữ liệu chưa đủ chắc chắn.</p>
          </div>
        </Card>
        <Card variant="workspace" className="flex flex-col justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Việc ưu tiên</p><h2 className="font-display mt-4 text-3xl">Khép sổ tháng 7</h2><p className="mt-3 text-sm leading-6 text-text-secondary">Hoàn tất ngoại lệ trước, sau đó bổ sung hóa đơn để mở khóa bộ xuất MISA.</p></div>
          <Link href={`${actionHref}?period=${period}`} className={cn(buttonVariants({ variant: "secondary" }), "mt-8 w-full")}>{actionLabel}<ArrowRight aria-hidden size={17} /></Link>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Chỉ số vận hành">
        <KpiCard label="Đã đối soát" value={`${data.reconciled_count}/${data.total_transactions}`} detail={`${Math.round(data.reconciliation_rate * 100)}% giao dịch ngân hàng`} accent="mist" />
        <KpiCard label="Cần xác nhận" value={data.exception_count} detail="TaxLens chờ quyết định của bạn" accent={data.exception_count ? "mango" : "default"} />
        <KpiCard label="Thiếu hóa đơn" value={data.missing_invoice_count} detail="Đơn đã thanh toán chưa đủ chứng từ" />
      </section>

      <Card className="p-5 sm:p-6" aria-label="Đối soát 7 giao dịch gần đây">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Đối soát 7 giao dịch gần đây</p><h2 className="font-display mt-2 text-2xl">Dòng tiền đã khớp</h2></div><span className="text-sm text-text-secondary">{Math.round(data.reconciliation_rate * 100)}% tổng kỳ</span></div>
        <div className="mt-5 h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reconciliationBars} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--taxlens-border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--taxlens-text-secondary)" }} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip cursor={{ fill: "var(--taxlens-accent)" }} contentStyle={{ borderRadius: 12, borderColor: "var(--taxlens-border)", background: "var(--taxlens-surface)" }} />
              <Bar dataKey="matched" name="Đã khớp" stackId="status" fill="var(--taxlens-secondary)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pending" name="Cần kiểm tra" stackId="status" fill="var(--taxlens-warning)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Đi thẳng tới việc cần làm</p><h2 className="font-display mt-2 text-3xl">Thao tác nhanh</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["/exceptions", ListChecks, "Xác nhận ngoại lệ", `${data.exception_count} mục đang chờ`],
            ["/invoices", ReceiptText, "Bổ sung hóa đơn", `${data.missing_invoice_count} mục ảnh hưởng readiness`],
            ["/transactions", FileCheck2, "Kiểm tra giao dịch", `${data.reconciled_count}/${data.total_transactions} đã khớp`],
            ["/tax-readiness", ShieldCheck, "Xem sẵn sàng thuế", `Điểm hiện tại ${score}%`],
          ].map(([href, Icon, label, detail]) => (
            <Link key={String(href)} href={`${href}?period=${period}`} className="group rounded-xl border bg-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-secondary">
              <Icon aria-hidden className="text-secondary" size={21} /><strong className="mt-5 block text-sm">{String(label)}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{String(detail)}</span><ArrowRight aria-hidden className="mt-4 text-text-tertiary transition-transform group-hover:translate-x-1" size={16} />
            </Link>
          ))}
        </div>
      </section>

      {data.exception_count > 0 && (
        <Card className="grid gap-5 border-warning/30 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">Hàng chờ phán đoán</p><h2 className="font-display mt-2 text-2xl">{data.exception_count} giao dịch cần bạn xác nhận</h2><p className="mt-2 text-sm text-text-secondary">{exceptions.data?.[0]?.raw_note ? `Mục đầu tiên: “${exceptions.data[0].raw_note}”` : "TaxLens đã gom bằng chứng và đề xuất cho từng mục."}</p></div>
          <Link href={`/exceptions?period=${period}`} className={buttonVariants({ variant: "outline" })}>Mở hàng chờ<ArrowRight aria-hidden size={17} /></Link>
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Dòng tiền mới nhất</p><h2 className="font-display mt-2 text-3xl">Giao dịch gần đây</h2></div><Link href={`/transactions?period=${period}`} className="text-sm font-semibold text-secondary hover:underline">Xem tất cả</Link></div>
        <DataTable caption="Giao dịch ngân hàng gần đây" columns={transactionColumns} rows={data.recent_transactions} getRowKey={(row) => row.id} empty={<EmptyState compact title="Chưa có giao dịch" description="Giao dịch mới sẽ xuất hiện ở đây sau khi đồng bộ." />} />
        {data.recent_transactions[0] && <p className="mt-3 text-right text-xs text-text-tertiary">Cập nhật gần nhất {formatDateTime(data.recent_transactions[0].transaction_date)}</p>}
      </section>
    </div>
  );
}
