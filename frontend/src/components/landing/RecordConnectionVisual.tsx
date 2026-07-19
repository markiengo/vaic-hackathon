import { Reveal } from "./Reveal";

const sources = [
  { label: "Giao dịch SHB", id: "TXN-04812", amount: "1.500.000₫" },
  { label: "Đơn hàng", id: "DH-1023", amount: "1.500.000₫" },
  { label: "Tiền mặt", id: "CASH-0912", amount: "300.000₫" },
  { label: "Hóa đơn", id: "INV-2024-881", amount: "1.800.000₫" },
];

const stats = [
  { value: "25", label: "mục đã tự động khớp", tone: "success" as const },
  { value: "3", label: "mục cần xác nhận", tone: "warning" as const },
  { value: "2", label: "đơn thiếu hóa đơn", tone: "danger" as const },
  { value: "92%", label: "hoàn thiện", tone: "secondary" as const },
];

export function RecordConnectionVisual() {
  return (
    <section id="doi-soat" className="border-b border-border bg-surface/40" aria-labelledby="connection-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Một lớp điều phối duy nhất
          </p>
          <h2
            id="connection-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            TaxLens nối các bản ghi trước khi yêu cầu con người can thiệp.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary [text-wrap:pretty]">
            TaxLens không thay thế ngân hàng, POS, phần mềm kế toán hoặc hệ thống hóa đơn.
            Nền tảng kết nối dữ liệu từ các hệ thống đó, xử lý trường hợp rõ ràng
            và đưa phần chưa chắc chắn tới đúng người.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 items-center">
          {/* Left: connection visual */}
          <Reveal translate={20}>
            <div className="rounded-xl border bg-surface surface-shadow-md p-6">
              {/* Source records */}
              <div className="space-y-3">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {src.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-xs text-text-tertiary">{src.id}</span>
                        <span className="text-sm font-semibold text-text">{src.amount}</span>
                      </div>
                    </div>
                    <span className="size-2 rounded-full bg-secondary" />
                  </div>
                ))}
              </div>

              {/* Connecting lines */}
              <div className="flex justify-center py-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-6 w-px bg-secondary/30" />
                  <div className="rounded-full bg-secondary/10 px-3 py-1">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">
                      TaxLens đối soát
                    </span>
                  </div>
                  <div className="h-6 w-px bg-secondary/30" />
                </div>
              </div>

              {/* Unified record */}
              <div className="rounded-lg border-2 border-secondary/20 bg-selection-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-secondary">Hồ sơ vận hành thống nhất</span>
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                    Đã đối soát
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-tertiary">Giao dịch</span>
                    <div className="font-mono text-text">TXN-04812</div>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Đơn hàng</span>
                    <div className="font-mono text-text">DH-1023</div>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Tiền mặt</span>
                    <div className="font-mono text-text">CASH-0912</div>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Hóa đơn</span>
                    <div className="font-mono text-text">INV-2024-881</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: match stats */}
          <Reveal delay={120} translate={20}>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-surface p-6 surface-shadow-sm"
                >
                  <div
                    className={`font-display text-4xl leading-none tracking-tight ${
                      stat.tone === "success"
                        ? "text-success"
                        : stat.tone === "warning"
                          ? "text-mango"
                          : stat.tone === "danger"
                            ? "text-danger"
                            : "text-secondary"
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-6 rounded-xl border bg-surface p-5 surface-shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text">Mức độ hoàn thiện đối soát</span>
                <span className="font-display text-lg text-secondary">92%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-soft">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-700"
                  style={{ width: "92%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-text-tertiary">
                <span>30 bản ghi</span>
                <span>27 đã xử lý</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
