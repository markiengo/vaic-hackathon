import { Reveal } from "./Reveal";

const timeline = [
  { time: "09:12", text: "Khách thanh toán 1.500.000₫ qua QR SHB" },
  { time: "09:13", text: "Giao dịch ngân hàng được ghi nhận" },
  { time: "09:15", text: "Đơn hàng DH-1023 vẫn chưa liên kết" },
  { time: "10:02", text: "Không tìm thấy hóa đơn tương ứng" },
  {
    time: "10:30",
    text: "Kế toán phải đối soát thủ công từng giao dịch",
    consequence: true,
  },
  {
    time: "14:45",
    text: "Báo cáo thuế bị trì hoãn, sai sót do nhập tay",
    consequence: true,
  },
  {
    time: "17:20",
    text: "Khách hàng kinh doanh không được cấp tín dụng kịp thời",
    consequence: true,
  },
];

export function MerchantDayStory() {
  return (
    <section id="van-de" className="border-b border-border bg-background" aria-labelledby="story-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Một ngày vận hành điển hình
          </p>
          <h2
            id="story-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            Tiền đã về. Nhưng hồ sơ vẫn chưa khớp.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary [text-wrap:pretty]">
            Một giao dịch có thể xuất hiện ở ngân hàng, một đơn hàng nằm trong hệ thống bán hàng,
            còn hóa đơn lại ở một nhà cung cấp khác. Khi những bản ghi này không tự nối được với nhau,
            khách hàng kinh doanh và SHB đều phải xử lý thủ công.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          {/* Left: timeline */}
          <Reveal translate={20}>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border-strong" />
              <ul className="space-y-8">
                {timeline.map((event, i) => (
                  <li key={event.time} className="relative flex gap-5">
                    <span
                      className={`relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-2 ${
                        event.consequence
                          ? "border-mango bg-mango/15"
                          : i === timeline.length - 1
                            ? "border-danger bg-danger-soft"
                            : "border-secondary bg-surface"
                      }`}
                    />
                    <div>
                      <div
                        className={`font-mono text-sm font-semibold ${
                          event.consequence ? "text-mango" : "text-text"
                        }`}
                      >
                        {event.time}
                      </div>
                      <div
                        className={`mt-1 text-base leading-relaxed ${
                          event.consequence
                            ? "font-semibold text-mango"
                            : "text-text-secondary"
                        }`}
                      >
                        {event.text}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Right: disconnected records visual */}
          <Reveal delay={120} translate={20}>
            <div className="rounded-xl border bg-surface surface-shadow-md overflow-hidden">
              <div className="border-b bg-neutral-soft px-4 py-3">
                <span className="font-mono text-xs text-text-tertiary">Nguồn dữ liệu riêng biệt</span>
              </div>
              <div className="space-y-3 p-5">
                {/* Bank transaction record */}
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
                      Giao dịch SHB
                    </span>
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                      Đã ghi nhận
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-display text-2xl tracking-tight text-text">1.500.000₫</span>
                    <span className="font-mono text-xs text-text-tertiary">TXN-04812</span>
                  </div>
                  <div className="mt-2 text-xs text-text-tertiary">09:13 · QR chuyển khoản</div>
                </div>

                {/* Connection gap indicator */}
                <div className="flex items-center justify-center py-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                    chưa liên kết
                  </span>
                </div>

                {/* Order record */}
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Đơn hàng
                    </span>
                    <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[10px] font-semibold text-text-tertiary">
                      Chờ đối soát
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-display text-xl tracking-tight text-text">DH-1023</span>
                    <span className="text-xs text-text-tertiary">3 sản phẩm · 1.500.000₫</span>
                  </div>
                  <div className="mt-2 text-xs text-text-tertiary">09:15 · POS</div>
                </div>

                {/* Connection gap indicator */}
                <div className="flex items-center justify-center py-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                    chưa liên kết
                  </span>
                </div>

                {/* Invoice record */}
                <div className="rounded-lg border border-dashed border-border-strong bg-neutral-soft/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      Hóa đơn
                    </span>
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">
                      Chưa tìm thấy
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-text-tertiary">
                    Không có hóa đơn tương ứng trong hệ thống
                  </div>
                </div>
              </div>
            </div>

            {/* Status transition */}
            <div className="mt-6 flex items-center gap-3">
              <span className="rounded-lg border border-border bg-neutral-soft px-4 py-2 text-sm font-semibold text-text-tertiary">
                Rời rạc
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              <span className="rounded-lg border border-secondary/20 bg-selection-soft px-4 py-2 text-sm font-semibold text-secondary">
                Được TaxLens kết nối
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
