"use client";

import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Largeur max du panneau (ex. max-w-3xl pour formulaire stage) */
  panelClassName?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  panelClassName,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl",
          "max-h-[min(92vh,920px)]",
          panelClassName ?? "max-w-lg",
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-lg font-semibold pr-8">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface/80 px-4 py-3 sm:px-5 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
