import { ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { Reveal } from "./Reveal";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Quy tắc xử lý",
    body: "Giao dịch khớp chính xác được xử lý tự động.",
    accent: "text-primary",
    bg: "bg-primary/8",
  },
  {
    icon: Sparkles,
    title: "AI phân tích",
    body: "Tác nhân AI kiểm tra, tổng hợp bằng chứng, đề xuất hành động.",
    accent: "text-primary",
    bg: "bg-primary/8",
  },
  {
    icon: UserCheck,
    title: "Con người phê duyệt",
    body: "Merchant hoặc SHB xác nhận trước mỗi quyết định quan trọng.",
    accent: "text-primary",
    bg: "bg-primary/8",
  },
];

export function Pillars() {
  return (
    <section id="mo-hinh-kiem-soat" className="border-b border-border/60" aria-labelledby="pillars-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Mô hình kiểm soát</p>
          <h2 id="pillars-heading" className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]">
            Tự động hóa mạnh. Con người vẫn kiểm soát.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 120} translate={20}>
              <div className="landing-card flex flex-col gap-4 rounded-xl border bg-surface p-6 surface-shadow-sm">
                <div className="landing-card-accent rounded-t-xl" />
                <span className={`flex size-12 items-center justify-center rounded-xl ${pillar.bg} ${pillar.accent} landing-icon-pulse`}>
                  <pillar.icon size={24} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-xl leading-snug tracking-[-0.02em] text-text">{pillar.title}</h3>
                <p className="font-body text-sm leading-6 text-text-secondary">{pillar.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
