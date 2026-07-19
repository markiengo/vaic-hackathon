"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "danger";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };
type ToastContextValue = { toast: (input: ToastInput) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const icons = { info: Info, success: CheckCircle2, danger: CircleAlert };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  function dismiss(id: number) { setItems((current) => current.filter((item) => item.id !== id)); }
  function toast(input: ToastInput) {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-2), { ...input, id }]);
    window.setTimeout(() => dismiss(id), 5000);
    return id;
  }

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div role="region" aria-label="Thông báo" aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-4 bottom-20 z-50 grid gap-3 sm:bottom-5 sm:left-auto sm:w-[24rem]">
        {items.map((item) => {
          const tone = item.tone ?? "info";
          const Icon = icons[tone];
          return (
            <div key={item.id} role={tone === "danger" ? "alert" : "status"} className={cn("surface-shadow-md pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4", tone === "success" && "border-success/30", tone === "danger" && "border-danger/30")}>
              <Icon aria-hidden size={20} className={cn("mt-0.5 shrink-0 text-secondary", tone === "success" && "text-success", tone === "danger" && "text-danger")} />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{item.title}</p>{item.description && <p className="mt-1 text-xs leading-5 text-text-secondary">{item.description}</p>}</div>
              <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(item.id)} className="rounded-md p-1 text-text-secondary hover:bg-background hover:text-ink"><X aria-hidden size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
