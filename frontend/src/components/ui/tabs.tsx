"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { value: string; label: string; content: ReactNode };

export function Tabs({ items, defaultValue, ariaLabel, className }: { items: TabItem[]; defaultValue?: string; ariaLabel: string; className?: string }) {
  const id = useId();
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((item) => item.value === active);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    setActive(items[next].value);
    requestAnimationFrame(() => document.getElementById(`${id}-tab-${items[next].value}`)?.focus());
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item) => (
          <button key={item.value} id={`${id}-tab-${item.value}`} type="button" role="tab" aria-selected={active === item.value} aria-controls={`${id}-panel-${item.value}`} tabIndex={active === item.value ? 0 : -1} onClick={() => setActive(item.value)} className={cn("min-h-10 shrink-0 border-b-2 border-transparent px-4 text-sm font-semibold text-text-secondary", active === item.value && "border-secondary text-secondary")}>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div key={item.value} id={`${id}-panel-${item.value}`} role="tabpanel" aria-labelledby={`${id}-tab-${item.value}`} hidden={active !== item.value} tabIndex={0} className="py-5">
          {item.content}
        </div>
      ))}
    </div>
  );
}
