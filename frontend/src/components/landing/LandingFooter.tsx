import Link from "next/link";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";

const columns = [
  {
    title: "Nền tảng",
    links: [
      { label: "Tổng quan", href: "#neng-tang" },
      { label: "Trợ lý TaxLens", href: "#neng-tang" },
      { label: "SHB Operations", href: "#gia-tri-shb" },
      { label: "Agent Runs", href: "#neng-tang" },
    ],
  },
  {
    title: "Kiểm soát",
    links: [
      { label: "Cases", href: "#gia-tri-shb" },
      { label: "Truy vết & kiểm toán", href: "#an-toan" },
      { label: "Tuân thủ", href: "#an-toan" },
      { label: "An toàn dữ liệu", href: "#an-toan" },
    ],
  },
  {
    title: "Tài nguyên",
    links: [
      { label: "Kiến trúc", href: "#neng-tang" },
      { label: "Kịch bản demo", href: "#demo" },
      { label: "Tài liệu tích hợp", href: "#neng-tang" },
      { label: "Liên hệ", href: "#demo" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { label: "Điều khoản", href: "#" },
      { label: "Quyền riêng tư", href: "#" },
      { label: "Bảo mật", href: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <TaxLensLogo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-text-secondary">
              TaxLens là lớp điều phối và kiểm soát TaxOps dành cho hệ sinh thái merchant SME. Nền tảng kết nối dữ liệu vận hành, AI agents, human approval và audit evidence mà không thay thế các hệ thống hiện có.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-text">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-text-tertiary sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} TaxLens. Định hướng triển khai cùng SHB.</span>
          <span className="font-mono">v0.1.0 — Hackathon MVP</span>
        </div>
      </div>
    </footer>
  );
}
