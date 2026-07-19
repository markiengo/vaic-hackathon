import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#4A1D02] p-4 sm:p-8">
      <div
        className={cn(
          "grid w-full max-w-[1100px] overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
