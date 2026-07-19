import type { MatchStatus } from "@/lib/domain/types";
import type { TaxLensStatus } from "@/components/ui";

export const DEMO_PERIOD = "2026-07";

const _vndFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Không có số tiền hợp lệ";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "Không có số tiền hợp lệ";
  return _vndFormatter.format(num);
}

export function formatMoneyOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return _vndFormatter.format(num);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatTimeFirst(value?: string | null) {
  if (!value) return "Chưa ghi nhận";
  const d = new Date(value);
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  return `${time} · ${date}`;
}

export function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function formatConfidence(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Chưa xác định";
  const percentage = value <= 1 ? value * 100 : value;
  return `${Math.round(Math.min(100, Math.max(0, percentage)))}%`;
}

export function matchStatusLabel(status: MatchStatus | string | null): TaxLensStatus {
  if (status === "matched") return "Đã khớp";
  if (status === "ambiguous") return "Cần xác nhận";
  if (status === "partial") return "Sai số tiền";
  if (status === "unmatched") return "Chưa phân loại";
  return "Chưa xác định";
}

const classificationLabels: Record<string, string> = {
  revenue: "Doanh thu",
  service_payment: "Thanh toán dịch vụ",
  internal_transfer: "Chuyển nội bộ",
  debt_payment: "Thanh toán nợ",
  loan: "Khoản vay",
  deposit: "Tiền đặt cọc",
  refund: "Hoàn tiền",
  expense: "Chi phí",
  other: "Khác",
};

export function humanize(value?: string | null) {
  if (!value) return "Chưa xác định";
  return classificationLabels[value] ?? value.replaceAll("_", " ");
}

export function sourceLabel(value?: string | null) {
  if (!value) return "Chưa rõ";
  const labels: Record<string, string> = {
    SHB: "SHB",
    sepay: "SePay",
    csv: "CSV",
    manual: "Thủ công",
  };
  return labels[value] ?? value;
}
