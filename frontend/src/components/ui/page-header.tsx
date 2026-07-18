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
    <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {(eyebrow || merchant || period || updatedAt) && (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            {eyebrow ? <span>{eyebrow}</span> : null}
            {merchant ? <span>{merchant}</span> : null}
            {period ? <span className="text-text-secondary">{period}</span> : null}
            {updatedAt ? <span className="text-text-tertiary">Cập nhật {updatedAt}</span> : null}
          </div>
        )}
        <h1 className="font-display text-4xl font-medium leading-none tracking-[-0.035em] text-text sm:text-5xl">{title}</h1>
        {supportingText && <p className="mt-4 max-w-2xl text-[15px] leading-7 text-text-secondary">{supportingText}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div>}
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
