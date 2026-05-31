"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/v2/ui/ToastProvider";

type Props = {
  onExport: () => void | Promise<void>;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function ExportPdfButton({
  onExport,
  label = "Exporter PDF",
  className,
  disabled,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onExport();
      toast("PDF généré avec succès");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors de la génération du PDF", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => void handleClick()}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border-2 border-[#1a3c5e] bg-white px-3 py-1.5 text-sm font-medium text-[#1a3c5e] transition",
        "hover:bg-[#1a3c5e] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
