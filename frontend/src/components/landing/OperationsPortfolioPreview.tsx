import { Reveal } from "./Reveal";

const portfolioItems = [
  { merchant: "Salon Hương", status: "Bị chặn", tone: "danger" as const, rm: "Linh Nguyễn", cases: 2 },
  { merchant: "Cafe Mỹ Anh", status: "Hồ sơ quá hạn", tone: "warning" as const, rm: "Minh Trần", cases: 1 },
  { merchant: "Quán 79", status: "Kết nối lỗi", tone: "danger" as const, rm: "Linh Nguyễn", cases: 0 },
  { merchant: "Bakery Sweet", status: "Bình thường", tone: "success" as const, rm: "Hoa Phạm", cases: 0 },
  { merchant: "Shop Thời Trang Mây", status: "Hồ sơ quá hạn", tone: "warning" as const, rm: "Minh Trần", cases: 3 },
];

export function OperationsPortfolioPreview() {
  return (
    <section id="shb-operations" className="border-b border-border bg-background" aria-labelledby="portfolio-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Giá trị vận hành cho SHB
          </p>
          <h2
            id="portfolio-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            SHB nhìn thấy vấn đề trước khi chúng trở thành khối lượng xử lý thủ công.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 lg:items-start">
          {/* Left: portfolio dashboard mockup */}
          <Reveal translate={20}>
            <div className="rounded-xl border bg-surface surface-shadow-md overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-neutral-soft px-4 py-3">
                <span className="size-3 rounded-full bg-danger/40" />
                <span className="size-3 rounded-full bg-mango/60" />
                <span className="size-3 rounded-full bg-success/40" />
                <span className="ml-3 font-mono text-xs text-text-tertiary">
                  SHB Operations — Dữ liệu mô phỏng
                </span>
              </div>

              <div className="p-5">
                {/* Dashboard header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg leading-tight text-text">Tổng quan vận hành</div>
                    <div className="mt-0.5 text-xs text-text-tertiary">Tháng 7/2026 · 5 khách hàng</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-tertiary">
                      Lọc theo trạng thái
                    </div>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-surface p-3">
                    <div className="text-[10px] text-text-tertiary">Cần chú ý</div>
                    <div className="font-display text-xl text-danger">3</div>
                  </div>
                  <div className="rounded-lg border bg-surface p-3">
                    <div className="text-[10px] text-text-tertiary">Hồ sơ quá hạn</div>
                    <div className="font-display text-xl text-mango">2</div>
                  </div>
                  <div className="rounded-lg border bg-surface p-3">
                    <div className="text-[10px] text-text-tertiary">Lần chạy thất bại</div>
                    <div className="font-display text-xl text-danger">1</div>
                  </div>
                </div>

                {/* Merchant list */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-neutral-soft/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    <span>Khách hàng kinh doanh</span>
                    <span>Trạng thái</span>
                    <span>RM</span>
                  </div>
                  <div className="divide-y">
                    {portfolioItems.map((item) => (
                      <div
                        key={item.merchant}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5"
                      >
                        <div>
                          <div className="text-sm font-semibold text-text">{item.merchant}</div>
                          <div className="font-mono text-[10px] text-text-tertiary">
                            {item.cases > 0 ? `${item.cases} hồ sơ xử lý` : "Không có hồ sơ"}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.tone === "danger"
                              ? "bg-danger-soft text-danger"
                              : item.tone === "warning"
                                ? "bg-mango/15 text-warning"
                                : "bg-success-soft text-success"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-text-secondary">{item.rm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: text descriptions */}
          <Reveal delay={120} translate={20} className="space-y-8 lg:pt-8">
            <div>
              <h3 className="font-display text-lg leading-snug tracking-tight text-text">
                Phát hiện sớm
              </h3>
              <p className="mt-2 text-base leading-relaxed text-text-secondary">
                Nhìn thấy khách hàng kinh doanh bị chặn, kết nối lỗi hoặc hồ sơ quá hạn
                trước khi phát sinh hỗ trợ thủ công kéo dài.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg leading-snug tracking-tight text-text">
                Chuẩn bị trước khi chuyển người
              </h3>
              <p className="mt-2 text-base leading-relaxed text-text-secondary">
                TaxLens tổng hợp bản ghi, bằng chứng và đề xuất
                trước khi chuyển tới SHB Operations hoặc Relationship Manager.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg leading-snug tracking-tight text-text">
                Một luồng xuyên suốt
              </h3>
              <p className="mt-2 text-base leading-relaxed text-text-secondary">
                Khách hàng kinh doanh, hồ sơ xử lý, lần chạy tác nhân AI
                và sự kiện truy vết được liên kết trong cùng một quy trình.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
