import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#4A1D02] p-6 sm:p-12">
      <div
        className={cn(
          "grid w-full min-h-[680px] max-w-[1200px] overflow-hidden rounded-[30px] bg-white p-7 shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
