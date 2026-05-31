"use client";

import Link from "next/link";
import { AppBrand } from "@/components/brand/AppBrand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <div className="mb-4 flex justify-center">
          <AppBrand size="sm" showFederation={false} centered />
        </div>
        <p className="text-sm uppercase tracking-[0.1em] text-[var(--danger)]">Erreur application</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.message || "Impossible d'afficher cette page pour le moment."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-card-hover)]"
          >
            Reessayer
          </button>
          <Link
            href="/v2/dashboard"
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--frmt-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--frmt-gold)] hover:text-[var(--frmt-navy)]"
          >
            Aller au dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
