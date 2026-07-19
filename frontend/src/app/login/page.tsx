import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthVisualPanel } from "@/components/auth/AuthVisualPanel";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthVisualPanel />
      <Suspense fallback={<div className="flex items-center justify-center p-12"><p className="text-sm text-text-secondary">Đang tải…</p></div>}>
        <AuthForm />
      </Suspense>
    </AuthShell>
  );
}
