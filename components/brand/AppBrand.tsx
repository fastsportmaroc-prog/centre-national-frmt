import { FrmtBrandMark } from "./FrmtBrandMark";
import { cn } from "@/lib/utils/cn";

type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  showFederation?: boolean;
  showLogoImage?: boolean;
  className?: string;
  centered?: boolean;
};

export function AppBrand({
  size = "md",
  showFederation = true,
  showLogoImage = true,
  className,
  centered,
}: Props) {
  return (
    <FrmtBrandMark
      size={size}
      showFederation={showFederation}
      showLogoImage={showLogoImage}
      centered={centered}
      className={cn(className)}
    />
  );
}
