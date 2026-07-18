import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-xl border p-5 sm:p-6", {
  variants: {
    variant: {
      standard: "bg-surface",
      information: "border-secondary/20 bg-accent text-text",
      workspace: "bg-surface-elevated surface-shadow",
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
      <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary", accent === "mist" && "text-text")}>{label}</p>
      <p className="font-display mt-4 text-4xl leading-none tracking-[-0.03em] text-text">{value}</p>
      {(detail || trend) && (
        <div className={cn("mt-4 flex min-h-6 items-center justify-between gap-3 text-xs text-text-secondary", accent === "mist" && "text-text")}>
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
