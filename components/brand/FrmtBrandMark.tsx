import { BRAND_CENTRE, BRAND_FRMT, FEDERATION_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils/cn";
import { LogoPlaceholder } from "./LogoPlaceholder";

type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  showFederation?: boolean;
  className?: string;
  centered?: boolean;
};

const textSizes = {
  sm: { frmt: "text-lg", centre: "text-[10px]", fed: "text-[9px]" },
  md: { frmt: "text-xl", centre: "text-xs", fed: "text-[10px]" },
  lg: { frmt: "text-3xl", centre: "text-sm", fed: "text-xs" },
  xl: { frmt: "text-4xl sm:text-5xl", centre: "text-base sm:text-lg", fed: "text-sm" },
};

/** Marque texte FRMT — sans image logo */
export function FrmtBrandMark({
  size = "md",
  showFederation = true,
  className,
  centered = false,
}: Props) {
  const s = textSizes[size];

  return (
    <div
      className={cn(
        "flex gap-3",
        centered ? "flex-col items-center text-center" : "items-center",
        className
      )}
    >
      <LogoPlaceholder size={size === "xl" || size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
      <div className={cn("min-w-0 leading-none", centered && "items-center")}>
        <p className={cn("font-black tracking-wider", s.frmt)} style={{ color: "var(--frmt-red)" }}>
          {BRAND_FRMT}
        </p>
        <p
          className={cn("mt-0.5 font-bold uppercase tracking-wide", s.centre)}
          style={{ color: "var(--frmt-green)" }}
        >
          {BRAND_CENTRE}
        </p>
        {showFederation && (
          <p className={cn("mt-1.5 font-medium text-muted", s.fed)}>{FEDERATION_NAME}</p>
        )}
      </div>
    </div>
  );
}
