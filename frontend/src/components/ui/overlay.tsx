"use client";

import { X } from "lucide-react";
import { useCallback, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type OverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

function NativeDialog({ open, onOpenChange, title, description, children, footer, sheet = false }: OverlayProps & { sheet?: boolean }) {
  const titleId = useId();
  const descriptionId = useId();
  const openDialog = useCallback((dialog: HTMLDialogElement | null) => {
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  if (!open) return null;

  return (
    <dialog
      ref={openDialog}
      onClose={() => onOpenChange(false)}
      onCancel={() => onOpenChange(false)}
      onClick={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}
      className={cn(
        "surface-shadow-lg m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] rounded-xl border bg-surface p-0 text-text backdrop:bg-brand-navy/55 open:animate-[route-in_180ms_ease-out]",
        sheet && "mr-0 h-dvh max-h-dvh w-[min(30rem,calc(100%-1rem))] rounded-l-xl rounded-r-none",
      )}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h2 id={titleId} className="font-display text-2xl leading-tight">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>}
        </div>
        <Button size="icon" variant="ghost" aria-label="Đóng" onClick={() => onOpenChange(false)}><X aria-hidden size={18} /></Button>
      </div>
      <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto p-5 sm:p-6">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-3 border-t bg-background p-4 sm:px-6">{footer}</div>}
    </dialog>
  );
}

export function Dialog(props: OverlayProps) { return <NativeDialog {...props} />; }
export function Sheet(props: OverlayProps) { return <NativeDialog {...props} sheet />; }
