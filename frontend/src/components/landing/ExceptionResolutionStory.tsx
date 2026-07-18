"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const steps = [
  {
    key: "detect",
    label: "Phát hiện",
    num: "01",
  },
  {
    key: "propose",
    label: "Đề xuất",
    num: "02",
  },
  {
    key: "approve",
    label: "Phê duyệt",
    num: "03",
  },
];

export function ExceptionResolutionStory() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="ngoai-le"
      className="border-b border-border bg-background"
      aria-labelledby="exception-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Từ mơ hồ đến quyết định có bằng chứng
          </p>
          <h2
            id="exception-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            TaxLens không đoán thay người dùng.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary [text-wrap:pretty]">
            Khi không đủ chắc chắn, TaxLens chuẩn bị bằng chứng, nêu phần còn thiếu
            và chờ phê duyệt trước khi thay đổi dữ liệu.
          </p>
        </Reveal>

        {/* Step selector */}
        <Reveal delay={80} className="mt-12">
          <div className="flex gap-2">
            {steps.map((step, i) => (
              <button
                key={step.key}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
                  active === i
                    ? "border-secondary bg-selection-soft text-secondary"
                    : "border-border bg-surface text-text-tertiary hover:border-border-strong hover:text-text-secondary"
                }`}
              >
                <span className="font-mono text-xs opacity-60">{step.num}</span>
                {step.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Visual area */}
        <Reveal delay={120} translate={20} className="mt-8">
          <div className="min-h-[420px] rounded-xl border bg-surface surface-shadow-md overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b bg-neutral-soft px-4 py-3">
              <span className="size-3 rounded-full bg-danger/40" />
              <span className="size-3 rounded-full bg-mango/60" />
              <span className="size-3 rounded-full bg-success/40" />
              <span className="ml-3 font-mono text-xs text-text-tertiary">
                taxlens.app — Dữ liệu mô phỏng
              </span>
            </div>

            <div className="p-6">
              {active === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                      Cần xác nhận
                    </span>
                    <span className="text-xs text-text-tertiary">Phát hiện lúc 10:24</span>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Giao dịch
                      </span>
                      <span className="font-mono text-xs text-text-tertiary">TXN-8821</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="font-display text-3xl tracking-tight text-text">5.000.000₫</span>
                    </div>
                    <div className="mt-3 rounded-md bg-neutral-soft px-3 py-2">
                      <span className="text-xs text-text-tertiary">Nội dung: </span>
                      <span className="font-mono text-xs text-text">NGUYEN THI HUONG CHUYEN</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-mango/30 bg-mango/5 p-4">
                    <span className="mt-0.5 size-2 shrink-0 rounded-full bg-mango" />
                    <p className="text-sm leading-relaxed text-text-secondary">
                      Giao dịch không khớp chính xác với đơn hàng nào. Số tiền lớn hơn mọi đơn hàng trong ngày.
                      Nội dung chuyển có dấu hiệu giao dịch cá nhân.
                    </p>
                  </div>
                </div>
              )}

              {active === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-selection-soft px-2.5 py-1 text-xs font-semibold text-secondary">
                        Đề xuất của TaxLens
                      </span>
                      <span className="text-xs text-text-tertiary">10:24:18</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-text-tertiary">Độ tin cậy</span>
                      <span className="font-display text-xl text-secondary">87%</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-5">
                    <div className="text-sm font-semibold text-text">Phân loại đề xuất</div>
                    <div className="mt-2 inline-block rounded-md bg-secondary/10 px-3 py-1.5 text-sm font-semibold text-secondary">
                      Chuyển nội bộ
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-success">
                        Bằng chứng
                      </div>
                      <ul className="mt-3 space-y-2.5 text-sm text-text-secondary">
                        <li className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                          Tên người gửi trùng với chủ cửa hàng
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                          Không có đơn hàng khớp số tiền
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                          Nội dung có dấu hiệu chuyển khoản cá nhân
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-mango">
                        Chưa chắc chắn
                      </div>
                      <ul className="mt-3 space-y-2.5 text-sm text-text-secondary">
                        <li className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mango" />
                          Chưa xác minh tài khoản nguồn
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover">
                      Phê duyệt
                    </button>
                    <button className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-neutral-soft">
                      Từ chối
                    </button>
                  </div>
                </div>
              )}

              {active === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                      Đã phê duyệt
                    </span>
                    <span className="text-xs text-text-tertiary">Linh Nguyễn · 10:26:04</span>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-5">
                    <div className="text-sm font-semibold text-text">Hành động sau phê duyệt</div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "Cập nhật phân loại", value: "Chuyển nội bộ", done: true },
                        { label: "Ghi sự kiện truy vết", value: "AUD-20260718-104218", done: true },
                        { label: "Tính lại mức độ sẵn sàng", value: "92% → 95%", done: true },
                      ].map((action) => (
                        <div key={action.label} className="flex items-center gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-text">{action.label}</div>
                            <div className="font-mono text-xs text-text-tertiary">{action.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-neutral-soft/50 p-4">
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <span className="font-mono">RUN-8912</span>
                      <span>·</span>
                      <span className="font-mono">Rule 2026.07</span>
                      <span>·</span>
                      <span>Phiên bản quy tắc hiện hành</span>
                    </div>
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
