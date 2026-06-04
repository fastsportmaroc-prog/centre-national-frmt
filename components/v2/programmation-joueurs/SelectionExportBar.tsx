"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  count: number;
  onExport: () => void;
};

export function SelectionExportBar({ count, onExport }: Props) {
  if (count < 1) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <Button
        className="shadow-lg"
        onClick={onExport}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Exporter PDF ({count} joueur{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""})
      </Button>
    </div>
  );
}
