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
    <label className={cn("grid gap-2", className)}>
      <span className="text-[14px] font-medium text-text">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className="h-[54px] rounded-[12px] border border-border bg-white px-4 text-[15px] text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-primary"
      />
    </label>
  );
}
