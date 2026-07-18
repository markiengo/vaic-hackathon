"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Download, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { Area, AreaChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, ErrorState, LoadingState, PageHeader, StatusPill, ToastProvider, useToast } from "@/components/ui";
import { useTaxReadiness } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { downloadTaxExport, type TaxExportFormat } from "@/lib/api/tax";
import type { ReadinessCheck } from "@/lib/domain/types";

const checkLabels: Record<string, string> = {
  bank_reconciliation: "Đối soát giao dịch ngân hàng",
  cash_session_closure: "Khép ca tiền mặt",
  unclassified_transactions: "Phân loại toàn bộ giao dịch",
  missing_invoices: "Độ phủ hóa đơn",
  active_rule_version: "Bộ quy tắc thuế hiệu lực",
};

const checkExplanations: Record<string, string> = {
  bank_reconciliation: "Mọi giao dịch đã được nối với đơn hàng hoặc phân loại rõ ràng.",
  cash_session_closure: "Ca tiền mặt đã được đối chiếu và đóng.",
  unclassified_transactions: "Không còn giao dịch chưa phân loại trong kỳ.",
  missing_invoices: "Mọi đơn đã thanh toán đều có bằng chứng hóa đơn.",
  active_rule_version: "Bộ quy tắc thuế đang dùng là phiên bản mới nhất.",
};

export function TaxReadinessScreen() { return <ToastProvider><TaxReadinessWorkspace /></ToastProvider>; }

function TaxReadinessWorkspace() {
  const { toast } = useToast();
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "";
  const { period, periodLabel } = useReportingPeriod();
  const query = useTaxReadiness(merchantId || undefined, period);
  const [exporting, setExporting] = useState<TaxExportFormat>();
  if (session.isPending || query.isPending) return <LoadingState label="Đang kiểm tra mức sẵn sàng" />;
  if (session.isError || query.isError || !merchantId) return <ErrorState title="Chưa thể tính readiness" description="TaxLens không mở khóa xuất dữ liệu khi chưa kiểm tra được toàn bộ tiêu chí." retry={() => { void session.refetch(); void query.refetch(); }} />;
  const report = query.data;
  const checkTrend = report.checks.map((check, index) => ({ name: String(index + 1), score: check.pass ? 100 : 0 }));

  async function exportData(format: TaxExportFormat) {
    if (!report.export_allowed) return;
    setExporting(format);
    try { await downloadTaxExport(merchantId, period, format); toast({ title: "Đã tạo bộ xuất", description: "Tệp chỉ là dữ liệu nháp để kiểm tra hoặc nhập vào hệ thống kế toán.", tone: "success" }); }
    catch (error) { toast({ title: "Chưa thể xuất dữ liệu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", tone: "danger" }); }
    finally { setExporting(undefined); }
  }

  return (
    <div className="space-y-7 animate-[route-in_240ms_ease-out]">
      <PageHeader eyebrow="Kiểm tra quyết định" period={periodLabel} title="Sẵn sàng thuế" description="Một cổng kiểm tra minh bạch trước khi tạo bộ dữ liệu nháp. TaxLens không nộp tờ khai hoặc gửi dữ liệu tới cơ quan thuế." />

      {/* Expandable context */}
      <details className="rounded-xl border bg-surface p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-text-secondary">
          <ChevronDown aria-hidden size={16} className="transition-transform" />
          Kiểm tra này có nghĩa gì?
        </summary>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          TaxLens kiểm tra 5 tiêu chí trước khi cho phép xuất dữ liệu. Đây là cổng an toàn — không phải nộp thuế. Mỗi tiêu chí phải đạt để mở khóa xuất.
        </p>
      </details>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card variant="information" className="grid gap-7 p-7 sm:grid-cols-[auto_1fr] sm:items-center sm:p-9"><ReadinessRing score={report.score} /><div><StatusPill className="bg-surface" status={report.export_allowed ? "Sẵn sàng" : "Chưa sẵn sàng"} /><h2 className="font-display mt-5 text-3xl sm:text-4xl">{report.export_allowed ? "Bộ dữ liệu tháng 7 đã qua mọi cổng kiểm tra." : `Còn ${report.blockers.length} tiêu chí đang chặn bộ xuất.`}</h2><p className="mt-3 text-sm leading-6 text-text">Điểm được tính từ dữ liệu persisted. Việc đạt điểm cao không vượt qua được một tiêu chí bắt buộc đang thất bại.</p></div></Card>
        <Card variant="workspace"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Trạng thái xuất</p><div className="mt-5 flex items-start gap-3">{report.export_allowed ? <ShieldCheck aria-hidden className="text-success" size={25} /> : <LockKeyhole aria-hidden className="text-warning" size={25} />}<div><h2 className="font-display text-2xl">{report.export_allowed ? "Đã mở khóa" : "Đang khóa an toàn"}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{report.export_allowed ? "Bạn có thể tải JSON hoặc CSV để kiểm tra và chuyển tiếp có kiểm soát." : "Hoàn tất các blocker bên dưới. TaxLens sẽ tự tính lại sau mỗi quyết định được lưu."}</p></div></div><dl className="mt-7 grid grid-cols-2 gap-4 border-t pt-5"><Fact label="Rule version" value={report.rule_version ?? "Chưa có"} /><Fact label="Hiệu lực" value={report.effective_from ?? "Chưa xác định"} /></dl></Card>
      </section>
      <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Tiến độ theo tiêu chí</p><h2 className="font-display mt-2 text-2xl">Mức kiểm tra đã đạt</h2></div><span className="text-sm text-text-secondary">{report.checks.filter((check) => check.pass).length}/{report.checks.length} tiêu chí</span></div><div className="mt-5 h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={checkTrend}><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--taxlens-text-secondary)" }} /><YAxis hide domain={[0, 100]} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--taxlens-border)", background: "var(--taxlens-surface)" }} /><Area type="monotone" dataKey="score" name="Đạt" stroke="var(--taxlens-secondary)" fill="var(--taxlens-accent)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card>
      <section><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Năm cổng kiểm tra</p><h2 className="font-display mt-2 text-3xl">Checklist sẵn sàng</h2></div><div className="divide-y overflow-hidden rounded-xl border bg-surface">{report.checks.map((check, index) => <CheckRow key={check.item} check={check} index={index + 1} />)}</div></section>
      <section><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Bộ dữ liệu nháp</p><h2 className="font-display mt-2 text-3xl">Xuất để kiểm tra</h2></div><Card className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><h3 className="text-sm font-semibold">Không phải hành động nộp thuế</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Các tệp JSON và CSV chứa giao dịch, phân bổ, phân loại, hóa đơn và phiên bản quy tắc đã dùng. TaxLens chỉ tạo bản nháp để review, không tự nộp hoặc gửi sang hệ thống kế toán.</p></div><div className="grid gap-2 sm:grid-cols-2">{([ ["json", "JSON"], ["csv", "CSV"] ] as Array<[TaxExportFormat, string]>).map(([format, label]) => <Button key={format} variant={format === "csv" ? "primary" : "outline"} disabled={!report.export_allowed || Boolean(exporting)} onClick={() => void exportData(format)}>{report.export_allowed ? <Download aria-hidden size={16} /> : <LockKeyhole aria-hidden size={16} />}{exporting === format ? "Đang tạo..." : label}</Button>)}</div></Card></section>
    </div>
  );
}

