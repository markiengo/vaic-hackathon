import { TrendingUp, Zap, Eye, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";

const values = [
  {
    icon: TrendingUp,
    title: "Tăng giá trị merchant",
    body: "Hỗ trợ vận hành sau thanh toán, không chỉ tài khoản và QR.",
  },
  {
    icon: Zap,
    title: "Giảm xử lý thủ công",
    body: "AI chuẩn bị bằng chứng, phân loại, đề xuất trước khi chuyển SHB.",
  },
  {
    icon: Eye,
    title: "Phát hiện sớm",
    body: "Portfolio dashboard: merchant bị chặn, Case quá SLA, kết nối lỗi.",
  },
  {
    icon: ShieldCheck,
    title: "Kiểm soát truy vết",
    body: "Case, Agent Run, phê duyệt, audit event liên kết trong một hệ thống.",
  },
];

export function SHBValue() {
  return (
    <section id="gia-tri-shb" className="border-b border-border/60 bg-surface/40" aria-labelledby="shb-value-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Giá trị cho SHB</p>
          <h2 id="shb-value-heading" className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]">
            Từ thanh toán đến đồng hành vận hành.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((val, i) => (
            <Reveal key={val.title} delay={i * 100} translate={20}>
              <div className="landing-card flex flex-col gap-4 rounded-xl border bg-surface p-6 surface-shadow-sm">
                <div className="landing-card-accent rounded-t-xl" />
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary landing-icon-pulse">
                  <val.icon size={24} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-base leading-snug tracking-[-0.01em] text-text">{val.title}</h3>
                <p className="font-body text-sm leading-6 text-text-secondary">{val.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
