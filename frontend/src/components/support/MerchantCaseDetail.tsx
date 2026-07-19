"use client";

import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock, FileClock, Headphones } from "lucide-react";
import { useCaseDetail } from "@/hooks/useAgentOps";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";

function statusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["RESOLVED", "CLOSED"].includes(status)) return "success";
  if (["OPEN", "PENDING"].includes(status)) return "warning";
  if (["ASSIGNED"].includes(status)) return "info";
  return "neutral";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "Đang mở",
    ASSIGNED: "Đã tiếp nhận",
    PENDING: "Chờ xử lý",
    RESOLVED: "Đã giải quyết",
    CLOSED: "Đã đóng",
  };
  return map[status] ?? status;
}

function when(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function suggestionText(suggestion: Record<string, unknown> | null): string {
  if (!suggestion) return "Không có";
  const reason = suggestion.reason;
  const classification = suggestion.classification;
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (typeof classification === "string" && classification.length > 0) return classification;
  return "Không có";
}

const topicLabels: Record<string, string> = {
  missing_invoice: "Thiếu hóa đơn",
  unmatched_transaction: "Giao dịch chưa khớp",
  cash_discrepancy: "Chênh lệch tiền mặt",
  invoice_issue: "Lỗi hóa đơn",
  other: "Vấn đề khác",
};

export function MerchantCaseDetail({ caseId }: { caseId: string }) {
  const session = useMerchantSession();
  const { periodLabel } = useReportingPeriod();
  const detail = useCaseDetail(caseId);

  if (session.isPending || detail.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Đồng hành cùng SHB" title="Chi tiết yêu cầu" period={periodLabel} />
        <LoadingState label="Đang tải case" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Đồng hành cùng SHB" title="Chi tiết yêu cầu" period={periodLabel} />
        <ErrorState
          title="Không tải được case"
          description={detail.error?.message ?? "Vui lòng thử lại."}
          retry={() => detail.refetch()}
        />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Đồng hành cùng SHB" title="Chi tiết yêu cầu" period={periodLabel} />
        <EmptyState title="Không tìm thấy case" description="Case có thể đã bị đóng hoặc không tồn tại." />
      </div>
    );
  }

  const item = detail.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Đồng hành cùng SHB"
        merchant="Salon Hương"
        period={periodLabel}
        title="Chi tiết yêu cầu"
        description={`Case ${item.id}`}
        actions={<Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>}
      />

      <div>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:underline"
        >
          <ArrowLeft aria-hidden size={16} />
          Quay lại danh sách yêu cầu
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness aria-hidden className="text-secondary" size={18} />
            <p className="text-[13px] font-medium text-text-tertiary">Ưu tiên</p>
          </div>
          <p className="mt-3 font-display text-2xl text-ink">{item.priority}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Clock aria-hidden className="text-secondary" size={18} />
            <p className="text-[13px] font-medium text-text-tertiary">Ngày tạo</p>
          </div>
          <p className="mt-3 text-sm text-ink">{when(item.created_at)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Headphones aria-hidden className="text-secondary" size={18} />
            <p className="text-[13px] font-medium text-text-tertiary">Nhân viên phụ trách</p>
          </div>
          <p className="mt-3 text-sm text-ink">{item.assigned_rm_id ?? "Chưa gán"}</p>
        </Card>
      </section>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-secondary">Ngoại lệ liên kết</p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              {item.exception_count} điểm cần làm rõ
            </h3>
          </div>
          <FileClock aria-hidden className="text-secondary" size={24} />
        </div>

        {item.exceptions.length === 0 ? (
          <p className="mt-5 text-sm text-text-secondary">Không có ngoại lệ nào liên kết.</p>
        ) : (
          <div className="mt-5 divide-y">
            {item.exceptions.map((ex) => (
              <div key={ex.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {topicLabels[ex.exception_type] ?? ex.exception_type}
                  </span>
                  <Badge tone={statusTone(ex.status)}>{statusLabel(ex.status)}</Badge>
                </div>
                <dl className="mt-3 grid gap-3 text-xs text-text-secondary sm:grid-cols-2">
                  <div>
                    <dt>Mã giao dịch</dt>
                    <dd className="mt-1 font-mono text-ink">{ex.bank_transaction_id ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Mã đơn hàng</dt>
                    <dd className="mt-1 font-mono text-ink">{ex.sale_id ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Mô tả từ SHB</dt>
                    <dd className="mt-1 text-ink">{suggestionText(ex.ai_suggestion)}</dd>
                  </div>
                  <div>
                    <dt>Quyết định</dt>
                    <dd className="mt-1 text-ink">{ex.human_decision ?? "Chưa có"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      {["RESOLVED", "CLOSED"].includes(item.status) && (
        <Card variant="information">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden className="text-success" size={20} />
            <p className="font-semibold text-ink">
              Yêu cầu đã được giải quyết
            </p>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            SHB đã xử lý xong case này. Nếu bạn cần hỗ trợ thêm, vui lòng tạo yêu cầu mới.
          </p>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/support">
          <Button variant="outline">Tạo yêu cầu mới</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">Về trang chính</Button>
        </Link>
      </div>
    </div>
  );
}
