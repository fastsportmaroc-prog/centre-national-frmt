"use client";

import { useEffect, useState } from "react";
import {
  BRAND_CENTRE,
  BRAND_FRMT,
  FEDERATION_NAME,
  LOGO_API_PATH,
  LOGO_PNG_PATH,
} from "@/lib/constants/branding";
import { cn } from "@/lib/utils/cn";

type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  showFederation?: boolean;
  showLogoImage?: boolean;
  className?: string;
  centered?: boolean;
};

const textSizes = {
  sm: { frmt: "text-lg", centre: "text-[10px]", fed: "text-[9px]", img: 40 },
  md: { frmt: "text-xl", centre: "text-xs", fed: "text-[10px]", img: 52 },
  lg: { frmt: "text-3xl", centre: "text-sm", fed: "text-xs", img: 80 },
  xl: { frmt: "text-4xl sm:text-5xl", centre: "text-base sm:text-lg", fed: "text-sm", img: 112 },
};

/** Marque FRMT : logo officiel (PNG) si présent, sinon FRMT rouge + CENTRE NATIONAL vert */
export function FrmtBrandMark({
  size = "md",
  showFederation = true,
  showLogoImage = true,
  className,
  centered = false,
}: Props) {
  const s = textSizes[size];
  const [pngOk, setPngOk] = useState(false);

  useEffect(() => {
    if (!showLogoImage) return;
    const img = new Image();
    img.onload = () => setPngOk(true);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => setPngOk(true);
      fallback.onerror = () => setPngOk(false);
      fallback.src = LOGO_PNG_PATH;
    };
    img.src = `${LOGO_API_PATH}?t=${Date.now()}`;
  }, [showLogoImage]);

  return (
    <div
      className={cn(
        "flex gap-3",
        centered ? "flex-col items-center text-center" : "items-center",
        className
      )}
    >
      {showLogoImage && pngOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_API_PATH}
          alt="Logo officiel FRMT"
          width={s.img}
          height={s.img}
          className="shrink-0 object-contain drop-shadow-md"
        />
      )}
      <div className={cn("min-w-0 leading-none", centered && "items-center")}>
        <p
          className={cn(
            "font-black tracking-wider",
            s.frmt
          )}
          style={{ color: "var(--frmt-red)" }}
        >
          {BRAND_FRMT}
        </p>
        <p
          className={cn("mt-0.5 font-bold uppercase tracking-wide", s.centre)}
          style={{ color: "var(--frmt-green)" }}
        >
          {BRAND_CENTRE}
        </p>
        {showFederation && (
          <p className={cn("mt-1.5 text-muted font-medium", s.fed)}>
            {FEDERATION_NAME}
          </p>
        )}
      </div>
    </div>
  );
}
