import { Reveal } from "./Reveal";

const steps = [
  {
    num: "01",
    title: "Kết nối",
    body: "Giao dịch SHB, dữ liệu bán hàng, tiền mặt, hóa đơn.",
    detail: "SHB · POS · CSV · Invoice",
  },
  {
    num: "02",
    title: "Đối soát",
    body: "Bản ghi rõ ràng tự động. Ngoại lệ thành Case cho SHB.",
    detail: "Quy tắc · AI · Bằng chứng",
  },
  {
    num: "03",
    title: "Phê duyệt",
    body: "Merchant hoặc SHB xác nhận. TaxLens cập nhật hồ sơ.",
    detail: "Human approval · Audit event",
  },
  {
    num: "04",
    title: "Xuất dữ liệu",
    body: "Chuyển sang kế toán, báo cáo, quy trình thuế hiện có.",
    detail: "Kế toán · Báo cáo · Thuế",
  },
];

export function HowItWorks() {
  return (
    <section id="cach-van-hanh" className="border-b border-border/60 bg-surface/40" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Cách TaxLens vận hành</p>
          <h2 id="how-heading" className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]">
            Bốn bước. Một quy trình có kiểm soát.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 120}>
              <div className="landing-card relative flex flex-col rounded-xl border bg-surface p-6 surface-shadow-sm">
                <div className="landing-card-accent rounded-t-xl" />
                <span className="landing-step-num font-mono text-2xl font-bold">{step.num}</span>
                <h3 className="font-display mt-2 text-lg leading-snug tracking-[-0.02em] text-text">{step.title}</h3>
                <p className="font-body mt-3 flex-1 text-sm leading-6 text-text-secondary">{step.body}</p>
                <span className="mt-4 font-mono text-[11px] text-text-tertiary">{step.detail}</span>
                {i < steps.length - 1 && (
                  <span className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-text-tertiary md:flex">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
