import Link from "next/link";
import { AppBrand } from "@/components/brand/AppBrand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <div className="mb-4 flex justify-center">
          <AppBrand size="sm" showFederation={false} centered />
        </div>
        <p className="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">Erreur 404</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Page introuvable</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          La ressource demandee n&apos;existe pas ou a ete deplacee.
        </p>
        <div className="mt-6">
          <Link
            href="/v2/dashboard"
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--frmt-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--frmt-gold)] hover:text-[var(--frmt-navy)]"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}
