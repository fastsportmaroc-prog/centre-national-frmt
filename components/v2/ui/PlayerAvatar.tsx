"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import { cn } from "@/lib/utils/cn";

type Props = {
  prenom: string;
  nom: string;
  photoUrl?: string | null;
  categorie?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Clic sur l’avatar = choix de photo (JPG, PNG, WebP). */
  onPhotoSelect?: (e: ChangeEvent<HTMLInputElement>) => void;
  photoUploading?: boolean;
};

export function PlayerAvatar({
  prenom,
  nom,
  photoUrl,
  categorie,
  size = "md",
  className,
  onPhotoSelect,
  photoUploading = false,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const initials = `${(prenom[0] ?? "").toUpperCase()}${(nom[0] ?? "").toUpperCase()}`;
  const cat = getCategoryStyle(categorie ?? "U16");
  const dim = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  const iconSize = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";

  const showPhoto = Boolean(photoUrl?.trim()) && !imgFailed;

  const avatar = showPhoto ? (
    <img
      src={photoUrl!}
      alt={`${prenom} ${nom}`}
      className={cn(
        "block rounded-full object-cover ring-2 ring-border",
        dim,
        onPhotoSelect && "group-hover:ring-frmt-green"
      )}
      onError={() => setImgFailed(true)}
    />
  ) : (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-border",
        dim,
        onPhotoSelect && "group-hover:ring-frmt-green"
      )}
      style={{ backgroundColor: cat.bg, color: cat.text }}
    >
      {initials || "?"}
    </span>
  );

  if (!onPhotoSelect) {
    return <span className={cn("inline-flex shrink-0", className)}>{avatar}</span>;
  }

  return (
    <label
      className={cn(
        "group relative inline-flex shrink-0 cursor-pointer rounded-full",
        photoUploading && "pointer-events-none opacity-60",
        className
      )}
      title="Cliquer pour ajouter ou changer la photo"
    >
      {avatar}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100",
          dim
        )}
      >
        <Camera className={iconSize} />
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={photoUploading}
        onChange={onPhotoSelect}
      />
    </label>
  );
}
