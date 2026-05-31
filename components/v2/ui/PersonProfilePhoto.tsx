"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Camera, Download, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import {
  downloadRemoteFile,
  guessImageExtension,
  profilePhotoFilename,
} from "@/lib/utils/download-file";
import { cn } from "@/lib/utils/cn";

type Props = {
  prenom: string;
  nom: string;
  photoUrl?: string | null;
  categorie?: string;
  roleLabel?: string;
  canEdit?: boolean;
  uploading?: boolean;
  onPhotoSelect?: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadHint?: string;
};

export function PersonProfilePhoto({
  prenom,
  nom,
  photoUrl,
  categorie,
  roleLabel,
  canEdit,
  uploading = false,
  onPhotoSelect,
  uploadHint,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const hasPhoto = Boolean(photoUrl?.trim()) && !imgFailed;
  const initials = `${(prenom[0] ?? "").toUpperCase()}${(nom[0] ?? "").toUpperCase()}`;
  const cat = getCategoryStyle(categorie ?? "U16");
  const fullName = `${prenom} ${nom}`.trim();

  const downloadName = useMemo(
    () => profilePhotoFilename(nom, prenom, photoUrl ? guessImageExtension(photoUrl) : "jpg"),
    [nom, prenom, photoUrl]
  );

  async function handleDownload() {
    if (!photoUrl) return;
    await downloadRemoteFile(photoUrl, downloadName);
  }

  function openLightbox() {
    if (hasPhoto) setLightboxOpen(true);
  }

  return (
    <>
      <div className="flex w-full max-w-[220px] flex-col items-center gap-3">
        <div
          className={cn(
            "person-profile-photo-frame relative w-full overflow-hidden rounded-xl",
            "ring-1 ring-white/10 shadow-lg shadow-black/40",
            "bg-gradient-to-b from-[var(--bg-card-hover)] to-[var(--bg-sidebar)]",
            hasPhoto && "cursor-zoom-in group"
          )}
          onClick={hasPhoto ? openLightbox : undefined}
          onKeyDown={(e) => {
            if (hasPhoto && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openLightbox();
            }
          }}
          role={hasPhoto ? "button" : undefined}
          tabIndex={hasPhoto ? 0 : undefined}
          aria-label={hasPhoto ? `Voir la photo de ${fullName} en grand` : undefined}
        >
          <div className="aspect-[3/4] w-full">
            {hasPhoto ? (
              <img
                src={photoUrl!}
                alt={fullName}
                className="h-full w-full object-cover object-[center_20%]"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
                style={{ backgroundColor: cat.bg, color: cat.text }}
              >
                <span className="text-4xl font-bold tracking-tight">{initials || "?"}</span>
                {roleLabel && (
                  <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">
                    {roleLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          {hasPhoto && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent pb-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <Expand className="h-3.5 w-3.5" />
                Voir en grand
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
              <span className="text-xs font-medium text-white">Enregistrement…</span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {hasPhoto && (
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Télécharger
            </Button>
          )}
          {canEdit && onPhotoSelect && (
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)]",
                "bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]",
                "hover:border-frmt-green/50 hover:bg-[var(--bg-card-hover)]",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              <Camera className="h-3.5 w-3.5" />
              {hasPhoto ? "Changer la photo" : "Ajouter une photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={onPhotoSelect}
              />
            </label>
          )}
        </div>

        {uploadHint && canEdit && (
          <p className="text-center text-[11px] leading-snug text-[var(--text-secondary)]">{uploadHint}</p>
        )}
      </div>

      {lightboxOpen && hasPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setLightboxOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal
            aria-label={`Photo — ${fullName}`}
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-card)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="truncate text-sm font-semibold text-white">{fullName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {roleLabel ?? "Photo officielle"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLightboxOpen(false)} aria-label="Fermer">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center justify-center bg-gradient-to-b from-[#0a0e14] to-[#151b24] p-6 sm:p-8">
              <div className="w-full max-w-[320px] overflow-hidden rounded-xl ring-2 ring-white/15 shadow-2xl">
                <img
                  src={photoUrl!}
                  alt={fullName}
                  className="aspect-[3/4] w-full object-cover object-[center_20%]"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => void handleDownload()}>
                <Download className="mr-1 h-4 w-4" />
                Télécharger
              </Button>
              <Button size="sm" onClick={() => setLightboxOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
