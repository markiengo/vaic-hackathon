import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldShellProps = { label: string; hint?: string; error?: string; required?: boolean; inputId: string; children: ReactNode };

function FieldShell({ label, hint, error, required, inputId, children }: FieldShellProps) {
  const messageId = `${inputId}-message`;
  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-text">{label}{required && <span aria-hidden className="ml-1 text-danger">*</span>}</label>
      {children}
      {(error || hint) && <p id={messageId} className={cn("text-xs leading-5 text-text-secondary", error && "text-danger")} aria-live={error ? "polite" : undefined}>{error ?? hint}</p>}
    </div>
  );
}

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, id, className, required, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} inputId={inputId}>
      <input ref={ref} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? `${inputId}-message` : undefined} className={cn("min-h-11 w-full rounded-lg border bg-surface px-3.5 text-sm text-text placeholder:text-text-secondary disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60", error && "border-danger", className)} {...props} />
    </FieldShell>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string; children: ReactNode };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, id, className, required, children, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} inputId={inputId}>
      <select ref={ref} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? `${inputId}-message` : undefined} className={cn("min-h-11 w-full rounded-lg border bg-surface px-3.5 text-sm text-text disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60", error && "border-danger", className)} {...props}>{children}</select>
    </FieldShell>
  );
});
