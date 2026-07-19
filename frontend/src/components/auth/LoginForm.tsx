"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, ChevronDown, LoaderCircle, Store } from "lucide-react";
import type { SessionResponse } from "@/lib/auth/contracts";

const DEMO_PASSWORD = "TaxLensDemo!2026";

interface Credentials {
  email: string;
  password: string;
}

const demoAccounts = [
  {
    email: "huong.salonhoa@gmail.com",
    name: "Salon Hương",
    role: "Chủ salon làm đẹp",
    description: "Xem trợ lý AI đối soát dòng tiền, tạo đơn và kiểm tra sẵn sàng thuế",
    icon: Store,
    accent: "bg-primary/10 text-primary",
  },
  {
    email: "long.ops@shb.com.vn",
    name: "SHB Operations",
    role: "Nhân viên ngân hàng",
    description: "Giám sát danh mục merchant, duyệt case và kiểm toán agent",
    icon: Building2,
    accent: "bg-secondary/10 text-secondary",
  },
] as const;

export function LoginForm(): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? undefined;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [forgotToast, setForgotToast] = useState(false);

  async function login(credentials: Credentials): Promise<void> {
    setError(null);
    const response = await fetch("/api/auth/login", {
      body: JSON.stringify(credentials),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(body?.error?.message ?? "Đăng nhập không thành công.");
    }

    const session = (await response.json()) as SessionResponse;
    const requestedPath = searchParams.get("next");
    const safeRequestedPath = requestedPath?.startsWith("/") ? requestedPath : null;
    const destination = safeRequestedPath ?? (session.user.role === "merchant" ? "/dashboard" : "/ops");
    startTransition(() => router.replace(destination));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đăng nhập không thành công.");
    }
  }

  async function demo(email: string): Promise<void> {
    try {
      await login({ email, password: DEMO_PASSWORD });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể mở dữ liệu demo.");
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4">
        <p className="text-[13px] font-medium text-text-tertiary">
          Truy cập demo ngay
        </p>
        {demoAccounts.map((account) => {
          const Icon = account.icon;
          return (
            <button
              key={account.email}
              type="button"
              disabled={isPending}
              onClick={() => demo(account.email)}
              className="group flex items-start gap-4 rounded-xl border bg-background p-5 text-left transition-all hover:border-primary hover:shadow-sm disabled:opacity-60"
            >
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${account.accent}`}>
                <Icon aria-hidden size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-ink">{account.name}</strong>
                <span className="mt-0.5 block text-xs text-text-secondary">{account.role}</span>
                <span className="mt-2 block text-xs leading-5 text-text-tertiary">{account.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-primary-hover">
                {isPending ? <LoaderCircle aria-hidden className="animate-spin" size={14} /> : <ArrowRight aria-hidden size={14} />}
                Vào demo
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-6 flex items-center gap-3 text-[13px] font-medium text-text-tertiary">
        <span className="h-px flex-1 bg-border" />
        <button
          type="button"
          onClick={() => setShowLoginForm((prev) => !prev)}
          className="inline-flex items-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary"
        >
          Đăng nhập bằng tài khoản thật
          <ChevronDown aria-hidden size={14} className={`transition-transform ${showLoginForm ? "rotate-180" : ""}`} />
        </button>
        <span className="h-px flex-1 bg-border" />
      </div>

      {showLoginForm && (
        <form className="grid gap-5" onSubmit={submit}>
          <label className="grid gap-2.5 text-sm text-text-secondary">
            Email hoặc số điện thoại
            <input
              name="email"
              type="text"
              autoComplete="username"
              required
              defaultValue={initialEmail}
              className="min-h-12 rounded-xl border bg-background px-4 text-ink outline-none transition-shadow focus:border-primary"
              placeholder="huong.salonhoa@gmail.com"
            />
          </label>
          <label className="grid gap-2.5 text-sm text-text-secondary">
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="min-h-12 rounded-xl border bg-background px-4 text-ink outline-none transition-shadow focus:border-primary"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-white transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? <LoaderCircle aria-hidden className="animate-spin" size={18} /> : <ArrowRight aria-hidden size={18} />}
            {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setForgotToast(true);
                setTimeout(() => setForgotToast(false), 4000);
              }}
              className="text-sm text-primary transition-colors hover:text-primary-hover"
            >
              Quên mật khẩu?
            </button>
          </div>
          {forgotToast && (
            <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
              Vui lòng liên hệ hỗ trợ SHB để khôi phục mật khẩu.
            </p>
          )}
        </form>
      )}
    </>
  );
}
