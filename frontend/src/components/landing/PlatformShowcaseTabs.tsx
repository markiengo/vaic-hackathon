"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const tabs = [
  {
    key: "assistant",
    label: "Trợ lý TaxLens",
    desc: "Khách hàng kinh doanh giao mục tiêu. TaxLens chia việc, kiểm tra dữ liệu và dừng khi cần xác nhận.",
  },
  {
    key: "operations",
    label: "SHB Operations",
    desc: "Theo dõi danh mục, xử lý hồ sơ, xem lần chạy tác nhân AI và phối hợp với Relationship Manager.",
  },
  {
    key: "trace",
    label: "Truy vết & kiểm toán",
    desc: "Mỗi thay đổi có actor, bằng chứng, phiên bản quy tắc và bản ghi trước/sau.",
  },
  {
    key: "compliance",
    label: "Tuân thủ",
    desc: "Phiên bản quy tắc được gắn nguồn, ngày hiệu lực và người phê duyệt.",
  },
];

export function PlatformShowcaseTabs() {
  const [active, setActive] = useState(0);

  return (
    <section id="neng-tang" className="border-b border-border bg-background" aria-labelledby="platform-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Một nền tảng, bốn lớp vận hành
          </p>
          <h2
            id="platform-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            Từ giao việc đến kiểm toán trong cùng một sản phẩm.
          </h2>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={80} className="mt-12">
          <div className="flex flex-wrap gap-2 border-b pb-px">
            {tabs.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActive(i)}
                className={`relative rounded-t-lg px-5 py-3 text-sm font-semibold transition-colors ${
                  active === i
                    ? "text-secondary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {tab.label}
                {active === i && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-secondary" />
                )}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tab description */}
        <Reveal delay={100} className="mt-6">
          <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
            {tabs[active].desc}
          </p>
        </Reveal>

        {/* Tab content */}
        <Reveal delay={120} translate={20} className="mt-8">
          <div className="min-h-[380px] rounded-xl border bg-surface surface-shadow-md overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-neutral-soft px-4 py-3">
              <span className="size-3 rounded-full bg-danger/40" />
              <span className="size-3 rounded-full bg-mango/60" />
              <span className="size-3 rounded-full bg-success/40" />
              <span className="ml-3 font-mono text-xs text-text-tertiary">
                taxlens.app — {tabs[active].label} — Dữ liệu mô phỏng
              </span>
            </div>

            <div className="p-6">
              {active === 0 && (
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  {/* Conversation */}
                  <div className="space-y-3">
                    <div className="rounded-lg bg-selection-soft p-3">
                      <div className="text-xs font-semibold text-secondary">Khách hàng kinh doanh</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-text">
                        Đối soát giao dịch hôm nay giúp tôi.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs font-semibold text-text-secondary">Trợ lý TaxLens</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-text">
                        Đã đối soát 25/30 giao dịch. 3 mục cần xác nhận, 2 đơn thiếu hóa đơn.
                        Bạn muốn xử lý ngoại lệ trước hay sau?
                      </p>
                    </div>
                    <div className="rounded-lg bg-selection-soft p-3">
                      <div className="text-xs font-semibold text-secondary">Khách hàng kinh doanh</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-text">
                        Ngoại lệ trước đi.
                      </p>
                    </div>
                  </div>
                  {/* Artifact pane */}
                  <div className="rounded-lg border border-border bg-neutral-soft/30 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      Artifact
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded border border-border bg-surface px-3 py-2 text-sm">
                        <span className="font-mono text-xs text-text-tertiary">TXN-04812</span>
                        <div className="text-sm font-semibold text-text">1.500.000₫ — Đã khớp</div>
                      </div>
                      <div className="rounded border border-border bg-surface px-3 py-2 text-sm">
                        <span className="font-mono text-xs text-text-tertiary">TXN-8821</span>
                        <div className="text-sm font-semibold text-text">5.000.000₫ — Cần xác nhận</div>
                      </div>
                      <div className="rounded border border-border bg-surface px-3 py-2 text-sm">
                        <span className="font-mono text-xs text-text-tertiary">DH-1024</span>
                        <div className="text-sm font-semibold text-text">Thiếu hóa đơn</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {active === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Portfolio summary */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] text-text-tertiary">Tổng khách hàng</div>
                        <div className="font-display text-2xl text-text">5</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] text-text-tertiary">Hồ sơ đang xử lý</div>
                        <div className="font-display text-2xl text-mango">6</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] text-text-tertiary">Lần chạy AI hôm nay</div>
                        <div className="font-display text-2xl text-secondary">12</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] text-text-tertiary">Thất bại</div>
                        <div className="font-display text-2xl text-danger">1</div>
                      </div>
                    </div>
                  </div>
                  {/* Cases list */}
                  <div className="rounded-lg border overflow-hidden">
                    <div className="border-b bg-neutral-soft/60 px-3 py-2 text-xs font-semibold text-text">
                      Cases
                    </div>
                    <div className="divide-y">
                      {[
                        { id: "CASE-1428", merchant: "Salon Hương", status: "Chờ SHB", tone: "warning" },
                        { id: "CASE-1425", merchant: "Cafe Mỹ Anh", status: "Quá hạn", tone: "danger" },
                        { id: "CASE-1420", merchant: "Shop Mây", status: "Đã đóng", tone: "success" },
                      ].map((c) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="font-mono text-[10px] text-text-tertiary">{c.id}</span>
                          <span className="flex-1 text-xs text-text">{c.merchant}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              c.tone === "danger"
                                ? "bg-danger-soft text-danger"
                                : c.tone === "warning"
                                  ? "bg-mango/15 text-warning"
                                  : "bg-success-soft text-success"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {active === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-text">AUD-20260718-104218</span>
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                        Đã phê duyệt
                      </span>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                          Trước
                        </div>
                        <div className="mt-2 rounded-md border border-border bg-neutral-soft/50 px-3 py-2 text-sm text-text-secondary">
                          Phân loại: Doanh thu bán hàng
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          Sau
                        </div>
                        <div className="mt-2 rounded-md border border-secondary/20 bg-selection-soft px-3 py-2 text-sm font-semibold text-secondary">
                          Phân loại: Chuyển nội bộ
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="text-[10px] text-text-tertiary">Người thực hiện</div>
                      <div className="mt-1 text-sm font-semibold text-text">Linh Nguyễn</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-[10px] text-text-tertiary">Thời gian</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-text">10:26:04</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-[10px] text-text-tertiary">Phiên bản quy tắc</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-text">2026.07</div>
                    </div>
                  </div>
                </div>
              )}

              {active === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b bg-neutral-soft/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                      <span>Phiên bản quy tắc</span>
                      <span>Nguồn</span>
                      <span>Hiệu lực</span>
                      <span>Người phê duyệt</span>
                    </div>
                    <div className="divide-y">
                      {[
                        { version: "2026.07", source: "Thông tư 40/2021", date: "01/07/2026", approver: "Hoa Phạm" },
                        { version: "2026.06", source: "Nội bộ SHB", date: "01/06/2026", approver: "Hoa Phạm" },
                        { version: "2026.05", source: "Thông tư 40/2021", date: "01/05/2026", approver: "Minh Trần" },
                      ].map((r) => (
                        <div key={r.version} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-text">{r.version}</span>
                          <span className="text-xs text-text-secondary">{r.source}</span>
                          <span className="font-mono text-xs text-text-tertiary">{r.date}</span>
                          <span className="text-xs text-text-secondary">{r.approver}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-neutral-soft/50 p-4">
                    <div className="text-xs font-semibold text-text-secondary">Quy tắc hiện hành</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      Phiên bản 2026.07 áp dụng cho toàn bộ đánh giá mức độ sẵn sàng.
                      Mọi thay đổi quy tắc được ghi nhận với nguồn, ngày hiệu lực và người phê duyệt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
