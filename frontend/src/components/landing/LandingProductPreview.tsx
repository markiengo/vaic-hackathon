import { cn } from "@/lib/utils";

type ProductPreviewProps = {
  className?: string;
  variant?: "hero" | "side";
};

export function LandingProductPreview({ className, variant = "hero" }: ProductPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface surface-shadow-lg",
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b bg-neutral-soft px-4 py-3">
        <span className="size-3 rounded-full bg-danger/40" />
        <span className="size-3 rounded-full bg-mango/60" />
        <span className="size-3 rounded-full bg-success/40" />
        <span className="ml-3 font-mono text-xs text-text-tertiary">taxlens.app — Dữ liệu mô phỏng</span>
      </div>

      {/* Dashboard mock */}
      <div className="grid grid-cols-[200px_1fr] gap-0">
        {/* Sidebar */}
        <aside className="hidden border-r bg-neutral-soft/60 p-4 sm:block">
          <div className="mb-6 flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary" />
            <div className="h-3 w-16 rounded bg-text/15" />
          </div>
          <nav className="space-y-1.5">
            {[
              { label: "Tổng quan", active: true },
              { label: "Trợ lý TaxLens" },
              { label: "Giao dịch" },
              { label: "Cần xác nhận" },
              { label: "Hóa đơn" },
              { label: "Bán hàng" },
              { label: "Sẵn sàng thuế" },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                  item.active ? "bg-secondary/10 font-semibold text-secondary" : "text-text-secondary",
                )}
              >
                <span className={cn("size-3.5 rounded", item.active ? "bg-secondary" : "bg-text/20")} />
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="p-5">
          {/* Header row */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="font-display text-lg leading-tight tracking-[-0.02em] text-text">Tổng quan hôm nay</div>
              <div className="mt-0.5 text-xs text-text-tertiary">Dữ liệu mô phỏng · Tháng 7/2026</div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-lg border border-border bg-surface" />
              <div className="h-8 w-28 rounded-lg bg-primary" />
            </div>
          </div>

          {/* Stat cards */}
          <div className={cn("grid gap-3", variant === "hero" ? "grid-cols-3" : "grid-cols-2")}>
            {[
              { label: "Đã khớp", value: "25/30", tone: "success" as const, sub: "giao dịch đã khớp" },
              { label: "Cần xác nhận", value: "3", tone: "warning" as const, sub: "giao dịch cần xác nhận" },
              { label: "Thiếu hóa đơn", value: "2", tone: "danger" as const, sub: "đơn thiếu hóa đơn" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-surface p-3">
                <div className="text-[11px] text-text-tertiary">{stat.label}</div>
                <div
                  className={cn(
                    "font-display text-2xl leading-tight tracking-[-0.02em]",
                    stat.tone === "success" && "text-success",
                    stat.tone === "warning" && "text-mango",
                    stat.tone === "danger" && "text-danger",
                  )}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[10px] text-text-tertiary">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Reconciliation trend chart */}
          <div className="mt-4 rounded-lg border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text">Xu hướng đối soát</span>
              <span className="font-mono text-[10px] text-text-tertiary">7 ngày</span>
            </div>
            <svg viewBox="0 0 300 80" className="mt-3 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#253C96" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#253C96" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,60 L43,52 L86,55 L129,38 L172,42 L215,25 L258,30 L300,18 L300,80 L0,80 Z" fill="url(#area-grad)" />
              <path d="M0,60 L43,52 L86,55 L129,38 L172,42 L215,25 L258,30 L300,18" fill="none" stroke="#253C96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {[[0,60],[43,52],[86,55],[129,38],[172,42],[215,25],[258,30],[300,18]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill="#253C96" />
              ))}
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[9px] text-text-tertiary">
              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
            </div>
          </div>

          {/* Exception list */}
          <div className="mt-4 rounded-lg border bg-surface">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-xs font-semibold text-text">Vấn đề cần xác nhận</span>
              <span className="font-mono text-[10px] text-text-tertiary">3 mục</span>
            </div>
            <div className="divide-y">
              {[
                { id: "TXN-04812", amount: "5.000.000₫", reason: "Thiếu hóa đơn", confidence: 92 },
                { id: "TXN-04805", amount: "12.300.000₫", reason: "Người gửi không khớp", confidence: 68 },
                { id: "TXN-04798", amount: "2.750.000₫", reason: "COD chưa đối soát", confidence: 81 },
              ].map((row) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-[10px] text-text-tertiary">{row.id}</span>
                  <span className="text-xs font-semibold text-text">{row.amount}</span>
                  <span className="flex-1 truncate text-xs text-text-secondary">{row.reason}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      row.confidence >= 85
                        ? "bg-success/10 text-success"
                        : row.confidence >= 70
                          ? "bg-mango/15 text-warning"
                          : "bg-danger/10 text-danger",
                    )}
                  >
                    {row.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Readiness bar */}
          {variant === "side" && (
            <div className="mt-4 rounded-lg border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">Mức độ sẵn sàng</span>
                <span className="font-display text-lg text-secondary">92%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-soft">
                <div className="h-full rounded-full bg-secondary" style={{ width: "92%" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
