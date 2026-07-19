import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Reveal } from "./Reveal";
import { LandingProductPreview } from "./LandingProductPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background" aria-labelledby="hero-heading">
      {/* Warm sunrise glow (top-right) */}
      <div className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-[radial-gradient(circle_at_center,_var(--color-mango)_0%,_var(--color-primary)_40%,_transparent_70%)] opacity-[0.18] blur-3xl" />
      {/* Cool accent panel behind product preview (right) */}
      <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_65%)] opacity-30 blur-2xl lg:block" />
      {/* Subtle texture grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-secondary) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-24">
        {/* Left: copy */}
        <div className="relative">
          <Reveal as="p" className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            TaxOps cho khách hàng kinh doanh
          </Reveal>
          <Reveal as="h1" delay={80} id="hero-heading" className="font-display mt-5 text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] text-text [text-wrap:balance]">
            Dữ liệu rời rạc. Hồ sơ tài chính có thể kiểm tra.
          </Reveal>
          <Reveal as="p" delay={160} className="mt-7 max-w-xl text-lg leading-8 text-text-secondary [text-wrap:pretty]">
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
              href="#doi-soat"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-6 text-[15px] font-semibold text-text transition-all hover:border-text/20 hover:bg-neutral-soft active:scale-[0.98]"
            >
              <PlayCircle size={18} />
              Xem cách TaxLens vận hành
            </Link>
          </Reveal>
          <Reveal delay={320} className="mt-8 flex items-center gap-4 text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-secondary" />
              Phê duyệt của con người
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-mango" />
              Sẵn sàng truy vết
            </span>
          </Reveal>
        </div>

        {/* Right: product preview */}
        <Reveal delay={200} translate={24} className="relative">
          <div className="hero-float">
            <LandingProductPreview variant="hero" className="surface-shadow-lg" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
