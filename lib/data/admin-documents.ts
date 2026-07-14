import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import {
  localCreateAdminDocument,
  localDeleteAdminDocument,
  localGetAdminDocuments,
  localUpdateAdminDocument,
} from "@/lib/local-test/admin-documents-store";
import type {
  AdminDocument,
  AdminDocumentAlertStats,
  AdminDocumentEnriched,
  AdminDocumentInput,
  AdminDocumentOwnerType,
} from "@/lib/types/admin-document";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { joueurRoleLabel, resolveJoueurSexe } from "@/lib/v2/joueur-sexe-display";
import {
  getDocumentExpirationStatus,
  type DocumentExpirationStatus,
} from "@/lib/utils/admin-document-status";

/** Utilise l’API Next + session Supabase (cookies) plutôt que le client browser seul. */
function usesSupabaseApi(): boolean {
  if (typeof window === "undefined") return false;
  if (shouldUseLocalTestStorage()) return false;
  return isSupabaseConfigured();
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string; hint?: string };
    if (json.hint) return `${json.error ?? "Erreur"} — ${json.hint}`;
    return json.error ?? `Erreur HTTP ${res.status}`;
  } catch {
    return `Erreur HTTP ${res.status}`;
  }
}

export async function getAdminDocumentsRaw(): Promise<AdminDocument[]> {
  if (typeof window !== "undefined" && shouldUseLocalTestStorage()) {
    return localGetAdminDocuments();
  }
  if (usesSupabaseApi()) {
    const res = await fetch("/api/admin-documents", { credentials: "include", cache: "no-store" });
    if (res.status === 401 || res.status === 403) return [];
    if (!res.ok) throw new Error(await parseApiError(res));
    const json = (await res.json()) as { documents?: AdminDocument[] };
    return json.documents ?? [];
  }
  return [];
}

function resolveOwner(
  doc: AdminDocument,
  joueurs: JoueurV2[],
  entraineurs: EntraineurV2[]
): { prenom: string; nom: string; roleLabel: string } {
  if (doc.owner_type === "player") {
    const j = joueurs.find((x) => x.id === doc.owner_id);
    return {
      prenom: j?.prenom ?? "—",
      nom: j?.nom ?? "Inconnu",
      roleLabel: j ? joueurRoleLabel(resolveJoueurSexe(j)) : "Joueur",
    };
  }
  const e = entraineurs.find((x) => x.id === doc.owner_id);
  return {
    prenom: e?.prenom ?? "—",
    nom: e?.nom ?? "Inconnu",
    roleLabel: "Entraîneur",
  };
}

export function enrichAdminDocuments(
  docs: AdminDocument[],
  joueurs: JoueurV2[],
  entraineurs: EntraineurV2[]
): AdminDocumentEnriched[] {
  return docs.map((d) => {
    const o = resolveOwner(d, joueurs, entraineurs);
    return {
      ...d,
      owner_prenom: o.prenom,
      owner_nom: o.nom,
      owner_role_label: o.roleLabel,
    };
  });
}

export async function getAdminDocumentsEnriched(): Promise<AdminDocumentEnriched[]> {
  const [docs, joueurs, entraineurs] = await Promise.all([
    getAdminDocumentsRaw(),
    getJoueurs(),
    getEntraineurs(),
  ]);
  return enrichAdminDocuments(docs, joueurs, entraineurs);
}

export async function createAdminDocument(
  input: AdminDocumentInput
): Promise<{ data: AdminDocument | null; error?: string }> {
  if (typeof window !== "undefined" && shouldUseLocalTestStorage()) {
    return { data: localCreateAdminDocument(input) };
  }
  if (usesSupabaseApi()) {
    try {
      const res = await fetch("/api/admin-documents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return { data: null, error: await parseApiError(res) };
      const json = (await res.json()) as { document?: AdminDocument };
      return { data: json.document ?? null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }
  return { data: null, error: "Connectez-vous à Supabase (admin ou direction)" };
}

export async function updateAdminDocument(
  id: string,
  patch: Partial<AdminDocumentInput>
): Promise<{ data: AdminDocument | null; error?: string }> {
  if (typeof window !== "undefined" && shouldUseLocalTestStorage()) {
    const data = localUpdateAdminDocument(id, patch);
    return data ? { data } : { data: null, error: "Document introuvable" };
  }
  if (usesSupabaseApi()) {
    try {
      const res = await fetch(`/api/admin-documents/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return { data: null, error: await parseApiError(res) };
      const json = (await res.json()) as { document?: AdminDocument };
      return { data: json.document ?? null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }
  return { data: null, error: "Supabase indisponible" };
}

export async function deleteAdminDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof window !== "undefined" && shouldUseLocalTestStorage()) {
    return localDeleteAdminDocument(id) ? { ok: true } : { ok: false, error: "Document introuvable" };
  }
  if (usesSupabaseApi()) {
    try {
      const res = await fetch(`/api/admin-documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return { ok: false, error: await parseApiError(res) };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }
  return { ok: false, error: "Supabase indisponible" };
}

export function computeAdminDocumentAlertStats(
  docs: AdminDocument[],
  refDate: Date = new Date()
): AdminDocumentAlertStats {
  let passeportsExpires = 0;
  let passeportsExpiring6Months = 0;
  let visasExpires = 0;
  let visasExpiring30Days = 0;

  for (const d of docs) {
    const status = getDocumentExpirationStatus(d.expiration_date, refDate);
    if (d.document_type === "passeport") {
      if (status === "expire") passeportsExpires++;
      else if (status === "urgent" || status === "a_renouveler") passeportsExpiring6Months++;
    } else if (d.document_type === "visa") {
      if (status === "expire") visasExpires++;
      else if (status === "urgent") visasExpiring30Days++;
    }
  }

  return {
    passeportsExpires,
    passeportsExpiring6Months,
    visasExpires,
    visasExpiring30Days,
  };
}

export async function getAdminDocumentAlertStats(): Promise<AdminDocumentAlertStats> {
  const docs = await getAdminDocumentsRaw();
  return computeAdminDocumentAlertStats(docs);
}

export function filterAdminDocuments(
  items: AdminDocumentEnriched[],
  opts: {
    search: string;
    role: "" | AdminDocumentOwnerType;
    docType: "" | "passeport" | "visa";
    status: "" | DocumentExpirationStatus;
  }
): AdminDocumentEnriched[] {
  const q = opts.search.trim().toLowerCase();
  return items.filter((d) => {
    const full = `${d.owner_prenom} ${d.owner_nom}`.toLowerCase();
    if (q && !full.includes(q) && !(d.document_number ?? "").toLowerCase().includes(q)) return false;
    if (opts.role && d.owner_type !== opts.role) return false;
    if (opts.docType && d.document_type !== opts.docType) return false;
    if (opts.status) {
      const st = getDocumentExpirationStatus(d.expiration_date);
      if (st !== opts.status) return false;
    }
    return true;
  });
}

export function isAdminDocumentsSupabaseMode(): boolean {
  return usesSupabaseApi();
}
