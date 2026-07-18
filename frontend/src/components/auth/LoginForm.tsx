"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { SessionResponse } from "@/lib/auth/contracts";

const DEMO_PASSWORD = "TaxLensDemo!2026";

interface Credentials {
  email: string;
  password: string;
}

export function LoginForm(): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <form className="mt-8 grid gap-5" onSubmit={submit}>
        <label className="grid gap-2 text-sm text-text-secondary">
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="min-h-12 rounded-lg border bg-background px-4 text-text outline-none transition-shadow focus:border-secondary"
            placeholder="huong.salonhoa@gmail.com"
          />
        </label>
        <label className="grid gap-2 text-sm text-text-secondary">
          Mật khẩu
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="min-h-12 rounded-lg border bg-background px-4 text-text outline-none transition-shadow focus:border-secondary"
            placeholder="••••••••"
          />
        </label>
        {error ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-white transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? <LoaderCircle aria-hidden className="animate-spin" size={18} /> : <ArrowRight aria-hidden size={18} />}
          Đăng nhập
        </button>
      </form>

      <div className="my-7 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-text-tertiary">
        <span className="h-px flex-1 bg-border" /> Truy cập demo <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => demo("huong.salonhoa@gmail.com")}
          className="flex min-h-11 items-center justify-center rounded-lg border bg-background px-4 text-sm text-text hover:border-secondary disabled:opacity-60"
        >
          Salon Hương
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => demo("long.ops@shb.com.vn")}
          className="flex min-h-11 items-center justify-center rounded-lg border bg-background px-4 text-sm text-text hover:border-secondary disabled:opacity-60"
        >
          SHB Operations
        </button>
      </div>
    </>
  );
}
