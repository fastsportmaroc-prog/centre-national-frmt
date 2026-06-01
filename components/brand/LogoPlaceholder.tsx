import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type Props = {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
};

const sizes = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 120,
  "2xl": 148,
};

/** Logo officiel FRMT (public/logo-frmt.png). */
export function LogoPlaceholder({ size = "md", className }: Props) {
  const px = sizes[size];
  return (
    <Image
      src="/logo-frmt.png"
      alt="Logo FRMT"
      width={px}
      height={px}
      className={cn("shrink-0 object-contain", className)}
      priority={size === "lg" || size === "xl" || size === "2xl"}
    />
  );
}
