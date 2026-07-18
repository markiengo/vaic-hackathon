import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Reveal } from "./Reveal";
import { LandingProductPreview } from "./LandingProductPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background" aria-labelledby="hero-heading">
      {/* Decorative background geometry */}
      <div className="pointer-events-none absolute -right-32 -top-20 size-[28rem] rounded-full border border-border/40" />
      <div className="pointer-events-none absolute -right-10 top-32 size-64 rounded-full border border-mango/15" />
      <div className="pointer-events-none absolute right-40 top-72 size-3 rounded-full bg-mango/40" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-24">
        {/* Left: copy */}
        <div className="relative">
          <Reveal as="p" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            AI TaxOps cho hệ sinh thái merchant
          </Reveal>
          <Reveal as="h1" delay={80} id="hero-heading" className="font-display mt-5 text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] text-text [text-wrap:balance]">
            Dữ liệu rời rạc. Hồ sơ tài chính có thể kiểm tra.
          </Reveal>
          <Reveal as="p" delay={160} className="font-body mt-7 max-w-xl text-lg leading-8 text-text-secondary [text-wrap:pretty]">
            TaxLens kết nối giao dịch, đơn hàng, tiền mặt và hóa đơn thành một lớp dữ liệu thống nhất. AI xử lý ngoại lệ. Con người phê duyệt.
          </Reveal>
          <Reveal delay={240} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Mở bản demo
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#cach-van-hanh"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-6 text-[15px] font-semibold text-text transition-all hover:border-text/20 hover:bg-neutral-soft active:scale-[0.98]"
            >
              <PlayCircle size={18} />
              Xem cách TaxLens vận hành
            </Link>
          </Reveal>
          <Reveal delay={320} className="mt-8 flex items-center gap-4 text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Human-in-the-loop
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-mango" />
              Audit-ready
            </span>
          </Reveal>
        </div>

        {/* Right: product preview */}
        <Reveal delay={200} translate={24} className="relative">
          <div className="hero-float">
            <LandingProductPreview variant="hero" className="surface-shadow-lg" />
          </div>
          {/* Floating badge */}
          <div className="absolute -left-4 top-1/3 hidden rounded-lg border bg-surface surface-shadow-md px-3 py-2 lg:block">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <div>
                <div className="text-xs font-semibold text-text">Dữ liệu mô phỏng</div>
                <div className="text-[10px] text-text-tertiary">Kịch bản demo</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
