import { CircleAlert, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-border", className)} {...props} />;
}

type StateProps = { title: string; description: string; action?: ReactNode; compact?: boolean };

function StateFrame({ icon, title, description, action, compact }: StateProps & { icon: ReactNode }) {
  return (
    <div className={cn("grid place-items-center rounded-xl border border-dashed bg-surface px-5 py-12 text-center", compact && "py-7")}>
      <div className="grid size-11 place-items-center rounded-full bg-background text-secondary">{icon}</div>
      <h3 className="font-display mt-4 text-2xl text-text">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState(props: StateProps) { return <StateFrame icon={<Inbox aria-hidden size={20} />} {...props} />; }
export function ErrorState({ retry, ...props }: StateProps & { retry?: () => void }) {
  return <StateFrame icon={<CircleAlert aria-hidden size={20} className="text-danger" />} {...props} action={retry ? <Button variant="outline" onClick={retry}><RefreshCw aria-hidden size={16} />Thử lại</Button> : props.action} />;
}
export function LoadingState({ label = "Đang tải dữ liệu" }: { label?: string }) {
  return <div role="status" className="flex min-h-36 items-center justify-center gap-3 rounded-xl border bg-surface text-sm text-text-secondary"><LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" size={20} /><span>{label}</span></div>;
}
