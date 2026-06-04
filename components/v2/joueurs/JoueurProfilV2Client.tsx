"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Card } from "@/components/ui/Card";
import { PersonProfilePhoto } from "@/components/v2/ui/PersonProfilePhoto";
import { photoUrlWithCacheBust } from "@/lib/storage/entraineur-photo-cache";
import { joueurRoleLabel, resolveJoueurSexe } from "@/lib/v2/joueur-sexe-display";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { getJoueurById, getJoueurs, getStagesForJoueur, updateJoueur } from "@/lib/supabase/queries";
import { uploadJoueurPhoto } from "@/lib/storage/upload-photo";
import { calcAge } from "@/lib/v2/status-styles";
import type { JoueurV2, StageProgrammeV2 } from "@/lib/types/v2";
import { useCanEditEquipementTailles } from "@/lib/hooks/useCanEditEquipementTailles";
import { useRole } from "@/lib/hooks/useRole";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import { categorieDepuisNaissance, getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import { PersonEquipementTaillesForm } from "@/components/v2/equipement/PersonEquipementTaillesForm";
import { PersonPasseportPanel } from "@/components/v2/passeports/PersonPasseportPanel";
import { PersonPasseportSummary } from "@/components/v2/passeports/PersonPasseportSummary";
import { getAdminDocumentsRaw } from "@/lib/data/admin-documents";
import { syncFichePasseportFields } from "@/lib/passeport/sync-fiche-passeport";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TabProgramme } from "@/components/v2/joueurs/programme/TabProgramme";

type ProfilTab = "infos" | "tailles" | "stages" | "planning" | "programme" | "progression" | "documents" | "notes";

