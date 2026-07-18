import Link from "next/link";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#neng-tang", label: "Nền tảng" },
  { href: "#gia-tri-shb", label: "Giá trị cho SHB" },
  { href: "#cach-van-hanh", label: "Cách vận hành" },
  { href: "#an-toan", label: "An toàn & kiểm soát" },
  { href: "#demo", label: "Demo" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="TaxLens — trang chủ" className="shrink-0">
          <TaxLensLogo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Điều hướng landing page">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className={cn(
              "hidden rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary transition-colors",
              "hover:bg-neutral-soft sm:inline-flex",
            )}
          >
            Đăng nhập
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Mở bản demo
          </Link>
        </div>
      </div>
    </header>
  );
}
