"use client";

import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  translate?: number;
  [key: string]: unknown;
};

export function Reveal({ children, as: Tag = "div", className, delay = 0, translate = 16, ...rest }: RevealProps) {
  const { ref, shown } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", shown && "reveal-shown", className)}
      style={{
        transitionDelay: `${delay}ms`,
        "--reveal-ty": `${translate}px`,
      } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