const PROFIL_TABS: { id: ProfilTab; label: string }[] = [
  { id: "infos", label: "Infos" },
  { id: "tailles", label: "Tailles" },
  { id: "stages", label: "Stages" },
  { id: "planning", label: "Planning" },
  { id: "programme", label: "Programme" },
  { id: "progression", label: "Progression" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

export function JoueurProfilV2Client({ id }: { id: string }) {
  const { toast } = useToast();
  const { canWrite, role } = useRole();
  const canEditTailles = useCanEditEquipementTailles();
  const canEditJoueur = canWrite || role === "direction" || role === "viewer";
  const [tab, setTab] = useState<ProfilTab>("infos");
  const [joueur, setJoueur] = useState<JoueurV2 | null>(null);
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [categorieAge, setCategorieAge] = useState("");
  const [manualCategorie, setManualCategorie] = useState(false);
  const [savingCategorie, setSavingCategorie] = useState(false);
  const [ipin, setIpin] = useState("");
  const [savingIpin, setSavingIpin] = useState(false);
  const [modulePasseport, setModulePasseport] = useState<{
    numero: string | null;
    expiration: string | null;
  } | null>(null);
  const [allJoueurs, setAllJoueurs] = useState<JoueurV2[]>([]);

  const load = useCallback(async () => {
    const j = await getJoueurById(id);
    setJoueur(j);
    try {
      const docs = await getAdminDocumentsRaw();
      const p = docs.find(
        (d) => d.owner_type === "player" && d.owner_id === id && d.document_type === "passeport"
      );
      setModulePasseport(
        p
          ? { numero: p.document_number, expiration: p.expiration_date }
          : null
      );
    } catch {
      setModulePasseport(null);
    }
    if (j) {
      setPhotoPreview(j.photo_url ?? null);
      const autoFromBirth = j.date_naissance ? categorieDepuisNaissance(j.date_naissance) : "";
      const stored = (j.categorie_age ?? j.categorie ?? "").trim();
      setCategorieAge(stored || autoFromBirth || "U16");
      setManualCategorie(Boolean(stored && (!autoFromBirth || stored !== autoFromBirth)));
      setIpin(j.ipin?.trim() ?? "");
      setStages(await getStagesForJoueur(id));
    }
  }, [id]);

  useEffect(() => {
    void load();
    void getJoueurs().then(setAllJoueurs);
  }, [load]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !joueur || !canEditJoueur) return;

    const blobPreview = URL.createObjectURL(file);
    setPhotoPreview(blobPreview);
    setSavingPhoto(true);

    try {
      const photo_url = await uploadJoueurPhoto(file, joueur.id);
      const res = await updateJoueur(joueur.id, { photo_url });
      if (!res.ok) {
        toast(res.error ?? "Erreur enregistrement photo", "error");
        return;
      }
      setPhotoPreview(photoUrlWithCacheBust(photo_url));
      setJoueur((prev) => (prev ? { ...prev, photo_url } : prev));
      toast("Photo enregistrée", "success");
    } catch (err) {
      setPhotoPreview(joueur.photo_url ?? null);
      toast(err instanceof Error ? err.message : "Erreur photo", "error");
    } finally {
      URL.revokeObjectURL(blobPreview);
      setSavingPhoto(false);
      e.target.value = "";
    }
  }

  async function saveCategorie() {
    if (!joueur) return;
    const autoFromBirth = joueur.date_naissance ? categorieDepuisNaissance(joueur.date_naissance) : "";
    const finale = manualCategorie ? categorieAge : autoFromBirth || categorieAge;
    setSavingCategorie(true);
    const res = await updateJoueur(joueur.id, { categorie_age: finale, categorie: finale });
    setSavingCategorie(false);
    if (!res.ok) {
      toast(res.error ?? "Erreur enregistrement catégorie", "error");
      return;
    }
    setJoueur((prev) => (prev ? { ...prev, categorie_age: finale, categorie: finale } : prev));
    toast("Catégorie enregistrée", "success");
  }

  async function saveIpin() {
    if (!joueur) return;
    setSavingIpin(true);
    const value = ipin.trim() || null;
    const res = await updateJoueur(joueur.id, { ipin: value });
    setSavingIpin(false);
    if (!res.ok) {
      const msg = res.error ?? "Erreur";
      if (/schema cache|could not find.*ipin/i.test(msg)) {
        toast(
          "Colonne IPIN absente en base. Exécutez lib/db/migrations/joueurs_ipin.sql dans Supabase SQL Editor.",
          "error"
        );
      } else {
        toast(msg, "error");
      }
      return;
    }
    setJoueur((prev) => (prev ? { ...prev, ipin: value } : prev));
    toast("IPIN enregistré", "success");
  }

  const prochainStage = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stages.filter((s) => s.date_debut >= today).sort((a, b) => a.date_debut.localeCompare(b.date_debut))[0];
  }, [stages]);

  if (!joueur) {
    return (
      <main className="p-6 text-muted">
        <Link href="/v2/joueurs" className="mb-4 inline-flex items-center gap-1 text-sm text-frmt-green">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        Joueur introuvable.
      </main>
    );
  }

  const age = calcAge(joueur.date_naissance);
  const displayPasseportNumero =
    joueur.passeport_numero?.trim() || modulePasseport?.numero?.trim() || "";
  const displayPasseportExpiration =
    joueur.passeport_expiration || modulePasseport?.expiration || "";
  const docsOk = Boolean(displayPasseportNumero && displayPasseportExpiration);
  const displayCategorie = getJoueurDisplayCategorie(joueur);

  return (
    <>
      <V2PageHeader
        title={`${joueur.prenom} ${joueur.nom}`}
        description={`${displayCategorie} · ${joueur.sexe === "F" ? "Féminin" : "Masculin"}${joueur.licence ? ` · #${joueur.licence}` : ""}${joueur.ipin ? ` · IPIN ${joueur.ipin}` : ""}`}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link href="/v2/joueurs" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Joueurs
        </Link>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center gap-3 bg-[var(--bg-card)] p-6 lg:col-span-1">
            <PersonProfilePhoto
              prenom={joueur.prenom}
              nom={joueur.nom}
              photoUrl={photoPreview ?? joueur.photo_url}
              categorie={displayCategorie}
              roleLabel={joueurRoleLabel(resolveJoueurSexe(joueur))}
              canEdit={canEditJoueur}
              uploading={savingPhoto}
              onPhotoSelect={canEditJoueur ? onPhotoChange : undefined}
              uploadHint={
                canEditJoueur
                  ? savingPhoto
                    ? "Enregistrement automatique en cours…"
                    : "La photo est enregistrée dès la sélection du fichier."
                  : undefined
              }
            />
            {joueur.club && (
              <p className="text-center text-sm font-medium text-[var(--text-primary)]">{joueur.club}</p>
            )}
            <StatusBadge statut={joueur.statut ?? "actif"} />
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
            </div>
            {prochainStage && (
              <p className="text-center text-xs text-[var(--text-secondary)]">
                📅 Prochain : {prochainStage.date_debut.slice(5).replace("-", "/")}
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
                  {canWrite && (
                    <div className="rounded-lg border border-[var(--border)] p-3">
                      <Label>Catégorie</Label>
                      <div className="mt-2 flex flex-wrap items-end gap-3">
                        <CategorySelect
                          value={categorieAge}
                          onChange={setCategorieAge}
                          disabled={!manualCategorie}
                        />
                        <label className="flex items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={manualCategorie}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setManualCategorie(enabled);
                              if (!enabled && joueur.date_naissance) {
                                setCategorieAge(categorieDepuisNaissance(joueur.date_naissance));
                              }
                            }}
                          />
                          Catégorie manuelle
                        </label>
                        <Button
                          size="sm"
                          disabled={savingCategorie}
                          onClick={() => void saveCategorie()}
                        >
                          {savingCategorie ? "…" : "Enregistrer catégorie"}
                        </Button>
                      </div>
                      {!manualCategorie && joueur.date_naissance && (
                        <p className="mt-2 text-xs text-muted">
                          Auto : {categorieDepuisNaissance(joueur.date_naissance)} (selon date de naissance)
                        </p>
                      )}
                    </div>
                  )}
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Catégorie affichée</dt>
                    <dd className="font-medium">{displayCategorie}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Naissance</dt>
                    <dd>
                      {joueur.date_naissance ?? "—"}
                      {age != null ? ` (${age} ans)` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Club</dt>
                    <dd>{joueur.club ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Nationalité</dt>
                    <dd>{joueur.nationalite ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted mb-1">IPIN</dt>
                    {canEditJoueur ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <Input
                          className="max-w-xs"
                          value={ipin}
                          onChange={(e) => setIpin(e.target.value)}
                          placeholder="Identifiant IPIN ITF"
                        />
                        <Button size="sm" disabled={savingIpin} onClick={() => void saveIpin()}>
                          {savingIpin ? "…" : "Enregistrer IPIN"}
                        </Button>
                      </div>
                    ) : (
                      <dd className="font-medium">{joueur.ipin?.trim() || "—"}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-muted">Classement ITF</dt>
                    <dd>{joueur.classement_itf ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Classement national</dt>
                    <dd>{joueur.classement ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Téléphone</dt>
                    <dd>{joueur.telephone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd>{joueur.email ?? "—"}</dd>
                  </div>
                </dl>
                </div>
              )}
              {tab === "tailles" && (
                <PersonEquipementTaillesForm
                  kind="joueur"
                  person={joueur}
                  editable={canEditTailles}
                  onSaved={(next) => setJoueur(next)}
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
                  {stages.length === 0 && <p className="text-muted">Aucun stage.</p>}
                </ul>
              )}
              {tab === "planning" && (
                <p className="text-sm text-muted">Planning lié aux {stages.length} stage(s) du joueur — voir page Planning.</p>
              )}
              {tab === "programme" && joueur && (
                <TabProgramme joueur={joueur} allJoueurs={allJoueurs} />
              )}
              {tab === "progression" && (
                <p className="text-sm text-muted">Classement : {joueur.classement ?? "—"} · ITF : {joueur.classement_itf ?? "—"}</p>
              )}
              {tab === "documents" && (
                <PersonPasseportPanel
                  ownerType="player"
                  ownerId={joueur.id}
                  ownerLabel={`${joueur.prenom} ${joueur.nom}`}
                  passeportNumero={joueur.passeport_numero}
                  passeportExpiration={joueur.passeport_expiration}
                  onFichePasseportChange={async (numero, expiration) => {
                    setModulePasseport({ numero, expiration });
                    setJoueur((prev) =>
                      prev
                        ? {
                            ...prev,
                            passeport_numero: numero,
                            passeport_expiration: expiration,
                          }
                        : prev
                    );
                    if (!canEditJoueur) return;
                    const sync = await syncFichePasseportFields(
                      (payload) => updateJoueur(joueur.id, payload),
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
                <p className="text-sm text-muted">{joueur.contact_parent ?? "Aucune note enregistrée."}</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
