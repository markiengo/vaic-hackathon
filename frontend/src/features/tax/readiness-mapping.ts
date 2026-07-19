import type { ReadinessCheck } from "@/lib/domain/types";

export type CriteriaStatus = "pass" | "fail" | "not_evaluated";

export interface CriteriaMapping {
  label: string;
  explanation: string;
  actionHref?: string;
  actionLabel?: string;
}

const criteriaMap: Record<string, CriteriaMapping> = {
  merchant_name: {
    label: "Thông tin cửa hàng đầy đủ",
    explanation: "Tên cửa hàng và mã số thuế đã được xác nhận.",
  },
  tax_id: {
    label: "Mã số thuế đã xác nhận",
    explanation: "Mã số thuế của cửa hàng đã được ghi nhận trong hệ thống.",
  },
  revenue_total: {
    label: "Doanh thu trong kỳ đã được tổng hợp",
    explanation: "Có dữ liệu phát sinh doanh thu trong kỳ báo cáo.",
  },
  invoice_count: {
    label: "Đơn đã thanh toán có đủ hóa đơn",
    explanation: "Tỷ lệ đơn đã thanh toán có hóa đơn đạt ngưỡng yêu cầu.",
    actionHref: "/invoices?status=missing",
    actionLabel: "Xử lý đơn thiếu hóa đơn",
  },
  cash_revenue: {
    label: "Các ca tiền mặt đã được đối soát",
    explanation: "Không còn ca tiền mặt đang mở hoặc chênh lệch chưa xử lý.",
  },
  bank_revenue: {
    label: "Giao dịch ngân hàng đã được ghi nhận",
    explanation: "Có giao dịch ngân hàng thuộc kỳ báo cáo được ghi nhận.",
  },
  bank_reconciliation: {
    label: "Đối soát giao dịch ngân hàng",
    explanation: "Mọi giao dịch đã được nối với đơn hàng hoặc phân loại rõ ràng.",
  },
  cash_session_closure: {
    label: "Khép ca tiền mặt",
    explanation: "Ca tiền mặt đã được đối chiếu và đóng.",
  },
  unclassified_transactions: {
    label: "Phân loại toàn bộ giao dịch",
    explanation: "Không còn giao dịch chưa phân loại trong kỳ.",
  },
  missing_invoices: {
    label: "Độ phủ hóa đơn",
    explanation: "Mọi đơn đã thanh toán đều có bằng chứng hóa đơn.",
    actionHref: "/invoices?status=missing",
    actionLabel: "Xử lý đơn thiếu hóa đơn",
  },
  rule_version_valid: {
    label: "Phiên bản quy tắc hợp lệ",
    explanation: "Bộ quy tắc thuế đang dùng là phiên bản mới nhất đã được duyệt.",
  },
  active_rule_version: {
    label: "Bộ quy tắc thuế hiệu lực",
    explanation: "Bộ quy tắc thuế đang dùng là phiên bản mới nhất.",
  },
};

export function criteriaLabel(item: string): string {
  return criteriaMap[item]?.label ?? item;
}

export function criteriaExplanation(item: string): string {
  return criteriaMap[item]?.explanation ?? "";
}

export function criteriaAction(item: string): { href: string; label: string } | null {
  const m = criteriaMap[item];
  if (m?.actionHref && m?.actionLabel) return { href: m.actionHref, label: m.actionLabel };
  return null;
}

export function statusLabel(pass: boolean): string {
  return pass ? "Đã đạt" : "Cần xử lý";
}

export function formatCriteriaValue(check: ReadinessCheck): string {
  if (check.details) return check.details;
  const v = check.value;
  if (typeof v === "number") return v.toLocaleString("vi-VN");
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v ?? "—");
}

export function formatDateVi(value?: string | null): string {
  if (!value) return "Chưa xác định";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch {
    return "Chưa xác định";
  }
}

export function formatDateTimeVi(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    return `${time} · ${date}`;
  } catch {
    return "—";
  }
}
