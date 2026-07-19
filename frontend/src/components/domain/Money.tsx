import { cn } from "@/lib/utils";

const formatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

interface MoneyProps {
  value: number;
  className?: string;
  showPositiveSign?: boolean;
}

export function formatMoney(value: number): string {
  return formatter.format(value).replace(/\s/g, "");
}

export function Money({ value, className, showPositiveSign = false }: MoneyProps) {
  const formatted = `${showPositiveSign && value > 0 ? "+" : ""}${formatMoney(value)}`;
  return (
    <span
      aria-label={`${value < 0 ? "Âm " : ""}${Math.abs(value).toLocaleString("vi-VN")} đồng`}
      className={cn(
        "whitespace-nowrap font-mono tabular-nums",
        value < 0 && "text-danger",
        className,
      )}
    >
      {formatted}
    </span>
  );
}
