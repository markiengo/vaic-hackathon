import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Reveal } from "./Reveal";

export function FinalDemoStoryCTA() {
  return (
    <section
      id="demo"
      className="border-b border-border"
      style={{ backgroundColor: "#19244e" }}
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          {/* Left: copy */}
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mango">
              Bản demo TaxLens
            </p>
            <h2
              id="cta-heading"
              className="font-display mt-4 text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.03em] text-white [text-wrap:balance]"
            >
              Theo dõi một giao dịch từ lúc nhận tiền đến khi sẵn sàng xuất dữ liệu.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70 [text-wrap:pretty]">
              Khám phá đầy đủ luồng khách hàng kinh doanh, SHB Operations, hồ sơ xử lý,
              lần chạy tác nhân AI, truy vết và quản trị quy tắc trên dữ liệu mô phỏng.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-7 text-[15px] font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98]"
              >
                Mở bản demo
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#van-de"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/20 px-7 text-[15px] font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
              >
                <PlayCircle size={18} />
                Xem kịch bản trình diễn
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/50">
              Dữ liệu mô phỏng · Không sử dụng dữ liệu ngân hàng thật
            </p>
          </Reveal>

          {/* Right: stacked visual */}
          <Reveal delay={120} translate={20}>
            <div className="space-y-3">
              {/* Transaction */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Giao dịch
                  </span>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Đã ghi nhận
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-2xl text-white">1.500.000₫</span>
                  <span className="font-mono text-xs text-white/40">TXN-04812</span>
                </div>
              </div>

              {/* Order */}
              <div className="ml-6 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Đơn hàng
                  </span>
                  <span className="rounded-full bg-secondary/30 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Đã khớp
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-xl text-white">DH-1023</span>
                  <span className="text-xs text-white/40">3 sản phẩm</span>
                </div>
              </div>

              {/* Invoice */}
              <div className="ml-12 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Hóa đơn
                  </span>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Đã đối soát
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-sm text-white">INV-2024-881</span>
                  <span className="text-xs text-white/40">1.800.000₫</span>
                </div>
              </div>

              {/* Case */}
              <div className="ml-6 rounded-lg border border-mango/20 bg-mango/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-mango">
                    Hồ sơ xử lý
                  </span>
                  <span className="rounded-full bg-mango/20 px-2 py-0.5 text-[10px] font-semibold text-mango">
                    Đã đóng
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-sm text-white">CASE-1428</span>
                  <span className="text-xs text-white/40">Linh Nguyễn · 2 giờ</span>
                </div>
              </div>

              {/* Readiness */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Mức độ sẵn sàng
                  </span>
                  <span className="font-display text-lg text-mango">95%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-mango transition-all duration-700"
                    style={{ width: "95%" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
