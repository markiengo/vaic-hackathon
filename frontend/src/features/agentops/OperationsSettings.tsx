"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", label: "Sáng", description: "Nền sáng cho ca làm việc ban ngày.", icon: Sun },
  { value: "dark", label: "Tối", description: "Giảm chói trong phòng vận hành tối.", icon: Moon },
  { value: "system", label: "Theo thiết bị", description: "Tự động theo cài đặt hệ điều hành.", icon: Monitor },
] as const;

export function OperationsSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const selected = mounted ? theme ?? "system" : "system";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SHB Operations"
        title="Cài đặt & giao diện"
        description="Chọn chế độ hiển thị cho bàn điều hành. Thay đổi được lưu trên thiết bị này và không tác động dữ liệu merchant."
      />
      <Card>
        <h2 className="font-display text-3xl">Chế độ hiển thị</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Mọi chế độ dùng cùng token TaxLens và giữ nguyên ý nghĩa màu trạng thái.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {modes.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={selected === value}
              onClick={() => setTheme(value)}
              className={cn(
                "surface-lift rounded-xl border bg-surface p-5 text-left transition-[border-color,transform,box-shadow] hover:-translate-y-0.5",
                selected === value && "border-secondary ring-2 ring-secondary/15",
              )}
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent text-secondary"><Icon aria-hidden size={18} /></span>
              <strong className="mt-4 block text-sm">{label}</strong>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">{description}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
