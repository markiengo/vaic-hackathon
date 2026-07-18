import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContextChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("rounded-full bg-[#F5F6F8] px-3 py-1 text-xs font-semibold text-secondary", className)}>
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex items-center justify-between", className)}>
      <h3 className="font-display text-[28px] text-ink">{title}</h3>
      {action}
    </div>
  );
}

export function QuickActionCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-surface p-6 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <Icon aria-hidden className="text-primary" size={30} />
      <span className="text-sm font-semibold text-text">{label}</span>
    </Link>
  );
}

export function InformationPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-[var(--taxlens-information-soft)] p-5", className)}>
      {children}
    </div>
  );
}

export function RecommendationPanel({
  title,
  confidence,
  reasoning,
  className,
}: {
  title: string;
  confidence?: string | null;
  reasoning?: string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-[var(--taxlens-information-soft)] p-5", className)}>
      <p className="mb-3 text-sm font-bold text-secondary">
        Gợi ý từ TaxLens: {title}
        {confidence ? ` (${confidence})` : ""}
      </p>
      {reasoning && reasoning.length > 0 && (
        <ul className="list-inside list-disc space-y-2 text-xs text-text-secondary">
          {reasoning.slice(0, 3).map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
