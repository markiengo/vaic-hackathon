"use client";

import { Monitor, Moon, RotateCcw, Sun, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Button, PageHeader, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { resetDemo } from "@/lib/api/agentops";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", label: "Sáng", description: "Nền sáng cho ca làm việc ban ngày.", icon: Sun },
  { value: "dark", label: "Tối", description: "Giảm chói trong phòng vận hành tối.", icon: Moon },
  { value: "system", label: "Theo thiết bị", description: "Tự động theo cài đặt hệ điều hành.", icon: Monitor },
] as const;

export function OperationsSettings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
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
        <h2 className="font-display text-3xl text-ink">Chế độ hiển thị</h2>
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

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warning/10 text-warning"><RotateCcw aria-hidden size={21} /></span>
          <div className="flex-1">
            <h2 className="font-display text-3xl text-ink">Đặt lại dữ liệu demo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Xóa toàn bộ dữ liệu và khôi phục về bộ dữ liệu demo ban đầu.</p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-warning/25 bg-warning/5 p-4">
          <div className="flex items-start gap-2">
            <TriangleAlert aria-hidden className="mt-0.5 shrink-0 text-warning" size={16} />
            <p className="text-sm leading-6 text-text-secondary">Tất cả giao dịch, đơn hàng, hóa đơn, cases và agent runs sẽ bị xóa. Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        {resetConfirmOpen ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink">Bạn chắc chắn?</span>
            <Button
              variant="danger"
              disabled={resetBusy}
              onClick={async () => {
                setResetBusy(true);
                try {
                  const result = await resetDemo();
                  toast({
                    title: "Đã đặt lại dữ liệu demo",
                    description: `Đã khôi phục ${result.summary?.merchants ?? 0} merchant, ${result.summary?.sales ?? 0} đơn hàng.`,
                    tone: "success",
                  });
                  queryClient.invalidateQueries();
                  setResetConfirmOpen(false);
                } catch (error) {
                  const message = error instanceof ApiError ? error.message : "Không thể đặt lại.";
                  toast({ title: "Không thể đặt lại", description: message, tone: "danger" });
                } finally {
                  setResetBusy(false);
                }
              }}
            >
              {resetBusy ? "Đang đặt lại..." : "Xác nhận đặt lại"}
            </Button>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Hủy</Button>
          </div>
        ) : (
          <Button variant="outline" className="mt-5" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw aria-hidden size={17} />
            Đặt lại dữ liệu demo
          </Button>
        )}
      </Card>
    </div>
  );
}
