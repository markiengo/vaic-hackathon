import {
  Bot,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  FileClock,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LucideIcon,
  ReceiptText,
  Scale,
  ScrollText,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  group?: "VẬN HÀNH" | "GIÁM SÁT HỆ THỐNG";
};

export const merchantNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Tổng quan", shortLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/assistant", label: "Trợ lý TaxLens", shortLabel: "Trợ lý", icon: Bot },
  { href: "/transactions", label: "Giao dịch", icon: WalletCards },
  { href: "/exceptions", label: "Cần xác nhận", shortLabel: "Xác nhận", icon: ListChecks },
  { href: "/invoices", label: "Hóa đơn", icon: ReceiptText },
  { href: "/sales", label: "Bán hàng", icon: ShoppingBag },
  { href: "/tax-readiness", label: "Sẵn sàng thuế", shortLabel: "Thuế", icon: FileCheck2 },
];

export const operationsNavigation: NavigationItem[] = [
  { href: "/ops", label: "Tổng quan", shortLabel: "Tổng quan", icon: Gauge, group: "VẬN HÀNH" },
  { href: "/ops/merchants", label: "Merchant", icon: Building2, group: "VẬN HÀNH" },
  { href: "/ops/cases", label: "Cases", icon: BriefcaseBusiness, group: "VẬN HÀNH" },
  { href: "/ops/agent-runs", label: "Agent runs", icon: FileClock, group: "GIÁM SÁT HỆ THỐNG" },
  { href: "/ops/audit", label: "Truy vết & kiểm toán", shortLabel: "Kiểm toán", icon: ScrollText, group: "GIÁM SÁT HỆ THỐNG" },
  { href: "/ops/compliance", label: "Tuân thủ", icon: Scale, group: "GIÁM SÁT HỆ THỐNG" },
];
