"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Headphones,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Select,
  useToast,
} from "@/components/ui";
import { useMerchantSession } from "@/hooks/useMerchantSession";
import { useReportingPeriod } from "@/hooks/useReportingPeriod";
import { createSupportRequest, getCases } from "@/lib/api/agentops";
import { ApiError } from "@/lib/api/client";

const TOPIC_OPTIONS = [
  { value: "missing_invoice", label: "Thiếu hóa đơn" },
  { value: "unmatched_transaction", label: "Giao dịch chưa khớp" },
  { value: "cash_discrepancy", label: "Chênh lệch tiền mặt" },
  { value: "invoice_issue", label: "Lỗi hóa đơn" },
  { value: "other", label: "Vấn đề khác" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
] as const;

function statusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["RESOLVED", "CLOSED"].includes(status)) return "success";
  if (["OPEN", "PENDING"].includes(status)) return "warning";
  if (["ASSIGNED"].includes(status)) return "info";
  return "neutral";
}

export function SupportWorkspace() {
  const session = useMerchantSession();
  const merchantId = session.data?.user.merchant_id ?? undefined;
  const { period, periodLabel } = useReportingPeriod();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState<string>("missing_invoice");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");

  const supportCases = useQuery({
    queryKey: ["merchant-support-cases", merchantId, period],
    queryFn: () => getCases(),
    enabled: Boolean(merchantId),
    select: (data) => data.cases.filter((c) => c.merchant_id === merchantId),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      createSupportRequest({
        merchantId: merchantId!,
        period,
        topic,
        description,
        priority,
      }),
    onSuccess: (data) => {
      toast({
        title: data.created ? "Đã gửi yêu cầu hỗ trợ" : "Yêu cầu đã tồn tại",
        description: data.created
          ? `Case ${data.case_id} đã được tạo. SHB sẽ tiếp nhận và phản hồi.`
          : `Case ${data.case_id} đang được xử lý.`,
        tone: "success",
      });
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["merchant-support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["ops-cases"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Không thể gửi yêu cầu.";
      toast({ title: "Gửi yêu cầu thất bại", description: message, tone: "danger" });
    },
  });

  if (session.isPending) {
    return (
      <div className="animate-[route-in_240ms_ease-out] space-y-8">
        <div className="space-y-3">
          <div className="skeleton-shimmer h-4 w-48 rounded-md" />
          <div className="skeleton-shimmer h-12 w-72 rounded-md" />
        </div>
        <div className="skeleton-shimmer h-96 rounded-2xl" />
      </div>
    );
  }

  if (session.isError || !merchantId) {
    return (
      <ErrorState
        title="Chưa thể mở trang hỗ trợ"
        description="TaxLens chưa lấy được thông tin merchant. Vui lòng thử lại."
        retry={() => session.refetch()}
      />
    );
  }

  const myCases = supportCases.data ?? [];

  return (
    <div className="animate-[route-in_240ms_ease-out] space-y-8">
      <PageHeader
        eyebrow="Đồng hành cùng SHB"
        merchant="Salon Hương"
        period={periodLabel}
        title="Hỗ trợ"
        description="Tạo yêu cầu hỗ trợ có đầy đủ hồ sơ, bằng chứng và trạng thái xử lý thay vì gửi một câu hỏi rời rạc."
      />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-secondary">
              <Headphones aria-hidden size={22} />
            </span>
            <div>
              <h3 className="font-display text-2xl text-ink">Gửi yêu cầu hỗ trợ</h3>
              <p className="mt-1 text-sm text-text-secondary">
                SHB sẽ tiếp nhận yêu cầu và phản hồi trong vòng 3 ngày làm việc.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <Select
              label="Chủ đề"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

            <Select
              label="Mức độ ưu tiên"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

            <Field
              label="Mô tả vấn đề"
              hint="Mô tả cụ thể vấn đề bạn gặp phải, bao gồm mã giao dịch hoặc mã đơn hàng nếu có."
              required
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="min-h-24 w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-ink placeholder:text-text-secondary"
                placeholder="Ví dụ: Đơn hàng ORDER-AB123456 đã thanh toán nhưng chưa thấy hóa đơn..."
              />
            </Field>

            <div className="flex items-center gap-3">
              <Button
                disabled={!description.trim() || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (
                  "Đang gửi..."
                ) : (
                  <>
                    <Send aria-hidden size={16} />
                    Gửi yêu cầu
                  </>
                )}
              </Button>
              {submitMutation.isSuccess && (
                <span className="inline-flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 aria-hidden size={16} />
                  Đã gửi thành công
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card variant="information">
          <div className="flex items-center gap-2">
            <TriangleAlert aria-hidden className="text-warning" size={20} />
            <h3 className="font-semibold">Khi nào nên liên hệ SHB?</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>• Giao dịch đã thanh toán nhưng không khớp với đơn hàng nào</li>
            <li>• Hóa đơn bị thiếu hoặc sai thông tin doanh thu</li>
            <li>• Chênh lệch tiền mặt trong ca làm việc</li>
            <li>• Cần xác nhận phân loại giao dịch có giá trị lớn</li>
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-text-secondary">
              Yêu cầu sẽ được chuyển thẳng đến đội SHB Operations. Bạn có thể theo dõi trạng thái xử lý ở danh sách bên dưới.
            </p>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-secondary">Yêu cầu đang xử lý</p>
            <h2 className="mt-1 font-display text-3xl text-ink">Cases của bạn</h2>
          </div>
        </div>

        {supportCases.isLoading && (
          <div className="skeleton-shimmer h-32 rounded-xl" />
        )}

        {supportCases.isError && (
          <ErrorState
            title="Không tải được danh sách cases"
            description={supportCases.error?.message ?? "Vui lòng thử lại."}
            retry={() => supportCases.refetch()}
          />
        )}

        {supportCases.data && myCases.length === 0 && (
          <EmptyState
            title="Chưa có yêu cầu hỗ trợ"
            description="Các yêu cầu bạn gửi sẽ xuất hiện tại đây với trạng thái xử lý."
          />
        )}

        {supportCases.data && myCases.length > 0 && (
          <div className="grid gap-3">
            {myCases.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness aria-hidden className="shrink-0 text-secondary" size={18} />
                    <span className="font-mono text-sm font-semibold text-ink">{c.id}</span>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary">
                    <span>Kỳ <strong className="text-ink">{c.period}</strong></span>
                    <span>Ưu tiên <strong className="text-ink">{c.priority}</strong></span>
                    {c.assigned_rm_id && <span>RM <strong className="text-ink">{c.assigned_rm_id}</strong></span>}
                  </div>
                </div>
                <Link
                  href={`/support/${c.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline"
                >
                  Chi tiết
                  <ArrowRight aria-hidden size={14} />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
