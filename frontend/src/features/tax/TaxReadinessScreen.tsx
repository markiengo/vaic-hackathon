"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Lock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, Dialog, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { useTaxReadiness } from "@/hooks/useLedger";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { downloadTaxExport, type TaxExportFormat } from "@/lib/api/tax";
import type { ReadinessCheck, TaxReadinessReport } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/ledger/format";
import {
  criteriaAction,
  criteriaExplanation,
  criteriaLabel,
  formatDateVi,
  formatDateTimeVi,
  statusLabel,
} from "@/features/tax/readiness-mapping";

const trendData = [
  { date: "12/07", score: 67, event: null },
  { date: "13/07", score: 67, event: null },
  { date: "14/07", score: 75, event: "Đã xác nhận giao dịch" },
  { date: "15/07", score: 75, event: null },
  { date: "16/07", score: 83, event: "Đã phân loại giao dịch" },
  { date: "17/07", score: 83, event: null },
  { date: "18/07", score: 83, event: null },
];

export function TaxReadinessScreen() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? "";
  const { period, periodLabel } = useReportingPeriod();
  const query = useTaxReadiness(merchantId || undefined, period);
  const [explainOpen, setExplainOpen] = useState(false);
  const [exporting, setExporting] = useState<TaxExportFormat | null>(null);

  if (session.isPending || query.isPending) return <LoadingState label="Đang kiểm tra mức độ sẵn sàng" />;
  if (session.isError || query.isError || !merchantId)
    return (
      <ErrorState
        title="Chưa thể tải báo cáo sẵn sàng"
        description="TaxLens chưa thay đổi bất kỳ dữ liệu nào. Vui lòng thử lại."
        retry={() => { void session.refetch(); void query.refetch(); }}
      />
    );

  const report = query.data;
  const score = report.score ?? 0;
  const passedCount = report.passed_count ?? report.checks.filter((c) => c.pass).length;
  const totalCount = report.total_count ?? report.checks.length;
  const blockingCount = report.blocking_count ?? report.blockers.length;
  const isReady = report.ready && report.export_allowed;
  const checks = report.checks.length > 0 ? report.checks : report.checklist;
  const failedChecks = checks.filter((c) => !c.pass);
  const passedChecks = checks.filter((c) => c.pass);
  const missingSales = report.missing_invoice_sales ?? [];

  async function handleExport(format: TaxExportFormat) {
    setExporting(format);
    try {
      await downloadTaxExport(merchantId, period, format);
    } catch {
      // toast handled by caller
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-12 pb-14 pt-10 lg:px-12" style={{ padding: "40px 48px 56px" }}>
      {/* Page header */}
      <PageHeader
        eyebrow={`${periodLabel} · Báo cáo dữ liệu`}
        title="Sẵn sàng thuế"
        subtitle="Kiểm tra dữ liệu trước khi tạo bộ dữ liệu cho kế toán hoặc quy trình thuế hiện có."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw aria-hidden size={16} className={cn(query.isFetching && "animate-spin")} />
              Tính lại
            </Button>
            <Button
              variant={isReady ? "primary" : "outline"}
              disabled={!isReady}
              title={!isReady ? `Hoàn tất ${blockingCount} tiêu chí còn lại để mở khóa.` : undefined}
            >
              <Download aria-hidden size={16} />
              Xuất dữ liệu
            </Button>
          </>
        }
      />

      {/* Small explanation link */}
      <div className="-mt-6 mb-8">
        <button
          type="button"
          onClick={() => setExplainOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary"
        >
          <HelpCircle aria-hidden size={14} />
          Mức độ sẵn sàng được tính thế nào?
        </button>
      </div>

      {/* Readiness hero + Next action */}
      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)]">
        {/* Left: Overall status */}
        <ReadinessHeroCard
          score={score}
          isReady={isReady}
          passedCount={passedCount}
          totalCount={totalCount}
          blockingCount={blockingCount}
          generatedAt={report.generated_at}
          ruleVersion={report.rule_version}
          effectiveFrom={report.effective_from}
        />

        {/* Right: Next action */}
        <NextActionCard
          failedChecks={failedChecks}
          missingSales={missingSales}
          isReady={isReady}
          period={period}
          totalCount={totalCount}
          passedCount={passedCount}
        />
      </section>

      {/* 7-day trend chart */}
      <section className="mb-8">
        <Card className="p-6">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-ink">Mức độ hoàn thiện trong 7 ngày</h3>
              <p className="mt-0.5 text-xs text-text-secondary">Tiến độ sau mỗi lần đồng bộ hoặc xử lý vấn đề.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
              <TrendingUp aria-hidden size={14} />
              +16% trong tuần
            </span>
          </div>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EE" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={{ stroke: "#E5E7EE" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E5E7EE",
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  formatter={(value) => [`${value}%`, "Hoàn thiện"]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#readinessFill)"
                  dot={{ r: 3, fill: "#3B82F6" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            Biểu đồ mức độ hoàn thiện trong 7 ngày: 67% vào ngày 12/07, tăng lên 75% vào ngày 14/07 sau khi xác nhận giao dịch, đạt 83% từ ngày 16/07.
          </p>
        </Card>
      </section>

      {/* Criteria checklist */}
      <section className="mb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-xl text-ink">Các tiêu chí kiểm tra</h3>
          <span className="text-sm text-text-secondary">
            {passedCount} đã đạt · {blockingCount} cần xử lý
          </span>
        </div>

        {/* Failed criteria first */}
        {failedChecks.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Cần xử lý — {failedChecks.length}
            </p>
            <div className="space-y-3">
              {failedChecks.map((check) => (
                <FailedCriteriaRow key={check.item} check={check} missingSales={missingSales} period={period} />
              ))}
            </div>
          </div>
        )}

        {/* Passed criteria */}
        {passedChecks.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Đã đạt — {passedChecks.length}
            </p>
            <Card className="divide-y">
              {passedChecks.map((check) => (
                <PassedCriteriaRow key={check.item} check={check} ruleVersion={report.rule_version} effectiveFrom={report.effective_from} period={periodLabel} />
              ))}
            </Card>
          </div>
        )}
      </section>

      {/* Export section */}
      <ExportSection
        isReady={isReady}
        blockingCount={blockingCount}
        passedCount={passedCount}
        totalCount={totalCount}
        ruleVersion={report.rule_version}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Explanation dialog */}
      <Dialog
        open={explainOpen}
        onOpenChange={setExplainOpen}
        title="Mức độ sẵn sàng được tính thế nào?"
        description="TaxLens kiểm tra chất lượng dữ liệu trước khi tạo bộ xuất."
      >
        <div className="space-y-3 text-sm leading-6 text-text-secondary">
          <p>Đây là kiểm tra chất lượng dữ liệu, không phải tờ khai thuế. TaxLens không nộp tờ khai thay bạn.</p>
          <p>Điểm tổng thể là tỷ lệ tiêu chí đã đạt. Điểm cao không vượt qua tiêu chí bắt buộc đang thất bại.</p>
          <p>Mọi tiêu chí bắt buộc đều phải đạt để mở khóa xuất dữ liệu.</p>
          <p>Kết quả được tính bằng bộ quy tắc xác định, có phiên bản và ngày hiệu lực rõ ràng.</p>
        </div>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---

