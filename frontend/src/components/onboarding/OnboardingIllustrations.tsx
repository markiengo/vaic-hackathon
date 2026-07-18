function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface ${className}`}>{children}</div>;
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-neutral-soft text-text-secondary",
    success: "bg-success-soft text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Bar({ height, color = "bg-secondary", width = "full" }: { height: string; color?: string; width?: string }) {
  return <div className={`${color} ${width} rounded-sm`} style={{ height }} />;
}

export function MerchantDashboardIllustration() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-2.5 w-24 rounded-full bg-text/15" />
          <div className="mt-1.5 h-2 w-16 rounded-full bg-text/10" />
        </div>
        <Pill tone="success">Đã khớp</Pill>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-2.5">
            <div className="h-1.5 w-10 rounded-full bg-text/10" />
            <div className="mt-2 h-3 w-14 rounded-full bg-text/20" />
            <div className="mt-1.5 h-1.5 w-8 rounded-full bg-success/30" />
          </Card>
        ))}
      </div>
      <Card className="flex flex-1 items-center gap-4 p-3">
        <div className="relative grid size-20 shrink-0 place-items-center">
          <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(var(--taxlens-primary) 0% 78%, var(--taxlens-border) 78% 100%)" }} />
          <div className="absolute inset-2 rounded-full bg-surface" />
          <div className="relative text-center">
            <div className="font-display text-lg leading-none text-text">78%</div>
            <div className="text-[7px] text-text-tertiary">Sẵn sàng</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-1.5 w-full rounded-full bg-text/10" />
          <div className="flex items-end gap-1.5">
            {[40, 55, 35, 70, 50, 80, 65].map((h, i) => (
              <Bar key={i} height={`${h * 0.5}px`} color={i === 5 ? "bg-primary" : "bg-secondary/40"} />
            ))}
          </div>
          <div className="h-1.5 w-2/3 rounded-full bg-text/10" />
        </div>
      </Card>
    </div>
  );
}

export function MerchantAssistantIllustration() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-4">
      <div className="flex gap-2">
        <div className="max-w-[70%] rounded-lg rounded-tl-sm bg-neutral-soft px-3 py-2">
          <div className="h-1.5 w-32 rounded-full bg-text/15" />
          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-text/10" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <div className="max-w-[70%] rounded-lg rounded-tr-sm bg-primary/10 px-3 py-2">
          <div className="h-1.5 w-28 rounded-full bg-primary/30" />
          <div className="mt-1.5 h-1.5 w-20 rounded-full bg-primary/20" />
        </div>
      </div>
      <Card className="flex-1 p-3">
        <div className="flex items-center gap-2">
          <span className="size-4 rounded bg-secondary/15" />
          <div className="h-1.5 w-20 rounded-full bg-text/15" />
          <Pill tone="warning">Chờ duyệt</Pill>
        </div>
        <div className="mt-2.5 grid gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-text/10" />
          <div className="h-1.5 w-3/4 rounded-full bg-text/10" />
          <div className="h-1.5 w-5/6 rounded-full bg-text/10" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="rounded-md bg-primary px-3 py-1.5 text-[9px] font-semibold text-on-primary">Phê duyệt</div>
          <div className="rounded-md border border-border px-3 py-1.5 text-[9px] font-semibold text-text-secondary">Từ chối</div>
        </div>
      </Card>
    </div>
  );
}

export function MerchantTaxReadinessIllustration() {
  const items = [
    { done: true, label: "Giao dịch đã khớp" },
    { done: true, label: "Ngoại lệ đã xử lý" },
    { done: true, label: "Hóa đơn đầy đủ" },
    { done: false, label: "Phân loại doanh thu" },
    { done: false, label: "Kiểm tra cuối kỳ" },
  ];
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-2.5 w-28 rounded-full bg-text/15" />
          <div className="mt-1.5 h-2 w-20 rounded-full bg-text/10" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
          <span className="size-2 rounded-full bg-warning" />
          <span className="text-[9px] font-semibold text-text-secondary">3/5</span>
        </div>
      </div>
      <Card className="flex-1 p-3">
        <div className="grid gap-2.5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className={`grid size-4 shrink-0 place-items-center rounded ${item.done ? "bg-success" : "border border-border-strong"}`}>
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <div className={`h-1.5 flex-1 rounded-full ${item.done ? "bg-success/20" : "bg-text/10"}`} />
              <Pill tone={item.done ? "success" : "warning"}>{item.done ? "Xong" : "Chưa"}</Pill>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex justify-end">
        <div className="rounded-md bg-primary/80 px-3 py-1.5 text-[9px] font-semibold text-on-primary">Xuất báo cáo</div>
      </div>
    </div>
  );
}

export function OpsOverviewIllustration() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-2.5">
            <div className="h-1.5 w-10 rounded-full bg-text/10" />
            <div className="mt-2 flex items-end gap-1">
              {[30, 50, 40, 60, 45].map((h, j) => (
                <Bar key={j} height={`${h * 0.3}px`} color={i === 0 ? "bg-primary/50" : i === 1 ? "bg-secondary/50" : "bg-mango/50"} />
              ))}
            </div>
            <div className="mt-1.5 h-2 w-12 rounded-full bg-text/15" />
          </Card>
        ))}
      </div>
      <Card className="flex-1 p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="h-1.5 w-24 rounded-full bg-text/15" />
          <Pill tone="warning">2 cần chú ý</Pill>
        </div>
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className={`size-6 shrink-0 rounded-md ${i < 2 ? "bg-success/15" : "bg-warning/15"}`} />
              <div className="h-1.5 flex-1 rounded-full bg-text/10" />
              <Pill tone={i < 2 ? "success" : "warning"}>{i < 2 ? "Khỏe" : "Cần xem"}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function OpsCasesIllustration() {
  return (
    <div className="flex h-full gap-2 p-4">
      <div className="flex w-1/3 flex-col gap-2">
        <div className="h-1.5 w-16 rounded-full bg-text/15" />
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className={`p-2 ${i === 1 ? "border-secondary ring-1 ring-secondary/15" : ""}`}>
            <div className="h-1.5 w-full rounded-full bg-text/10" />
            <div className="mt-1.5 flex items-center justify-between">
              <div className="h-1.5 w-12 rounded-full bg-text/10" />
              <Pill tone={i === 0 ? "danger" : i === 1 ? "warning" : "neutral"}>{i === 0 ? "Khẩn" : i === 1 ? "Mở" : "Chờ"}</Pill>
            </div>
          </Card>
        ))}
      </div>
      <Card className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 w-20 rounded-full bg-text/15" />
          <Pill tone="warning">Đang xử lý</Pill>
        </div>
        <div className="grid gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-text/10" />
          <div className="h-1.5 w-3/4 rounded-full bg-text/10" />
        </div>
        <div className="mt-1 grid gap-1.5 border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-secondary" />
            <div className="h-1.5 flex-1 rounded-full bg-text/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            <div className="h-1.5 flex-1 rounded-full bg-text/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <div className="h-1.5 flex-1 rounded-full bg-text/10" />
          </div>
        </div>
        <div className="mt-auto flex gap-2">
          <div className="rounded-md bg-primary px-2.5 py-1 text-[8px] font-semibold text-on-primary">Ghi nhận</div>
          <div className="rounded-md border border-border px-2.5 py-1 text-[8px] font-semibold text-text-secondary">Yêu cầu thêm</div>
        </div>
      </Card>
    </div>
  );
}

export function OpsComplianceIllustration() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-24 rounded-full bg-text/15" />
        <Pill tone="success">Hiệu lực</Pill>
      </div>
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-1.5 w-20 rounded-full bg-text/15" />
            <div className="mt-1.5 h-1.5 w-14 rounded-full bg-text/10" />
          </div>
          <span className="font-mono text-[9px] text-text-tertiary">v2.1.0</span>
        </div>
        <div className="mt-2.5 grid gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-text/10" />
          <div className="h-1.5 w-2/3 rounded-full bg-text/10" />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="size-3 rounded bg-secondary/15" />
          <div className="h-1.5 w-16 rounded-full bg-text/10" />
          <Pill tone="neutral">Tham chiếu</Pill>
        </div>
      </Card>
      <div className="grid gap-2">
        {[0, 1].map((i) => (
          <Card key={i} className="flex items-center gap-2.5 p-2.5">
            <span className={`size-5 shrink-0 rounded ${i === 0 ? "bg-success/15" : "bg-neutral-soft"}`} />
            <div className="h-1.5 flex-1 rounded-full bg-text/10" />
            <span className="font-mono text-[8px] text-text-tertiary">v{i === 0 ? "2.1.0" : "2.0.3"}</span>
            <Pill tone={i === 0 ? "success" : "neutral"}>{i === 0 ? "Active" : "Archive"}</Pill>
          </Card>
        ))}
      </div>
    </div>
  );
}
