"use client";

import {
  DOCUMENT_STATUS_LABELS,
  documentStatusBadgeClass,
  getDocumentExpirationStatus,
  type DocumentExpirationStatus,
} from "@/lib/utils/admin-document-status";
import { cn } from "@/lib/utils/cn";

export function DocumentExpirationBadge({
  expirationDate,
  className,
}: {
  expirationDate: string | null | undefined;
  className?: string;
}) {
  const status = getDocumentExpirationStatus(expirationDate);
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        documentStatusBadgeClass(status),
        className
      )}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function matchesStatusFilter(
  expirationDate: string | null | undefined,
  filter: "" | DocumentExpirationStatus
): boolean {
  if (!filter) return true;
  return getDocumentExpirationStatus(expirationDate) === filter;
}
