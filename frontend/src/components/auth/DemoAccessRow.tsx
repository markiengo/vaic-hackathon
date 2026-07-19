"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoAccessRowProps = {
  name: string;
  description: string;
  roleLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
};

const accentStyles = {
  primary: {
    iconBg: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary",
    arrow: "text-primary group-hover:text-primary-hover",
    hoverBorder: "hover:border-primary/40",
    glow: "group-hover:shadow-[0_0_0_3px_rgba(243,107,46,0.08)]",
  },
  secondary: {
    iconBg: "bg-secondary/10 text-secondary",
    badge: "bg-secondary/10 text-secondary",
    arrow: "text-secondary group-hover:text-secondary-hover",
    hoverBorder: "hover:border-secondary/40",
    glow: "group-hover:shadow-[0_0_0_3px_rgba(37,60,150,0.08)]",
  },
};

export function DemoAccessRow({
  name,
  description,
  roleLabel,
  icon: Icon,
  accent,
  disabled,
  onClick,
}: DemoAccessRowProps) {
  const styles = accentStyles[accent];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[12px] border border-border bg-white px-3.5 py-3 text-left transition-all disabled:opacity-60",
        styles.hoverBorder,
        styles.glow,
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", styles.iconBg)}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block text-[14px] font-semibold text-ink">{name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", styles.badge)}>
            {roleLabel}
          </span>
        </span>
        <span className="mt-0.5 block text-[12px] text-text-secondary">{description}</span>
      </span>
      <span className={cn("flex shrink-0 items-center gap-1 text-[12px] font-semibold", styles.arrow)}>
        Vào demo
        {disabled ? (
          <LoaderCircle aria-hidden className="animate-spin" size={13} />
        ) : (
          <ArrowRight aria-hidden size={13} className="transition-transform group-hover:translate-x-1" />
        )}
      </span>
    </button>
  );
}
