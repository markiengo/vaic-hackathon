"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, LogOut, Moon, Settings, Sparkles, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";
import { merchantNavigation, NavigationItem, operationsNavigation } from "@/config/navigation";
import { getSession } from "@/lib/api/session";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  workspace?: "merchant" | "operations";
};

function isActive(pathname: string, href: string) {
  return href === "/ops" || href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return items.map((item, index) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);
    const showGroup = item.group && item.group !== items[index - 1]?.group;
    return (
      <div key={item.href} className={showGroup && index > 0 ? "mt-5" : undefined}>
        {showGroup ? <p className="mb-1 px-4 text-[10px] font-semibold tracking-[0.16em] text-text-tertiary">{item.group}</p> : null}
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] whitespace-nowrap text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-text",
            active && "bg-[#EAF0FF] font-semibold text-secondary border-l-4 border-secondary hover:bg-[#EAF0FF] hover:text-secondary",
          )}
        >
          <Icon aria-hidden size={18} strokeWidth={1.9} />
          <span>{item.label}</span>
        </Link>
      </div>
    );
  });
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-10 place-items-center rounded-lg border bg-surface text-text-secondary transition-[background-color,color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:text-text"
        aria-label={mounted ? (dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối") : "Chuyển giao diện"}
      >
        {mounted ? (dark ? <Sun size={18} /> : <Moon size={18} />) : <span aria-hidden className="size-[18px]" />}
    </button>
  );
}

function MobileNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng di động" className="surface-shadow-lg fixed inset-x-3 bottom-3 z-50 flex gap-1 overflow-x-auto rounded-xl border bg-surface p-1.5 md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] text-text-tertiary",
              active && "bg-secondary text-white",
            )}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function FirstVisitHint({ operations }: { operations: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const href = operations ? "/ops" : "/assistant";
  const label = operations ? "Bắt đầu từ Tổng quan" : "Bắt đầu từ Trợ lý AI";
  const desc = operations
    ? "Xem danh mục merchant và hàng chờ cần quyết định."
    : "Nhờ AI kiểm tra sổ sách — chỉ ghi dữ liệu sau khi bạn duyệt.";
  return (
    <div className="mx-6 mb-2 rounded-xl border border-secondary/20 bg-accent/40 p-3">
      <div className="flex items-start gap-2">
        <Sparkles aria-hidden className="mt-0.5 shrink-0 text-secondary" size={15} />
        <div className="min-w-0 flex-1">
          <Link href={href} className="block text-xs font-semibold text-secondary hover:underline">{label}</Link>
          <p className="mt-1 text-[11px] leading-4 text-text-secondary">{desc}</p>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="shrink-0 text-text-tertiary hover:text-text" aria-label="Đóng gợi ý">
          <X aria-hidden size={14} />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children, workspace = "merchant" }: AppShellProps) {
  const router = useRouter();
  const operations = workspace === "operations";
  const items = operations ? operationsNavigation : merchantNavigation;

  async function logout() {
    const { csrfToken } = await getSession();
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrfToken },
    });
    if (!response.ok) return;
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-[var(--taxlens-sidebar)] shadow-[4px_0_24px_rgba(25,36,78,0.02)] md:flex">
        <div className="p-8 pb-6"><TaxLensLogo /></div>
        <FirstVisitHint operations={operations} />
        <nav aria-label={operations ? "Điều hướng SHB" : "Điều hướng merchant"} className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-2">
          <NavigationLinks items={items} />
        </nav>
        <div className="p-6">
          <Link href={operations ? "/ops/cases" : "/assistant"} className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-text">
            <LifeBuoy aria-hidden size={18} />
            {operations ? "Hỗ trợ nội bộ" : "Hỗ trợ SHB"}
          </Link>
          <Link href={operations ? "/ops/settings" : "/settings"} className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-text">
            <Settings aria-hidden size={18} />
            Cài đặt
          </Link>
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] text-text-secondary transition-colors hover:bg-[#F5F6F8] hover:text-text">
            <LogOut aria-hidden size={18} />
            Đăng xuất
          </button>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm text-on-primary">{operations ? "L" : "H"}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-normal text-text">{operations ? "Linh — SHB Ops" : "Nguyễn Thị Hương"}</strong>
              <small className="block truncate text-xs text-text-tertiary">{operations ? "Vận hành merchant" : "Salon Hương"}</small>
            </span>
            <ThemeButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <TaxLensLogo compact />
          <div className="text-center">
            <strong className="block text-sm font-normal">{operations ? "SHB Operations" : "Salon Hương"}</strong>
            <span className="text-xs text-text-tertiary">Tháng 07/2026</span>
          </div>
          <ThemeButton />
        </header>
        <main className="mx-auto min-h-screen w-full max-w-[1600px] px-6 py-6 pb-24 md:px-12 md:py-10 md:pb-10">
          {children}
        </main>
      </div>
      <MobileNavigation items={items} />
    </div>
  );
}
