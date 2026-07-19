import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "border-primary bg-surface text-primary hover:bg-primary-soft",
        secondaryPill: "border-primary bg-surface text-primary rounded-full hover:bg-primary-soft",
        tertiary: "border-transparent bg-transparent text-secondary hover:bg-accent hover:text-ink",
        outline: "border-border-strong bg-surface text-ink hover:border-primary hover:text-primary",
        ghost: "border-transparent bg-transparent text-text-secondary hover:bg-accent hover:text-ink",
        danger: "border-danger bg-danger text-white hover:brightness-90",
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-10 px-5",
        lg: "min-h-12 px-5 text-[15px]",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
