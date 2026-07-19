import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section id="demo" className="bg-primary-soft/30 border-b border-border" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Bản demo TaxLens</p>
          <h2 id="cta-heading" className="font-display mx-auto mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-text [text-wrap:balance]">
            Xem TaxLens vận hành cho danh mục merchant.
          </h2>
          <p className="font-body mx-auto mt-6 max-w-xl text-lg leading-8 text-text-secondary [text-wrap:pretty]">
            Merchant, SHB Operations, Agent Runs, Audit, Compliance trên dữ liệu mô phỏng.
          </p>
        </Reveal>
        <Reveal delay={120} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-7 text-[15px] font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Mở bản demo
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login?role=merchant"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-7 text-[15px] font-semibold text-text transition-all hover:border-text/20 hover:bg-neutral-soft active:scale-[0.98]"
          >
            Xem kịch bản trình diễn
          </Link>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-6 text-xs text-text-tertiary">
            Không sử dụng dữ liệu ngân hàng thật · Dữ liệu mô phỏng phục vụ trình diễn
          </p>
        </Reveal>
      </div>
    </section>
  );
}
