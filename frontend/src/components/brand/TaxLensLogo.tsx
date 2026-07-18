import Image from "next/image";
import { cn } from "@/lib/utils";

type TaxLensLogoProps = {
  compact?: boolean;
  className?: string;
  inverse?: boolean;
};

export function TaxLensLogo({ compact = false, className, inverse = false }: TaxLensLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", inverse ? "text-white" : "text-ink", className)}>
      <span className="relative block size-8 shrink-0 overflow-hidden rounded">
        <Image
          className={cn("object-cover", !inverse && "dark:hidden")}
          src={inverse ? "/brand/taxlens-icon-dark.png" : "/brand/taxlens-icon-light.png"}
          alt=""
          fill
          sizes="40px"
          priority
        />
        {!inverse && <Image className="hidden object-cover dark:block" src="/brand/taxlens-icon-dark.png" alt="" fill sizes="40px" priority />}
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="font-display block text-[26px] font-bold leading-tight tracking-[-0.02em]">TaxLens</span>
        </span>
      )}
    </span>
  );
}
