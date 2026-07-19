import { Layers, FileSearch, BarChart3, GitBranch } from "lucide-react";
import { Reveal } from "./Reveal";

const capabilities = [
  {
    icon: Layers,
    title: "Một lớp dữ liệu",
    body: "Kết nối giao dịch, đơn hàng, tiền mặt, hóa đơn.",
  },
  {
    icon: FileSearch,
    title: "Ngoại lệ giải thích được",
    body: "Mỗi đề xuất đi kèm bằng chứng và mức độ tin cậy.",
  },
  {
    icon: BarChart3,
    title: "Theo dõi danh mục",
    body: "SHB thấy merchant bị chặn, Case quá hạn, Agent Run lỗi.",
  },
  {
    icon: GitBranch,
    title: "Truy vết đầy đủ",
    body: "Mọi quyết định, phê duyệt, phiên bản quy tắc đều lưu.",
  },
];

export function StatStrip() {
  return (
    <section id="neng-tang" className="border-b border-border/60 bg-primary-soft/30" aria-label="Nền tảng">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 80}>
              <div className="landing-card flex flex-col gap-3 rounded-xl border bg-surface p-5 surface-shadow-sm">
                <div className="landing-card-accent rounded-t-xl" />
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary landing-icon-pulse">
                  <cap.icon size={20} strokeWidth={1.75} />
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
