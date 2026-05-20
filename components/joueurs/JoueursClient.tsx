"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { JoueurForm } from "./JoueurForm";
import { JoueurFiltersBar } from "./JoueurFiltersBar";
import { JoueursTable } from "./JoueursTable";
import { JoueursFrmtClassement } from "./JoueursFrmtClassement";
import { filterJoueursFrmtScope } from "@/lib/frmt/group-frmt-joueurs";
import {
  createJoueur,
  deleteJoueur,
  getJoueursWithGroupes,
  updateJoueur,
} from "@/lib/data/joueurs";
import { getGroupes } from "@/lib/data/groupes";
import { SEXES_JOUEUR } from "@/lib/constants/joueurs";
import type {
  Groupe,
  Joueur,
  JoueurFilters,
  JoueurInput,
  JoueurWithGroupe,
  SexeJoueur,
} from "@/lib/types/database";
import { filterJoueurs } from "@/lib/utils/joueur-filters";
import { uploadJoueurPhoto } from "@/lib/storage/upload-photo";
import { Plus, RefreshCw } from "lucide-react";

const emptyForm = (): JoueurInput => ({
  prenom: "",
  nom: "",
  date_naissance: "2010-01-01",
  categorie_age: "U14",
  sexe: "M",
  email: "",
  telephone: "",
  niveau: "",
  nationalite: "France",
  classement: "",
  groupe_id: null,
  coach_referent: "",
  statut: "actif",
  documents: "",
  notes: "",
  photo_url: null,
});

type VueSexe = "tous" | SexeJoueur;
type VueMode = "liste" | "frmt";

function sortJoueurs(list: JoueurWithGroupe[]) {
  return [...list].sort((a, b) => {
    const cat = a.categorie_age.localeCompare(b.categorie_age);
    if (cat !== 0) return cat;
    return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr");
  });
}

