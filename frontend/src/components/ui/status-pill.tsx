import { cn } from "@/lib/utils";

const statuses = {
  "Đã khớp": "neutral",
  "Cần xác nhận": "warning",
  "Chưa xác định": "neutral",
  "Thiếu hóa đơn": "danger",
  "Sai số tiền": "danger",
  "Chờ đồng bộ": "info",
  "Đã hoàn tiền": "neutral",
  "Đã thanh toán": "neutral",
  "Chưa thanh toán": "warning",
  "Đạt": "success",
  "Cần xử lý": "warning",
  "Chưa sẵn sàng": "warning",
  "Sẵn sàng": "success",
} satisfies Record<string, "neutral" | "warning" | "danger" | "info" | "success">;

export type TaxLensStatus = keyof typeof statuses;

const toneClasses = {
  neutral: "bg-gray-100 text-gray-700",
  warning: "bg-[#FFF3E0] text-primary",
  danger: "bg-danger/10 text-danger",
  info: "bg-[#EAF0FF] text-secondary",
  success: "bg-success/10 text-success",
};

export function StatusPill({ status, className }: { status: TaxLensStatus; className?: string }) {
  const tone = statuses[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium", toneClasses[tone], className)}>
      {status}
    </span>
  );
}
