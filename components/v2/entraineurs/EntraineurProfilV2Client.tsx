"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PersonProfilePhoto } from "@/components/v2/ui/PersonProfilePhoto";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { PersonEquipementTaillesForm } from "@/components/v2/equipement/PersonEquipementTaillesForm";
import { getEntraineurById, getStagesForEntraineur, updateEntraineur } from "@/lib/supabase/queries";
import { uploadEntraineurPhoto } from "@/lib/storage/upload-entraineur-photo";
import {
  photoUrlWithCacheBust,
  resolveEntraineurPhotoUrl,
} from "@/lib/storage/entraineur-photo-cache";
import { PersonPasseportPanel } from "@/components/v2/passeports/PersonPasseportPanel";
import { PersonPasseportSummary } from "@/components/v2/passeports/PersonPasseportSummary";
import { getAdminDocumentsRaw } from "@/lib/data/admin-documents";
import { syncFichePasseportFields } from "@/lib/passeport/sync-fiche-passeport";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { useCanEditEquipementTailles } from "@/lib/hooks/useCanEditEquipementTailles";
import { useRole } from "@/lib/hooks/useRole";
import type { EntraineurV2, StageProgrammeV2 } from "@/lib/types/v2";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ProfilTab = "infos" | "tailles" | "stages" | "documents" | "notes";

