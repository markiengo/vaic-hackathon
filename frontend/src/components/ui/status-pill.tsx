import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  FileX,
  HelpCircle,
  RefreshCw,
  Undo,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statuses = {
  "Đã khớp": ["neutral", Check],
  "Cần xác nhận": ["warning", Clock],
  "Chưa xác định": ["neutral", HelpCircle],
  "Thiếu hóa đơn": ["danger", FileX],
  "Sai số tiền": ["danger", AlertTriangle],
  "Chờ đồng bộ": ["info", RefreshCw],
  "Đã hoàn tiền": ["neutral", Undo],
  "Đã thanh toán": ["neutral", CheckCircle],
  "Chưa thanh toán": ["warning", Clock],
  "Đạt": ["success", Check],
  "Cần xử lý": ["warning", Clock],
  "Chưa sẵn sàng": ["warning", Clock],
  "Sẵn sàng": ["success", CheckCircle],
} satisfies Record<string, readonly ["neutral" | "warning" | "danger" | "info" | "success", LucideIcon]>;

export type TaxLensStatus = keyof typeof statuses;

const toneClasses = {
  neutral: "border-border-strong bg-background text-text-secondary",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-secondary/25 bg-accent text-text",
  success: "border-success/25 bg-success/10 text-success",
};

export function StatusPill({ status, className }: { status: TaxLensStatus; className?: string }) {
  const [tone, Icon] = statuses[status];
  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      <Icon aria-hidden size={14} />
      {status}
    </span>
  );
}
