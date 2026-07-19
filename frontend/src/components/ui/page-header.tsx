import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  merchant?: string;
  period?: string;
  updatedAt?: string;
  title: string;
  description?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, merchant, period, updatedAt, title, description, subtitle, actions }: PageHeaderProps) {
  const supportingText = subtitle ?? description;
  return (
    <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {(eyebrow || merchant || period || updatedAt) && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            {eyebrow ? <span className="font-semibold text-text-secondary">{eyebrow}</span> : null}
            {merchant ? <span className="rounded-full bg-[#F5F6F8] px-3 py-1 text-xs font-semibold text-secondary">{merchant}</span> : null}
            {period ? <span className="text-text-tertiary">{period}</span> : null}
            {updatedAt ? <span className="text-text-tertiary">Cập nhật {updatedAt}</span> : null}
          </div>
        )}
        <h2 className="mb-2 font-display text-[44px] leading-tight tracking-[-0.02em] text-ink">{title}</h2>
        {supportingText && <p className="text-sm text-text-secondary">{supportingText}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function FilterBar({ children, summary, className }: { children: ReactNode; summary?: ReactNode; className?: string }) {
  return (
    <section aria-label="Bộ lọc" className={cn("rounded-xl border bg-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 md:hidden"><span className="inline-flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal aria-hidden size={17} />Bộ lọc</span>{summary}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end [&>*]:min-w-0 lg:[&>*]:min-w-40">{children}</div>
    </section>
  );
}
