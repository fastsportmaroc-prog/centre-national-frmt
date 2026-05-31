"use client";

import { Button } from "@/components/ui/Button";
import { ExportPdfButton } from "@/components/v2/ui/ExportPdfButton";
import { Plus } from "lucide-react";

type Props = {
  onAdd?: () => void;
  addLabel?: string;
  canAdd?: boolean;
  onExportPdf?: () => void | Promise<void>;
  canExport?: boolean;
  exportLabel?: string;
  extra?: React.ReactNode;
};

export function V2PageActions({
  onAdd,
  addLabel = "Ajouter",
  canAdd = true,
  onExportPdf,
  canExport = true,
  exportLabel = "Exporter PDF",
  extra,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      {onExportPdf && canExport && <ExportPdfButton onExport={onExportPdf} label={exportLabel} />}
      {onAdd && canAdd && (
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
