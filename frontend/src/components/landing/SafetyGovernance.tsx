import { Check } from "lucide-react";
import { Reveal } from "./Reveal";

const items = [
  "Phê duyệt con người cho hành động quan trọng",
  "Quy tắc xác định cho đánh giá sẵn sàng",
  "Không hiển thị chain-of-thought",
  "Audit event bất biến",
  "Phiên bản quy tắc có ngày hiệu lực",
  "Phân quyền merchant, SHB Ops, Compliance",
  "Không thay thế kế toán hoặc hóa đơn hiện có",
];

export function SafetyGovernance() {
  return (
    <section id="an-toan" className="border-b border-border/60" aria-labelledby="safety-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">An toàn & kiểm soát</p>
            <h2 id="safety-heading" className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]">
              AI mở rộng. Không mất tính giải thích.
            </h2>
            <p className="font-body mt-5 text-lg leading-8 text-text-secondary [text-wrap:pretty]">
              Mọi quyết định có actor, bằng chứng, phiên bản quy tắc. TaxLens điều phối giữa các hệ thống, không thay thế.
            </p>
          </Reveal>

          <Reveal delay={120} translate={20}>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item} className="landing-card flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 surface-shadow-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Check size={16} strokeWidth={2.5} />
                  </span>
                  <span className="font-body text-sm leading-6 text-text">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