function ReadinessHeroCard({
  score,
  isReady,
  passedCount,
  totalCount,
  blockingCount,
  generatedAt,
  ruleVersion,
  effectiveFrom,
}: {
  score: number;
  isReady: boolean;
  passedCount: number;
  totalCount: number;
  blockingCount: number;
  generatedAt: string;
  ruleVersion: string | null;
  effectiveFrom: string | null;
}) {
  const statusText = isReady ? "Sẵn sàng" : "Chưa sẵn sàng";
  const headline = isReady
    ? "Mọi tiêu chí đã đạt"
    : `Còn ${blockingCount} tiêu chí bắt buộc cần xử lý`;
  const supporting = isReady
    ? "Tất cả tiêu chí kiểm tra đã hoàn tất. Bạn có thể tạo bộ dữ liệu xuất."
    : `${passedCount} trong ${totalCount} tiêu chí đã đạt. Điểm tổng thể không thể mở khóa xuất dữ liệu khi vẫn còn tiêu chí bắt buộc chưa hoàn tất.`;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="flex items-center gap-6 p-7">
      {/* Radial chart */}
      <div className="relative shrink-0">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E7EE" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={isReady ? "#22C55E" : "#3B82F6"}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-ink">{score}%</span>
          <span className="text-[10px] font-medium text-text-tertiary">Hoàn thiện</span>
        </div>
      </div>

      {/* Status text */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            isReady ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700",
          )}
        >
          {isReady ? <CheckCircle2 aria-hidden size={14} /> : <AlertTriangle aria-hidden size={14} />}
          {statusText}
        </span>
        <h3 className="font-display mt-3 text-2xl leading-tight text-ink">{headline}</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{supporting}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary">
          <span>Tính lúc {formatDateTimeVi(generatedAt)}</span>
          {ruleVersion && (
            <span>
              Quy tắc <span className="font-mono">{ruleVersion}</span>
              {effectiveFrom && ` · Hiệu lực từ ${formatDateVi(effectiveFrom)}`}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function NextActionCard({
  failedChecks,
  missingSales,
  isReady,
  period,
  totalCount,
  passedCount,
}: {
  failedChecks: ReadinessCheck[];
  missingSales: string[];
  isReady: boolean;
  period: string;
  totalCount: number;
  passedCount: number;
}) {
  if (isReady) {
    return (
      <Card className="flex flex-col justify-center p-7">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle2 aria-hidden size={14} />
          Hoàn tất
        </span>
        <h3 className="font-display mt-3 text-2xl leading-tight text-ink">Mọi tiêu chí đã đạt</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Bộ dữ liệu đã sẵn sàng để xuất. Tạo bộ dữ liệu CSV hoặc JSON cho kế toán hoặc hệ thống thuế hiện có.
        </p>
        <p className="mt-4 text-xs text-text-tertiary">
          {passedCount}/{totalCount} tiêu chí đã đạt
        </p>
      </Card>
    );
  }

  const primaryBlocker = failedChecks[0];
  if (!primaryBlocker) return null;

  const action = criteriaAction(primaryBlocker.item);
  const label = criteriaLabel(primaryBlocker.item);
  const detail = primaryBlocker.details ?? "";

  // Build headline from the blocker
  let headline = label;
  let supportingData: string | null = null;
  let salesList: string[] = [];

  if (primaryBlocker.item === "invoice_count" || primaryBlocker.item === "missing_invoices") {
    const parts = detail.match(/(\d+)\/(\d+)/);
    if (parts) {
      supportingData = `${parts[1]}/${parts[2]} đơn đã thanh toán có hóa đơn\n${Number(parts[2]) - Number(parts[1])} đơn còn thiếu`;
    }
    salesList = missingSales.slice(0, 4);
  }

  return (
    <Card className="flex flex-col p-7" style={{ borderColor: "#F97316", borderWidth: 1 }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">
        Việc cần làm tiếp theo
      </p>
      <h3 className="font-display mt-3 text-2xl leading-tight text-ink">{headline}</h3>

      {supportingData && (
        <div className="mt-3 space-y-0.5 text-sm text-text-secondary">
          {supportingData.split("\n").map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {salesList.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {salesList.map((saleId) => (
            <span
              key={saleId}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-xs font-medium text-ink"
            >
              {saleId}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {action && (
          <Link
            href={`${action.href}${action.href.includes("?") ? "&" : "?"}period=${period}`}
            className={buttonVariants({ variant: "primary" })}
          >
            {action.label}
          </Link>
        )}
        <Link href="#criteria" className={buttonVariants({ variant: "outline" })}>
          Xem chi tiết tiêu chí
        </Link>
      </div>

      <p className="mt-5 border-t border-border pt-3 text-xs text-text-tertiary">
        Hoàn tất mục này sẽ mở khóa tạo bộ dữ liệu.
      </p>
    </Card>
  );
}

function FailedCriteriaRow({
  check,
  missingSales,
  period,
}: {
  check: ReadinessCheck;
  missingSales: string[];
  period: string;
}) {
  const label = criteriaLabel(check.item);
  const explanation = criteriaExplanation(check.item);
  const action = criteriaAction(check.item);
  const detail = check.details ?? "";

  let impact = "Chưa thể xuất bộ dữ liệu hoàn chỉnh.";
  let extra = "";

  if (check.item === "invoice_count" || check.item === "missing_invoices") {
    const parts = detail.match(/(\d+)\/(\d+)/);
    if (parts) {
      extra = `${parts[1]} trong ${parts[2]} đơn đã thanh toán có hóa đơn.`;
      const missing = Number(parts[2]) - Number(parts[1]);
      if (missingSales.length > 0) {
        extra += ` Còn thiếu hóa đơn cho ${missingSales.slice(0, 3).join(", ")}`;
        if (missingSales.length > 3) extra += ` và ${missingSales.length - 3} đơn khác`;
        extra += ".";
      }
    }
  }

  return (
    <Card className="p-5" style={{ borderColor: "#FED7AA", backgroundColor: "#FFF7ED" }}>
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden size={20} className="mt-0.5 shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-ink">{label}</h4>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {extra || explanation}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">Ảnh hưởng:</span> {impact}
          </p>
          {action && (
            <Link
              href={`${action.href}${action.href.includes("?") ? "&" : "?"}period=${period}`}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-4")}
            >
              {action.label}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function PassedCriteriaRow({
  check,
  ruleVersion,
  effectiveFrom,
  period,
}: {
  check: ReadinessCheck;
  ruleVersion: string | null;
  effectiveFrom: string | null;
  period: string;
}) {
  const label = criteriaLabel(check.item);
  let explanation = criteriaExplanation(check.item);

  // Enhance explanation with real data
  if (check.item === "revenue_total" && typeof check.value === "number" && check.value > 0) {
    explanation = `Tổng doanh thu ${period}: ${formatMoney(check.value)}`;
  } else if (check.item === "bank_revenue" && typeof check.value === "number") {
    explanation = `${check.value} giao dịch ngân hàng thuộc kỳ báo cáo.`;
  } else if (check.item === "rule_version_valid" || check.item === "active_rule_version") {
    if (ruleVersion) {
      explanation = `Đang sử dụng quy tắc ${ruleVersion}`;
      if (effectiveFrom) explanation += `, hiệu lực từ ${formatDateVi(effectiveFrom)}`;
      explanation += ".";
    }
  } else if (check.details) {
    // Use detail but translate common patterns
    const parts = check.details.match(/(\d+)\/(\d+) paid sales invoiced/);
    if (parts) {
      explanation = `${parts[1]} trong ${parts[2]} đơn đã thanh toán có hóa đơn.`;
    }
  }

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <CheckCircle2 aria-hidden size={18} className="mt-0.5 shrink-0 text-green-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-text-secondary">{explanation}</p>
      </div>
    </div>
  );
}

function ExportSection({
  isReady,
  blockingCount,
  passedCount,
  totalCount,
  ruleVersion,
  onExport,
  exporting,
}: {
  isReady: boolean;
  blockingCount: number;
  passedCount: number;
  totalCount: number;
  ruleVersion: string | null;
  onExport: (format: TaxExportFormat) => void;
  exporting: TaxExportFormat | null;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-ink">
            {isReady ? "Bộ dữ liệu đã sẵn sàng" : "Bộ dữ liệu chưa thể xuất"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {isReady
              ? `Dữ liệu đã được kiểm tra bằng quy tắc ${ruleVersion ?? "—"}.`
              : `Hoàn tất ${blockingCount} mục còn thiếu để tạo bộ dữ liệu CSV và JSON.`}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {passedCount}/{totalCount} tiêu chí đã đạt
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isReady ? (
            <>
              <Button variant="outline" onClick={() => onExport("csv")} disabled={exporting === "csv"}>
                <Download aria-hidden size={16} />
                {exporting === "csv" ? "Đang tạo..." : "Xuất CSV"}
              </Button>
              <Button variant="outline" onClick={() => onExport("json")} disabled={exporting === "json"}>
                <Download aria-hidden size={16} />
                {exporting === "json" ? "Đang tạo..." : "Xuất JSON"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled>
                <Lock aria-hidden size={14} />
                CSV — Đang khóa
              </Button>
              <Button variant="outline" disabled>
                <Lock aria-hidden size={14} />
                JSON — Đang khóa
              </Button>
              <Link href="/invoices?status=missing" className={buttonVariants({ variant: "primary" })}>
                <AlertTriangle aria-hidden size={16} />
                Xử lý vấn đề còn lại
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="mt-5 border-t border-border pt-4 text-xs text-text-tertiary">
        TaxLens tạo bộ dữ liệu để kiểm tra và chuyển sang hệ thống hiện có. TaxLens không tự nộp tờ khai thuế.
      </p>
    </Card>
  );
}
