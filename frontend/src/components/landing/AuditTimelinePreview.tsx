import { Reveal } from "./Reveal";

const timeline = [
  {
    time: "10:24:17",
    actor: "TaxLens",
    action: "Phát hiện 2 đơn thiếu hóa đơn",
    type: "detect" as const,
  },
  {
    time: "10:24:18",
    actor: "TaxLens",
    action: "Đề xuất được chuyển tới Linh Nguyễn",
    type: "propose" as const,
  },
  {
    time: "10:26:04",
    actor: "Linh Nguyễn",
    action: "Phê duyệt yêu cầu khách hàng kinh doanh xác nhận",
    type: "approve" as const,
  },
  {
    time: "10:26:05",
    actor: "TaxLens",
    action: "CASE-1428 chuyển sang Chờ khách hàng kinh doanh",
    type: "update" as const,
  },
];

export function AuditTimelinePreview() {
  return (
    <section className="border-b border-border bg-surface/40" aria-labelledby="audit-heading">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Kiểm soát không dừng ở một dòng đề xuất
          </p>
          <h2
            id="audit-heading"
            className="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-text [text-wrap:balance]"
          >
            Mỗi hành động đều có thể giải thích, kiểm tra và tái tạo.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:items-start">
          {/* Left: timeline visual */}
          <Reveal translate={20}>
            <div className="rounded-xl border bg-surface surface-shadow-md overflow-hidden">
              <div className="border-b bg-neutral-soft px-4 py-3">
                <span className="font-mono text-xs text-text-tertiary">Truy vết sự kiện</span>
              </div>
              <div className="p-5">
                <div className="relative">
                  <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border-strong" />
                  <ul className="space-y-6">
                    {timeline.map((event) => (
                      <li key={event.time} className="relative flex gap-4">
                        <span
                          className={`relative z-10 mt-1 size-6 shrink-0 rounded-full border-2 flex items-center justify-center ${
                            event.type === "approve"
                              ? "border-success bg-success-soft"
                              : event.type === "detect"
                                ? "border-danger bg-danger-soft"
                                : "border-secondary bg-selection-soft"
                          }`}
                        >
                          {event.type === "approve" && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-text">{event.time}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                event.actor === "TaxLens"
                                  ? "bg-secondary/10 text-secondary"
                                  : "bg-mango/15 text-warning"
                              }`}
                            >
                              {event.actor}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{event.action}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metadata footer */}
                <div className="mt-6 flex flex-wrap gap-3 border-t pt-4">
                  <span className="rounded-md border border-border bg-neutral-soft px-2.5 py-1 font-mono text-[10px] text-text-tertiary">
                    Rule 2026.07
                  </span>
                  <span className="rounded-md border border-border bg-neutral-soft px-2.5 py-1 font-mono text-[10px] text-text-tertiary">
                    RUN-8912
                  </span>
                  <span className="rounded-md border border-border bg-neutral-soft px-2.5 py-1 font-mono text-[10px] text-text-tertiary">
                    AUD-20260718-104218
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: before/after + key points */}
          <Reveal delay={120} translate={20} className="space-y-6">
            {/* Before/after comparison */}
            <div className="rounded-xl border bg-surface surface-shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 divide-x">
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Trước
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-neutral-soft/50 px-3 py-2 text-sm text-text-secondary">
                    Chờ SHB phê duyệt
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Sau
                  </div>
                  <div className="mt-3 rounded-lg border border-secondary/20 bg-selection-soft px-3 py-2 text-sm font-semibold text-secondary">
                    Chờ khách hàng kinh doanh xác nhận
                  </div>
                </div>
              </div>
            </div>

            {/* Key points */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
                <p className="text-sm leading-relaxed text-text-secondary">
                  Phê duyệt của con người cho hành động quan trọng
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
                <p className="text-sm leading-relaxed text-text-secondary">
                  Quy tắc xác định cho đánh giá mức độ sẵn sàng
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
                <p className="text-sm leading-relaxed text-text-secondary">
                  Bản ghi truy vết không thể chỉnh sửa âm thầm
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-text-tertiary" />
                <p className="text-xs leading-relaxed text-text-tertiary">
                  Hiển thị kế hoạch, bằng chứng và kết quả — không hiển thị suy luận nội bộ.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
