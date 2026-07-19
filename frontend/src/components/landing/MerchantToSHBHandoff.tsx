import { Reveal } from "./Reveal";

export function MerchantToSHBHandoff() {
  return (
    <section className="border-b border-border bg-surface/40" aria-labelledby="handoff-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Từ khách hàng kinh doanh đến SHB Operations
          </p>
          <h2
            id="handoff-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            Việc đơn giản được xử lý tại cửa hàng. Việc phức tạp được chuyển đúng người.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {/* Merchant workspace */}
          <Reveal translate={20}>
            <div className="h-full rounded-xl border bg-surface surface-shadow-md overflow-hidden">
              <div className="border-b bg-neutral-soft px-4 py-3">
                <span className="text-xs font-semibold text-text">Khách hàng kinh doanh</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Assistant message */}
                <div className="rounded-lg bg-selection-soft p-3">
                  <div className="text-xs font-semibold text-secondary">Trợ lý TaxLens</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text">
                    Giao dịch TXN-8821 cần xác nhận. Đây có vẻ là chuyển khoản nội bộ.
                    Bạn muốn phân loại thế nào?
                  </p>
                </div>

                {/* Transaction card */}
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text-tertiary">TXN-8821</span>
                    <span className="rounded-full bg-mango/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      Cần xác nhận
                    </span>
                  </div>
                  <div className="mt-2 font-display text-xl text-text">5.000.000₫</div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg border border-border bg-surface py-2 text-xs font-semibold text-text-secondary">
                    Xác nhận
                  </button>
                  <button className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-on-primary">
                    Nhờ SHB hỗ trợ
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Handoff visual */}
          <Reveal delay={100} className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 py-8 lg:py-0">
              <div className="rounded-lg border border-secondary/20 bg-selection-soft px-4 py-3 text-center">
                <div className="font-mono text-xs font-semibold text-secondary">CASE-1428</div>
                <div className="mt-1 text-xs text-text-tertiary">được tạo</div>
              </div>
              <div className="text-xs text-text-tertiary">bằng chứng được giữ nguyên</div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary rotate-90 lg:rotate-0">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Reveal>

          {/* SHB Operations */}
          <Reveal delay={120} translate={20}>
            <div className="h-full rounded-xl border bg-surface surface-shadow-md overflow-hidden">
              <div className="border-b bg-neutral-soft px-4 py-3">
                <span className="text-xs font-semibold text-text">SHB Operations</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Case header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-text-tertiary">CASE-1428</div>
                    <div className="mt-0.5 text-sm font-semibold text-text">Giao dịch cần xác nhận</div>
                  </div>
                  <span className="rounded-full bg-mango/15 px-2.5 py-1 text-[10px] font-semibold text-warning">
                    Chờ SHB phê duyệt
                  </span>
                </div>

                {/* Case details */}
                <div className="space-y-2.5 rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Người phụ trách</span>
                    <span className="font-semibold text-text">Linh Nguyễn</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Thời hạn xử lý</span>
                    <span className="font-semibold text-text">2 giờ</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Độ tin cậy</span>
                    <span className="font-semibold text-secondary">87%</span>
                  </div>
                </div>

                {/* Evidence summary */}
                <div className="rounded-lg border border-border bg-neutral-soft/50 p-3">
                  <div className="text-xs font-semibold text-text-secondary">Đề xuất của TaxLens</div>
                  <div className="mt-1.5 text-sm text-text">Phân loại: Chuyển nội bộ</div>
                  <div className="mt-1 text-xs text-text-tertiary">
                    3 bằng chứng · 1 mục chưa chắc chắn
                  </div>
                </div>

                {/* Action */}
                <button className="w-full rounded-lg bg-secondary py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary-hover">
                  Phê duyệt phân loại
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
