"use client";

import { cn } from "@/lib/utils";

type AuthFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  className?: string;
};

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  minLength,
  defaultValue,
  className,
}: AuthFieldProps) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className="h-[46px] rounded-[10px] border border-border bg-white px-4 text-[14px] text-ink outline-none transition-colors placeholder:text-text-tertiary focus:border-primary"
      />
    </label>
  );
}
