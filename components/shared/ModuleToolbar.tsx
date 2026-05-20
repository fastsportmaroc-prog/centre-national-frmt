"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileDown, Printer, Search } from "lucide-react";

type Props = {
  search?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  onPrint?: () => void;
  onExportPdf?: () => void;
  filters?: React.ReactNode;
  children?: React.ReactNode;
};

export function ModuleToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Rechercher…",
  onPrint,
  onExportPdf,
  filters,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {filters}
        {children}
      </div>
      <div className="flex flex-wrap gap-2">
        {onPrint && (
          <Button type="button" variant="secondary" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        )}
        {onExportPdf && (
          <Button type="button" variant="secondary" size="sm" onClick={onExportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>
    </div>
  );
}
