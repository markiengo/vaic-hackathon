import { Bot, Building2, ScrollText, Scale } from "lucide-react";
import { Reveal } from "./Reveal";

const capabilities = [
  {
    icon: Bot,
    title: "Agent-first",
    body: "Merchant giao mục tiêu. TaxLens chia việc, kiểm tra, tạo artifact, dừng khi cần xác nhận.",
  },
  {
    icon: Building2,
    title: "SHB Operations",
    body: "Theo dõi danh mục, xử lý Cases, xem Agent Runs, phối hợp RM.",
  },
  {
    icon: ScrollText,
    title: "Trace & Audit",
    body: "Mỗi thay đổi có actor, bằng chứng, phiên bản quy tắc, bản ghi trước/sau.",
  },
  {
    icon: Scale,
    title: "Compliance",
    body: "Phiên bản quy tắc gắn nguồn, ngày hiệu lực, người phê duyệt.",
  },
];

export function CapabilitySplit() {
  return (
    <section id="nang-luc-nen-tang" className="border-b border-border/60" aria-labelledby="capability-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Năng lực nền tảng</p>
          <h2 id="capability-heading" className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]">
            Điều phối, kiểm soát, bằng chứng.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 100} translate={20}>
              <div className="landing-card flex flex-col gap-4 rounded-xl border bg-surface p-6 surface-shadow-sm">
                <div className="landing-card-accent rounded-t-xl" />
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary landing-icon-pulse">
                  <cap.icon size={24} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-base leading-snug tracking-[-0.01em] text-text">{cap.title}</h3>
                <p className="font-body text-sm leading-6 text-text-secondary">{cap.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
