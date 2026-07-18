import Image from "next/image";
import { cn } from "@/lib/utils";

type TaxLensLogoProps = {
  compact?: boolean;
  className?: string;
  inverse?: boolean;
};

export function TaxLensLogo({ compact = false, className, inverse = false }: TaxLensLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", inverse ? "text-white" : "text-text", className)}>
      <span className="relative block size-10 shrink-0 overflow-hidden rounded-lg">
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
        <span className="leading-none">
          <span className="font-display block text-[29px] tracking-[-0.045em]">TaxLens</span>
          <span className={cn("mt-1 block text-[9px] uppercase tracking-[0.2em]", inverse ? "text-white/65" : "text-text-tertiary")}>by SHB</span>
        </span>
      )}
    </span>
  );
}
