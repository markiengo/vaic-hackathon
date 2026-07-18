"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, LogOut, Moon, Settings, Sun } from "lucide-react";
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
        {showGroup ? <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.16em] text-text-tertiary">{item.group}</p> : null}
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-text-secondary transition-[background-color,color,transform] duration-150 ease-out hover:translate-x-0.5 hover:bg-accent/45 hover:text-text",
            active && "bg-secondary text-white ring-1 ring-inset ring-secondary hover:bg-secondary hover:text-white",
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
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-[var(--taxlens-sidebar)] px-4 py-5 md:flex">
        <TaxLensLogo className="ml-1" />
        <p className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          {operations ? "SHB Operations" : "Merchant workspace"}
        </p>
        <nav aria-label={operations ? "Điều hướng SHB" : "Điều hướng merchant"} className="mt-3 flex flex-1 flex-col gap-1">
          <NavigationLinks items={items} />
        </nav>
        <div className="border-t pt-4">
          <Link href={operations ? "/ops/cases" : "/assistant"} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-text-secondary hover:bg-accent/45 hover:text-text">
            <LifeBuoy aria-hidden size={18} />
            {operations ? "Hỗ trợ nội bộ" : "Hỗ trợ SHB"}
          </Link>
          <Link href={operations ? "/ops/settings" : "/settings"} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-text-secondary hover:bg-accent/45 hover:text-text">
            <Settings aria-hidden size={18} />
            Cài đặt & giao diện
          </Link>
          <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-text-secondary hover:bg-accent/45 hover:text-text">
            <LogOut aria-hidden size={18} />
            Đăng xuất
          </button>
          <div className="mt-3 flex items-center gap-3 rounded-xl border bg-surface-elevated p-3">
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
        <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8 xl:px-11">
          {children}
        </main>
      </div>
      <MobileNavigation items={items} />
    </div>
  );
}