export function JoueursClient() {
  const searchParams = useSearchParams();
  const [joueurs, setJoueurs] = useState<JoueurWithGroupe[]>([]);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [filters, setFilters] = useState<JoueurFilters>({});
  const [vueSexe, setVueSexe] = useState<VueSexe>("tous");
  const [vueMode, setVueMode] = useState<VueMode>("frmt");

  useEffect(() => {
    const groupe = searchParams.get("groupe");
    if (groupe) setFilters((f) => ({ ...f, groupeId: groupe }));
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Joueur | null>(null);
  const [form, setForm] = useState<JoueurInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [importingFrmt, setImportingFrmt] = useState(false);
  const [frmtRefresh, setFrmtRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, g] = await Promise.all([getJoueursWithGroupes(), getGroupes()]);
      setJoueurs(j);
      setGroupes(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => filterJoueurs(joueurs, filters),
    [joueurs, filters]
  );

  const frmtScope = useMemo(() => filterJoueursFrmtScope(joueurs), [joueurs]);

  const counts = useMemo(() => {
    const garcons = filtered.filter((j) => j.sexe === "M").length;
    const filles = filtered.filter((j) => j.sexe === "F").length;
    const autre = filtered.filter((j) => j.sexe === "Autre").length;
    return { garcons, filles, autre, tous: filtered.length };
  }, [filtered]);

  const garcons = useMemo(
    () => sortJoueurs(filtered.filter((j) => j.sexe === "M")),
    [filtered]
  );
  const filles = useMemo(
    () => sortJoueurs(filtered.filter((j) => j.sexe === "F")),
    [filtered]
  );
  const autre = useMemo(
    () => sortJoueurs(filtered.filter((j) => j.sexe === "Autre")),
    [filtered]
  );
  const listeUnique = useMemo(() => {
    if (vueSexe === "M") return garcons;
    if (vueSexe === "F") return filles;
    if (vueSexe === "Autre") return autre;
    return sortJoueurs(filtered);
  }, [vueSexe, garcons, filles, autre, filtered]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(j: Joueur) {
    setEditing(j);
    setForm({
      prenom: j.prenom,
      nom: j.nom,
      date_naissance: j.date_naissance,
      categorie_age: j.categorie_age,
      sexe: j.sexe,
      email: j.email ?? "",
      telephone: j.telephone ?? "",
      niveau: j.niveau ?? "",
      nationalite: j.nationalite ?? "",
      classement: j.classement ?? "",
      groupe_id: j.groupe_id,
      coach_referent: j.coach_referent ?? "",
      statut: j.statut,
      documents: j.documents ?? "",
      notes: j.notes ?? "",
      photo_url: j.photo_url,
    });
    setPhotoFile(null);
    setPhotoPreview(j.photo_url);
    setError(null);
    setModalOpen(true);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form };
      if (editing) {
        if (photoFile) {
          payload.photo_url = await uploadJoueurPhoto(photoFile, editing.id);
        }
        await updateJoueur(editing.id, payload);
      } else {
        const created = await createJoueur(payload);
        if (photoFile) {
          const url = await uploadJoueurPhoto(photoFile, created.id);
          await updateJoueur(created.id, { photo_url: url });
        }
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce joueur ?")) return;
    try {
      await deleteJoueur(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleImportFrmtClassement() {
    setImportingFrmt(true);
    setError(null);
    try {
      const res = await fetch("/api/frmt/classement", { method: "POST" });
      if (!res.ok) throw new Error("Import classement impossible");
      const { added, total } = (await res.json()) as { added: number; total: number };
      await load();
      setFrmtRefresh((k) => k + 1);
      alert(
        `Classement FRMT réintégré (2005–2015, top 5 G/F par année) : ${added} nouveau(x) sur ${total}. Source : info.frmt.ma/FRMT_CLASSEMENT_WB27 — pour rafraîchir le fichier, lancez IMPORT-FRMT-CLASSEMENT.bat`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur import FRMT");
    } finally {
      setImportingFrmt(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Joueurs"
        description="Registre national — top 5 FRMT par année de naissance (2005–2015), garçons et filles isolés"
        actions={
          <Button
            variant="secondary"
            disabled={importingFrmt}
            onClick={handleImportFrmtClassement}
          >
            <RefreshCw className={`h-4 w-4 ${importingFrmt ? "animate-spin" : ""}`} />
            Sync FRMT (WB27)
          </Button>
        }
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {filtered.length} joueur{filtered.length !== 1 ? "s" : ""} affiché
            {filtered.length !== joueurs.length ? ` sur ${joueurs.length}` : ""}
            {" · "}
            <span className="text-foreground">
              {counts.garcons} garçon{counts.garcons !== 1 ? "s" : ""}
            </span>
            {" · "}
            <span className="text-foreground">
              {counts.filles} fille{counts.filles !== 1 ? "s" : ""}
            </span>
            {frmtScope.length > 0 &&
              ` · ${frmtScope.length} FRMT (2005–2015)`}
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un joueur
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setVueMode("frmt")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              vueMode === "frmt"
                ? "bg-tennis text-background"
                : "bg-surface-elevated text-muted hover:text-foreground"
            }`}
          >
            Classement FRMT ({frmtScope.length})
          </button>
          <button
            type="button"
            onClick={() => setVueMode("liste")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              vueMode === "liste"
                ? "bg-tennis text-background"
                : "bg-surface-elevated text-muted hover:text-foreground"
            }`}
          >
            Liste complète
          </button>
        </div>

        {vueMode === "liste" && (
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setVueSexe("tous")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              vueSexe === "tous"
                ? "bg-tennis text-background"
                : "bg-surface-elevated text-muted hover:text-foreground"
            }`}
          >
            Tous ({counts.tous})
          </button>
          {SEXES_JOUEUR.filter((s) => s.value !== "Autre").map((s) => {
            const count = s.value === "M" ? counts.garcons : counts.filles;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setVueSexe(s.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  vueSexe === s.value
                    ? "bg-tennis text-background"
                    : "bg-surface-elevated text-muted hover:text-foreground"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
        )}

        {vueMode === "liste" && (
          <JoueurFiltersBar filters={filters} onChange={setFilters} groupes={groupes} />
        )}

        {error && !modalOpen && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {vueMode === "frmt" ? (
          <JoueursFrmtClassement
            joueurs={joueurs}
            loading={loading}
            refreshKey={frmtRefresh}
            onEdit={openEdit}
          />
        ) : vueSexe === "tous" ? (
          <div className="space-y-6">
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Garçons
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-sm font-normal text-muted">
                  {garcons.length}
                </span>
              </h2>
              <Card className="overflow-x-auto p-0">
                <JoueursTable
                  joueurs={garcons}
                  loading={loading}
                  showSexeColumn={false}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </Card>
            </section>
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Filles
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-sm font-normal text-muted">
                  {filles.length}
                </span>
              </h2>
              <Card className="overflow-x-auto p-0">
                <JoueursTable
                  joueurs={filles}
                  loading={loading}
                  showSexeColumn={false}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </Card>
            </section>
            {counts.autre > 0 && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  Autre
                  <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-sm font-normal text-muted">
                    {autre.length}
                  </span>
                </h2>
                <Card className="overflow-x-auto p-0">
                  <JoueursTable
                    joueurs={autre}
                    loading={loading}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                </Card>
              </section>
            )}
          </div>
        ) : (
          <Card className="overflow-x-auto p-0">
            <JoueursTable
              joueurs={listeUnique}
              loading={loading}
              showSexeColumn={false}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </Card>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier le joueur" : "Nouveau joueur"}
      >
        <JoueurForm
          form={form}
          setForm={setForm}
          groupes={groupes}
          photoPreview={photoPreview}
          onPhotoChange={onPhotoChange}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitLabel={editing ? "Enregistrer" : "Créer"}
          error={error}
        />
      </Modal>
    </>
  );
}
