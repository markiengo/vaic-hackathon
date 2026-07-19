"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Store, Building2 } from "lucide-react";
import Image from "next/image";
import type { SessionResponse } from "@/lib/auth/contracts";
import { AuthField } from "./AuthField";
import { DemoAccessRow } from "./DemoAccessRow";

const DEMO_PASSWORD = "TaxLensDemo!2026";

const demoAccounts = [
  {
    email: "huong.salonhoa@gmail.com",
    name: "Salon Hương",
    description: "Xem dòng tiền, hóa đơn và trạng thái thuế của salon",
    roleLabel: "Merchant",
    icon: Store,
    accent: "primary" as const,
  },
  {
    email: "long.ops@shb.com.vn",
    name: "SHB Operations",
    description: "Giám sát danh mục merchant và quy trình vận hành",
    roleLabel: "SHB Ops",
    icon: Building2,
    accent: "secondary" as const,
  },
] as const;

export function AuthForm(): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? undefined;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotToast, setForgotToast] = useState(false);

  async function login(email: string, password: string): Promise<void> {
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
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
      router.replace(destination);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    try {
      await login(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? ""),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đăng nhập không thành công.");
    } finally {
      setIsPending(false);
    }
  }

  function demo(email: string): void {
    const isMerchant = email === "huong.salonhoa@gmail.com";
    document.cookie = "taxlens_demo=1; path=/; max-age=604800";
    document.cookie = `taxlens_demo_user=${isMerchant ? "U005" : "U002"}; path=/; max-age=604800`;
    document.cookie = "taxlens_csrf=demo-csrf; path=/; max-age=604800";
    router.replace(isMerchant ? "/dashboard" : "/ops");
  }

  return (
    <div className="flex items-center justify-center px-6 py-8 sm:px-10 sm:py-8">
      <div className="w-full max-w-[420px]">
        {/* Logo mark */}
        <div className="mb-5 flex items-center gap-2">
          <span className="relative block size-8 shrink-0 overflow-hidden rounded">
            <Image
              className="object-cover"
              src="/brand/taxlens-icon-light.png"
              alt=""
              fill
              sizes="32px"
              priority
            />
          </span>
          <span className="text-[18px] font-bold tracking-[-0.02em] text-ink">
            TaxLens
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          Đăng nhập TaxLens
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-text-secondary">
          Đăng nhập để tiếp tục quản lý dữ liệu và quy trình vận hành.
        </p>

        {/* Divider */}
        <div className="my-5 h-px bg-border" />

        {/* Error */}
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-[8px] border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger"
          >
            {error}
          </p>
        ) : null}

        {/* Login form */}
        <form className="grid gap-4" onSubmit={submit}>
          <AuthField
            label="Email hoặc số điện thoại"
            name="email"
            type="text"
            autoComplete="username"
            required
            defaultValue={initialEmail}
            placeholder="name@example.com"
          />

          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-ink">Mật khẩu</span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={8}
                placeholder="Nhập mật khẩu"
                className="h-[46px] w-full rounded-[10px] border border-border bg-white px-4 pr-11 text-[14px] text-ink outline-none transition-colors placeholder:text-text-tertiary focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-text-secondary"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Quên mật khẩu */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setForgotToast(true);
                setTimeout(() => setForgotToast(false), 4000);
              }}
              className="text-[13px] text-primary transition-colors hover:text-primary-hover"
            >
              Quên mật khẩu?
            </button>
          </div>

          {forgotToast && (
            <p
              role="status"
              className="rounded-[8px] border border-primary/20 bg-primary/5 px-3 py-2 text-[13px] text-primary"
            >
              Vui lòng liên hệ hỗ trợ SHB để khôi phục mật khẩu.
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="mt-1 flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle aria-hidden className="animate-spin" size={16} />
            ) : null}
            {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        {/* Demo access divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-text-tertiary">Hoặc truy cập bản demo</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Demo rows */}
        <div className="grid gap-2.5">
          {demoAccounts.map((account) => (
            <DemoAccessRow
              key={account.email}
              name={account.name}
              description={account.description}
              roleLabel={account.roleLabel}
              icon={account.icon}
              accent={account.accent}
              disabled={isPending}
              onClick={() => demo(account.email)}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[12px] text-text-tertiary">
          Dữ liệu mô phỏng phục vụ mục đích trình diễn.
        </p>
      </div>
    </div>
  );
}
