import { ArrowUpRight, CheckCircle2, CircleDashed } from "lucide-react";

type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  workspace?: "merchant" | "operations";
};

export function RoutePlaceholder({ eyebrow, title, description, workspace = "merchant" }: RoutePlaceholderProps) {
  return (
    <section className="animate-[route-in_180ms_ease-out]">
      <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 text-[13px] font-medium text-text-tertiary">{eyebrow}</p>
          <h1 className="font-display text-4xl font-medium leading-none tracking-[-0.035em] text-ink sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-text-secondary">{description}</p>
        </div>
        <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm text-white transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-primary-hover active:scale-[0.97]">
          Mở công việc ưu tiên
          <ArrowUpRight size={17} />
        </button>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_0.85fr]">
        <article className="surface-shadow min-h-[430px] rounded-xl border bg-surface p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-text-tertiary">Không gian làm việc</p>
              <h2 className="mt-2 text-xl font-normal text-ink">Dữ liệu tháng 07/2026</h2>
            </div>
            <span className="rounded-full border bg-accent px-3 py-1.5 text-xs text-ink">Đang đồng bộ</span>
          </div>
          <div className="mt-8 grid gap-3">
            {["Nguồn dữ liệu đã kết nối", "Bằng chứng đã được chuẩn hóa", "Hành động cần người dùng xác nhận"].map((label, index) => (
              <div key={label} className="flex min-h-16 items-center gap-4 rounded-xl border bg-background px-4">
                {index < 2 ? <CheckCircle2 className="text-success" size={20} /> : <CircleDashed className="text-warning" size={20} />}
                <span className="flex-1 text-sm text-ink">{label}</span>
                <span className="font-mono text-xs text-text-tertiary">0{index + 1}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-xl border bg-surface p-5 sm:p-7">
          <p className="text-[13px] font-medium text-text-tertiary">Trạng thái sản phẩm</p>
          <p className="font-display mt-5 text-6xl leading-none text-ink">92%</p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {workspace === "operations" ? "Danh mục đang được đưa vào luồng vận hành thật." : "Sổ tháng 7 đang được đưa vào luồng xử lý thật."}
          </p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full w-[92%] rounded-full bg-mango" />
          </div>
          <p className="mt-6 rounded-xl bg-accent p-4 text-sm leading-6 text-ink">Foundation đã sẵn sàng. Dữ liệu và hành động thật được nối ở các stage tiếp theo.</p>
        </aside>
      </div>
    </section>
  );
}
