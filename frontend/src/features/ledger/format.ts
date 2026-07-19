import type { MatchStatus } from "@/lib/domain/types";
import type { TaxLensStatus } from "@/components/ui";

export const DEMO_PERIOD = "2026-07";
export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
  return "Chưa xác định";
}

export function humanize(value?: string | null) {
  if (!value) return "Chưa phân loại";
  const labels: Record<string, string> = {
    revenue: "Doanh thu",
    internal_transfer: "Chuyển khoản nội bộ",
    loan: "Khoản vay",
    deposit: "Tiền đặt cọc",
    refund: "Hoàn tiền",
    other: "Khác",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}
