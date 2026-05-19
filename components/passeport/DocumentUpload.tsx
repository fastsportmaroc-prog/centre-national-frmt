"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, X, FileImage } from "lucide-react";

type Props = {
  label: string;
  hint?: string;
  currentUrl: string | null;
  onUploaded: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
};

export function DocumentUpload({
  label,
  hint,
  currentUrl,
  onUploaded,
  onUpload,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl;

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      if (file.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(file));
      }
      const url = await onUpload(file);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {displayUrl && (
        <div className="relative inline-block">
          {displayUrl.toLowerCase().includes(".pdf") ? (
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-frmt-green"
            >
              <FileImage className="h-4 w-4" />
              Voir le document PDF
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={label}
              className="max-h-40 rounded-lg border border-border object-contain"
            />
          )}
          <button
            type="button"
            className="absolute -right-2 -top-2 rounded-full bg-surface-elevated p-1 shadow"
            onClick={() => {
              setPreview(null);
              onUploaded(null);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {loading ? "Envoi…" : displayUrl ? "Remplacer" : "Téléverser"}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
