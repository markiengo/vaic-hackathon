import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl border bg-surface", {
  variants: {
    variant: {
      standard: "p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]",
      compact: "p-6 shadow-[0_4px_24px_rgba(25,36,78,0.04)]",
      information: "border-border bg-[var(--taxlens-information-soft)] p-5 text-ink",
      workspace: "bg-surface-elevated surface-shadow p-6",
    },
  },
  defaultVariants: { variant: "standard" },
});

export type CardProps = HTMLAttributes<HTMLElement> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, ...props }: CardProps) {
  return <article className={cn(cardVariants({ variant }), className)} {...props} />;
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  accent?: "default" | "mist" | "mango";
};

const trendIcons = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

export function KpiCard({ label, value, detail, trend, accent = "default" }: KpiCardProps) {
  const TrendIcon = trend ? trendIcons[trend.direction] : null;
  return (
    <Card className={cn("relative overflow-hidden", accent === "mist" && "bg-accent", accent === "mango" && "border-mango")}>
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-1 bg-border-strong", accent === "mist" && "bg-secondary", accent === "mango" && "bg-mango")} />
      <p className={cn("text-[13px] font-medium text-text-secondary", accent === "mist" && "text-ink")}>{label}</p>
      <p className="font-display mt-4 text-[36px] leading-tight tracking-[-0.03em] text-ink">{value}</p>
      {(detail || trend) && (
        <div className={cn("mt-4 flex min-h-6 items-center justify-between gap-3 text-xs text-text-secondary", accent === "mist" && "text-ink")}>
          <span>{detail}</span>
          {trend && TrendIcon && (
            <span className="inline-flex items-center gap-1 font-semibold text-secondary">
              <TrendIcon aria-hidden size={14} /> {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