function ReadinessRing({ score }: { score: number }) {
  return <div className="relative size-36 shrink-0" role="img" aria-label={`Mức sẵn sàng ${score}%`}><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="68%" outerRadius="100%" barSize={12} data={[{ value: score }]} startAngle={90} endAngle={-270}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="value" cornerRadius={8} fill="var(--taxlens-secondary)" background={{ fill: "var(--taxlens-border)" }} /></RadialBarChart></ResponsiveContainer><span className="font-display absolute inset-0 grid place-items-center text-4xl">{score}<small className="ml-14 mt-3 text-base">%</small></span></div>;
}

function CheckRow({ check, index }: { check: ReadinessCheck; index: number }) {
  const explanation = checkExplanations[check.item];
  return <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"><span className="font-mono grid size-8 place-items-center rounded-full border text-xs">{index}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{checkLabels[check.item] ?? check.item}</h3><StatusPill status={check.pass ? "Đạt" : "Cần xử lý"} /></div>{explanation && <p className="mt-1 text-xs text-text-tertiary">{explanation}</p>}<p className="mt-2 text-sm text-text-secondary">{check.details ?? `Giá trị ${String(check.value)}, ngưỡng ${String(check.threshold)}`}</p></div>{check.pass ? <Check aria-label="Đạt" className="text-success" size={20} /> : check.action_href ? <Link href={check.action_href} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:underline">Xử lý ngay<ArrowRight aria-hidden size={16} /></Link> : <X aria-label="Chưa đạt" className="text-danger" size={20} />}</div>;
}
function Fact({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>; }