const PROFIL_TABS: { id: ProfilTab; label: string }[] = [
  { id: "infos", label: "Infos" },
  { id: "tailles", label: "Tailles" },
  { id: "stages", label: "Stages" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

export function EntraineurProfilV2Client({ id }: { id: string }) {
  const { toast } = useToast();
  const { canWrite, role } = useRole();
  const canEditEntraineur = canWrite || role === "direction" || role === "viewer";
  const canEditTailles = useCanEditEquipementTailles();
  const [tab, setTab] = useState<ProfilTab>("infos");
  const [entraineur, setEntraineur] = useState<EntraineurV2 | null>(null);
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [modulePasseport, setModulePasseport] = useState<{
    numero: string | null;
    expiration: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    const e = await getEntraineurById(id);
    setEntraineur(e);
    try {
      const docs = await getAdminDocumentsRaw();
      const p = docs.find(
        (d) => d.owner_type === "coach" && d.owner_id === id && d.document_type === "passeport"
      );
      setModulePasseport(
        p ? { numero: p.document_number, expiration: p.expiration_date } : null
      );
    } catch {
      setModulePasseport(null);
    }
    if (e) {
      const resolved = resolveEntraineurPhotoUrl(id, e.photo_url);
      setPhotoPreview(resolved);
      setStages(await getStagesForEntraineur(id));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !entraineur || !canEditEntraineur) return;

    const blobPreview = URL.createObjectURL(file);
    setPhotoPreview(blobPreview);
    setSavingPhoto(true);

    try {
      const result = await uploadEntraineurPhoto(file, entraineur.id);
      if (result.warning) {
        toast(result.warning, "warning");
      }
      const displayUrl = photoUrlWithCacheBust(result.url);
      setPhotoPreview(displayUrl);
      setEntraineur((prev) => (prev ? { ...prev, photo_url: result.url } : prev));
      if (result.photoUrlSaved) {
        await load();
      }
      toast("Photo enregistrée", "success");
    } catch (err) {
      setPhotoPreview(resolveEntraineurPhotoUrl(entraineur.id, entraineur.photo_url));
      toast(err instanceof Error ? err.message : "Erreur photo", "error");
    } finally {
      URL.revokeObjectURL(blobPreview);
      setSavingPhoto(false);
      e.target.value = "";
    }
  }

  const prochainStage = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stages.filter((s) => s.date_debut >= today).sort((a, b) => a.date_debut.localeCompare(b.date_debut))[0];
  }, [stages]);

  if (!entraineur) {
    return (
      <main className="p-6 text-muted">
        <Link href="/v2/entraineurs" className="mb-4 inline-flex items-center gap-1 text-sm text-frmt-green">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        Entraîneur introuvable.
      </main>
    );
  }

  const displayPasseportNumero =
    entraineur.passeport_numero?.trim() || modulePasseport?.numero?.trim() || "";
  const displayPasseportExpiration =
    entraineur.passeport_expiration || modulePasseport?.expiration || "";
  const docsOk = Boolean(displayPasseportNumero && displayPasseportExpiration);

  return (
    <>
      <V2PageHeader
        title={`${entraineur.prenom} ${entraineur.nom}`}
        description={`${entraineur.specialite ?? "Entraîneur"}${displayPasseportNumero ? ` · Passeport ${displayPasseportNumero}` : ""}`}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link
          href="/v2/entraineurs"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Entraîneurs
        </Link>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center gap-3 bg-[var(--bg-card)] p-6 lg:col-span-1">
            <PersonProfilePhoto
              prenom={entraineur.prenom}
              nom={entraineur.nom}
              photoUrl={photoPreview ?? resolveEntraineurPhotoUrl(entraineur.id, entraineur.photo_url)}
              categorie="Coach"
              roleLabel="Entraîneur"
              canEdit={canEditEntraineur}
              uploading={savingPhoto}
              onPhotoSelect={canEditEntraineur ? onPhotoChange : undefined}
              uploadHint={
                canEditEntraineur
                  ? savingPhoto
                    ? "Enregistrement automatique en cours…"
                    : "La photo est enregistrée dès la sélection du fichier."
                  : undefined
              }
            />
            <StatusBadge statut={entraineur.statut ?? "actif"} />
            <PersonPasseportSummary
              numero={displayPasseportNumero}
              expiration={displayPasseportExpiration}
              variant="card"
              onManageClick={() => setTab("documents")}
            />
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className={docsOk ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                {docsOk ? "✅ Passeport OK" : "⚠️ Passeport incomplet"}
              </span>
              <span className="text-muted">{stages.length} stage(s)</span>
            </div>
            {prochainStage && (
              <p className="text-center text-xs text-[var(--text-secondary)]">
                Prochain : {prochainStage.date_debut.slice(5).replace("-", "/")} — {prochainStage.stage_action}
              </p>
            )}
          </Card>

          <Card className="overflow-hidden bg-[var(--bg-card)] p-0 lg:col-span-2">
            <div className="flex flex-wrap gap-1 border-b border-[var(--border)] p-2">
              {PROFIL_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    tab === t.id ? "bg-[var(--frmt-navy)] text-white" : "text-[var(--text-secondary)] hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === "infos" && (
                <div className="space-y-4">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Spécialité</dt>
                      <dd>{entraineur.specialite ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Statut</dt>
                      <dd>{entraineur.statut ?? "actif"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Téléphone</dt>
                      <dd>{entraineur.telephone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Email</dt>
                      <dd>{entraineur.email ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Budget voyages annuel</dt>
                      <dd>
                        {entraineur.budget_voyages_annuel != null
                          ? `${entraineur.budget_voyages_annuel} MAD`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
              {tab === "tailles" && (
                <PersonEquipementTaillesForm
                  kind="entraineur"
                  person={entraineur}
                  editable={canEditTailles}
                  onSaved={(next) => setEntraineur(next)}
                />
              )}
              {tab === "stages" && (
                <ul className="divide-y divide-border">
                  {stages.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <Link href={`/v2/stages/${s.id}`} className="font-medium hover:text-frmt-green">
                        {s.stage_action}
                      </Link>
                      <span className="text-muted">
                        {s.date_debut} → {s.date_fin}
                      </span>
                      <StatusBadge statut={String(s.statut)} />
                    </li>
                  ))}
                  {stages.length === 0 && <p className="text-muted">Aucun stage assigné.</p>}
                </ul>
              )}
              {tab === "documents" && (
                <PersonPasseportPanel
                  ownerType="coach"
                  ownerId={entraineur.id}
                  ownerLabel={`${entraineur.prenom} ${entraineur.nom}`}
                  passeportNumero={entraineur.passeport_numero}
                  passeportExpiration={entraineur.passeport_expiration}
                  onFichePasseportChange={async (numero, expiration) => {
                    setModulePasseport({ numero, expiration });
                    setEntraineur((prev) =>
                      prev
                        ? {
                            ...prev,
                            passeport_numero: numero,
                            passeport_expiration: expiration,
                          }
                        : prev
                    );
                    if (!canEditEntraineur) return;
                    const sync = await syncFichePasseportFields(
                      (payload) => updateEntraineur(entraineur.id, payload),
                      numero,
                      expiration
                    );
                    if (sync.error) {
                      toast(sync.error, "error");
                    }
                  }}
                />
              )}
              {tab === "notes" && (
                <p className="whitespace-pre-wrap text-sm text-muted">{entraineur.notes ?? "Aucune note enregistrée."}</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
