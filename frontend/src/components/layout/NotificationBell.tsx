"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/api/agentops";
import { cn } from "@/lib/utils";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const typeIcon: Record<string, string> = {
  exception: "⚠",
  case_update: "📋",
  agent_run: "🤖",
  support: "💬",
  system: "ℹ",
};

export function NotificationBell({ align = "right" }: { align?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(false),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  function handleClick(n: NotificationItem) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
        className="grid size-10 place-items-center rounded-xl border bg-surface text-text-secondary transition-[background-color,color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:text-ink"
      >
        <Bell aria-hidden size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={cn("surface-shadow-md absolute top-12 z-50 w-80 rounded-xl border bg-surface sm:w-96", align === "right" ? "right-0" : "left-full ml-2")}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold text-ink">Thông báo</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
              >
                <CheckCheck aria-hidden size={14} />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="grid place-items-center px-5 py-10 text-center">
                <Bell aria-hidden className="text-text-tertiary" size={24} />
                <p className="mt-3 text-sm text-text-secondary">Chưa có thông báo nào</p>
              </div>
            )}

            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex gap-3 border-b px-4 py-3 transition-colors hover:bg-accent",
                  !n.is_read && "bg-primary/5",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm">
                  {typeIcon[n.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-ink", !n.is_read && "font-semibold")}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 truncate text-xs leading-5 text-text-secondary">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-text-tertiary">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
