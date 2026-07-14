"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import { categorieDepuisNaissance, getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import { normalizeOfficialCategory } from "@/lib/constants/official-categories";
import { PlayerAvatar } from "@/components/v2/ui/PlayerAvatar";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import {
  createJoueur,
  deleteJoueur,
  getJoueurById,
  getJoueurs,
  getStageJoueursLinks,
  updateJoueur,
} from "@/lib/supabase/queries";
import { resolveOwnerPasseportForForm } from "@/lib/passeport/resolve-owner-passeport-form";
import { uploadJoueurPhoto } from "@/lib/storage/upload-photo";
import { resolveJoueurPhotoUrl } from "@/lib/storage/entraineur-photo-cache";
import { JoueurPhotoField } from "@/components/v2/joueurs/JoueurPhotoField";
import { exportJoueursPDF } from "@/lib/pdf/pdf-exports";
import { calcAge } from "@/lib/v2/status-styles";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { normalizeSearchText } from "@/lib/v2/global-search";
import type { JoueurV2 } from "@/lib/types/v2";
import { JoueursFiltersBar } from "@/components/v2/joueurs/JoueursFiltersBar";
import { JoueursRepartitionPanel } from "@/components/v2/joueurs/JoueursRepartitionPanel";
import {
  countActiveFilters,
  joueurDocsComplete,
} from "@/components/v2/joueurs/joueurs-display-stats";
import { StatsKpiRow } from "@/components/v2/statistiques/StatsKpiCard";
import {
  LayoutGrid,
  List,
  Pencil,
  PieChart,
  Trash2,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRole } from "@/lib/hooks/useRole";
import { upsertOwnerPasseportDocument } from "@/lib/passeport/upsert-owner-passeport";

type ViewMode = "list" | "grid";
type PageTab = "annuaire" | "repartitions";

type JoueurForm = {
  nom: string;
  prenom: string;
  sexe: "M" | "F";
  categorie_age: string;
  date_naissance: string;
  nationalite: string;
  classement: string;
  classement_itf: string;
  licence: string;
  ipin: string;
  telephone: string;
  email: string;
  club: string;
  passeport_numero: string;
  passeport_expiration: string;
  statut: string;
};

const defaultForm = (): JoueurForm => ({
  nom: "",
  prenom: "",
  sexe: "M",
  categorie_age: "U16",
  date_naissance: "",
  nationalite: "Maroc",
  classement: "",
  classement_itf: "",
  licence: "",
  ipin: "",
  telephone: "",
  email: "",
  club: "",
  passeport_numero: "",
  passeport_expiration: "",
  statut: "actif",
});

export function JoueursV2Client() {
  const searchParams = useSearchParams();
  const { categories: ageCategories } = useAgeCategories();
  const { toast } = useToast();
  const { filterJoueurs } = useUserPermissions();
  const { canWrite, canDelete, role } = useRole();
  const canManageJoueurs = canWrite || role === "viewer" || role === "direction";
  const canDeleteJoueurs = canDelete || role === "viewer" || role === "direction";
  const [items, setItems] = useState<JoueurV2[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [pageTab, setPageTab] = useState<PageTab>("annuaire");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [sexe, setSexe] = useState("");
  const [categorie, setCategorie] = useState("");
  const [annee, setAnnees] = useState("");
  const [statut, setStatut] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [sortMode, setSortMode] = useState<"nom" | "club" | "classement_asc" | "classement_desc">("nom");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [loadingEditForm, setLoadingEditForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JoueurV2 | null>(null);
  const [editTarget, setEditTarget] = useState<JoueurV2 | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [form, setForm] = useState<JoueurForm>(() => defaultForm());
  const [registerPasseportModule, setRegisterPasseportModule] = useState(true);
  const [manualCategorie, setManualCategorie] = useState(false);
  const [inlineEdits, setInlineEdits] = useState<
    Record<string, { telephone?: string; passeport_numero?: string; passeport_expiration?: string; statut?: string }>
  >({});
  const [savingInline, setSavingInline] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [j, links] = await Promise.all([getJoueurs(), getStageJoueursLinks()]);
    setItems(j);
    const counts: Record<string, number> = {};
    for (const l of links) counts[l.joueur_id] = (counts[l.joueur_id] ?? 0) + 1;
    setStageCounts(counts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q?.trim()) setSearch(q.trim());
  }, [searchParams]);

  const visibleItems = useMemo(() => filterJoueurs(items), [items, filterJoueurs]);

  const birthYears = useMemo(() => {
    const years = new Set<number>();
    for (const j of visibleItems) {
      if (j.date_naissance) years.add(new Date(j.date_naissance).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [visibleItems]);

  const clubOptions = useMemo(() => {
    const clubs = new Set<string>();
    for (const j of visibleItems) {
      const c = (j.club ?? "").trim();
      if (c) clubs.add(c);
    }
    return [...clubs].sort((a, b) => a.localeCompare(b, "fr"));
  }, [visibleItems]);

  const filtered = useMemo(() => {
    let list = [...visibleItems];
    const tokens = normalizeSearchText(debouncedSearch).split(/\s+/).filter(Boolean);
    if (tokens.length) {
      list = list.filter((j) => {
        const hay = normalizeSearchText(
          `${j.prenom} ${j.nom} ${j.club ?? ""} ${j.categorie_age ?? ""} ${j.licence ?? ""}`
        );
        return tokens.every((t) => hay.includes(t));
      });
    }
    if (sexe) list = list.filter((j) => j.sexe === sexe);
    if (categorie) {
      list = list.filter((j) => {
        const cat = getJoueurDisplayCategorie(j);
        if (cat === categorie) return true;
        const y = j.date_naissance?.slice(0, 4);
        return y === categorie;
      });
    }
    if (annee)
      list = list.filter((j) => j.date_naissance?.startsWith(annee));
    if (statut) list = list.filter((j) => (j.statut ?? "actif") === statut);
    if (clubFilter) {
      list = list.filter((j) => (j.club ?? "").trim() === clubFilter);
    }
    list.sort((a, b) => {
      if (sortMode === "club") {
        const ca = (a.club ?? "—").trim().toLocaleLowerCase("fr");
        const cb = (b.club ?? "—").trim().toLocaleLowerCase("fr");
        const byClub = ca.localeCompare(cb, "fr");
        if (byClub !== 0) return byClub;
        return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr");
      }
      if (sortMode === "classement_asc" || sortMode === "classement_desc") {
        const ra = parseInt(a.classement ?? "9999", 10) || 9999;
        const rb = parseInt(b.classement ?? "9999", 10) || 9999;
        return sortMode === "classement_asc" ? ra - rb : rb - ra;
      }
      return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr");
    });
    return list;
  }, [visibleItems, debouncedSearch, sexe, categorie, annee, statut, clubFilter, sortMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((j) => j.id === id)));
  }, [filtered]);

  const activeFilterCount = countActiveFilters({
    search: debouncedSearch,
    sexe,
    categorie,
    annee,
    statut,
    clubFilter,
  });

  const summary = useMemo(() => {
    let actifs = 0;
    let enStage = 0;
    let docsOk = 0;
    for (const j of filtered) {
      if ((j.statut ?? "actif") === "actif") actifs++;
      if ((stageCounts[j.id] ?? 0) > 0) enStage++;
      if (joueurDocsComplete(j)) docsOk++;
    }
    return { actifs, enStage, docsOk };
  }, [filtered, stageCounts]);

  function resetFilters() {
    setSearch("");
    setSexe("");
    setCategorie("");
    setAnnees("");
    setStatut("");
    setClubFilter("");
    setSortMode("nom");
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm());
    setRegisterPasseportModule(true);
    setManualCategorie(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setOpen(true);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function openEdit(j: JoueurV2) {
    setEditTarget(j);
    setOpen(true);
    setLoadingEditForm(true);
    setPhotoFile(null);
    try {
      const fresh = (await getJoueurById(j.id)) ?? j;
      const autoFromBirth = fresh.date_naissance
        ? categorieDepuisNaissance(fresh.date_naissance)
        : "";
      const storedCat = getJoueurDisplayCategorie(fresh);
      const passport = await resolveOwnerPasseportForForm(
        "player",
        j.id,
        fresh.passeport_numero,
        fresh.passeport_expiration
      );
      setForm({
        nom: fresh.nom ?? "",
        prenom: fresh.prenom ?? "",
        sexe: (fresh.sexe === "F" ? "F" : "M") as "M" | "F",
        categorie_age: storedCat,
        date_naissance: fresh.date_naissance ?? "",
        nationalite: fresh.nationalite ?? "Maroc",
        classement: fresh.classement ?? "",
        classement_itf: fresh.classement_itf ?? "",
        licence: fresh.licence ?? "",
        ipin: fresh.ipin?.trim() ?? "",
        telephone: fresh.telephone ?? "",
        email: fresh.email ?? "",
        club: fresh.club ?? "",
        passeport_numero: passport.numero,
        passeport_expiration: passport.expiration,
        statut: fresh.statut ?? "actif",
      });
      setManualCategorie(Boolean(storedCat && (!autoFromBirth || storedCat !== autoFromBirth)));
      setPhotoPreview(fresh.photo_url ?? null);
    } catch {
      toast("Impossible de charger la fiche complète", "error");
      const autoFromBirth = j.date_naissance ? categorieDepuisNaissance(j.date_naissance) : "";
      const storedCat = getJoueurDisplayCategorie(j);
      setForm({
        nom: j.nom ?? "",
        prenom: j.prenom ?? "",
        sexe: (j.sexe === "F" ? "F" : "M") as "M" | "F",
        categorie_age: storedCat,
        date_naissance: j.date_naissance ?? "",
        nationalite: j.nationalite ?? "Maroc",
        classement: j.classement ?? "",
        classement_itf: j.classement_itf ?? "",
        licence: j.licence ?? "",
        ipin: j.ipin?.trim() ?? "",
        telephone: j.telephone ?? "",
        email: j.email ?? "",
        club: j.club ?? "",
        passeport_numero: j.passeport_numero ?? "",
        passeport_expiration: j.passeport_expiration ?? "",
        statut: j.statut ?? "actif",
      });
      setManualCategorie(Boolean(storedCat && (!autoFromBirth || storedCat !== autoFromBirth)));
      setPhotoPreview(j.photo_url ?? null);
    } finally {
      setLoadingEditForm(false);
    }
  }

  async function handleSave() {
    if (!form.sexe) {
      toast("Le sexe est obligatoire", "error");
      return;
    }
    const categorieAuto = form.date_naissance ? categorieDepuisNaissance(form.date_naissance) : form.categorie_age;
    const rawCat = manualCategorie ? form.categorie_age : categorieAuto;
    const categorieFinale = normalizeOfficialCategory(rawCat) ?? rawCat;

    const payload = {
      nom: form.nom,
      prenom: form.prenom,
      sexe: form.sexe,
      categorie_age: categorieFinale,
      categorie: categorieFinale,
      date_naissance: form.date_naissance || undefined,
      nationalite: form.nationalite,
      classement: form.classement || null,
      classement_itf: form.classement_itf || null,
      licence: form.licence || null,
      ipin: form.ipin.trim() || null,
      telephone: form.telephone || null,
      email: form.email || null,
      club: form.club || null,
      passeport_numero: form.passeport_numero || null,
      passeport_expiration: form.passeport_expiration || null,
      statut: form.statut,
    };
    async function retryWithoutMissingColumns(
      mode: "create" | "update",
      base: Record<string, unknown>
    ): Promise<{ ok: boolean; error?: string; id?: string }> {
      let candidate: Record<string, unknown> = { ...base };
      for (let attempt = 0; attempt < 8; attempt++) {
        if (mode === "update" && editTarget) {
          const res = await updateJoueur(editTarget.id, candidate as Partial<JoueurV2>);
          if (res.ok) return { ok: true, id: editTarget.id };
          const msg = res.error ?? "";
          const missing = msg.match(/could not find the '([^']+)' column/i)?.[1];
          if (!missing) return { ok: false, error: msg };
          const next = { ...candidate };
          delete next[missing];
          candidate = next;
          continue;
        }
        const result = await createJoueur(candidate as Partial<JoueurV2>);
        if (!result.error && result.data?.id) return { ok: true, id: result.data.id };
        const msg = result.error ?? "";
        const missing = msg.match(/could not find the '([^']+)' column/i)?.[1];
        if (!missing) return { ok: false, error: msg };
        const next = { ...candidate };
        delete next[missing];
        candidate = next;
      }
      return { ok: false, error: "Impossible d'enregistrer (colonnes manquantes en base)." };
    }

    setSavingPhoto(true);
    try {
      let joueurId: string | undefined;

      if (editTarget) {
        const res = await retryWithoutMissingColumns("update", payload as Record<string, unknown>);
        if (!res.ok) {
          toast(res.error ?? "Erreur mise à jour joueur", "error");
          return;
        }
        joueurId = res.id;
        if (photoFile && res.id) {
          const photo_url = await uploadJoueurPhoto(photoFile, res.id);
          const up = await updateJoueur(res.id, { photo_url });
          if (!up.ok) toast(up.error ?? "Photo non enregistrée", "warning");
        }
        toast("Joueur mis à jour");
      } else {
        const result = await retryWithoutMissingColumns("create", payload as Record<string, unknown>);
        if (!result.ok || !result.id) {
          toast(result.error ?? "Erreur création joueur", "error");
          return;
        }
        joueurId = result.id;
        if (photoFile) {
          const photo_url = await uploadJoueurPhoto(photoFile, result.id);
          const up = await updateJoueur(result.id, { photo_url });
          if (!up.ok) toast(up.error ?? "Photo non enregistrée", "warning");
        }
        toast("Joueur créé");
      }

      if (
        joueurId &&
        registerPasseportModule &&
        form.passeport_numero.trim()
      ) {
        const docRes = await upsertOwnerPasseportDocument("player", joueurId, {
          document_number: form.passeport_numero,
          expiration_date: form.passeport_expiration || null,
        });
        if (docRes.error) {
          toast(`Passeport module : ${docRes.error}`, "warning");
        }
      }

      setOpen(false);
      setEditTarget(null);
      setForm(defaultForm());
      setManualCategorie(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur enregistrement", "error");
    } finally {
      setSavingPhoto(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteJoueur(deleteTarget.id);
    toast("Joueur supprimé");
    setDeleteTarget(null);
    await load();
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteJoueur(id);
    }
    toast(`${selectedIds.length} joueur(s) supprimé(s)`);
    setSelectedIds([]);
    setBulkDeleteOpen(false);
    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllFiltered() {
    const ids = filtered.map((j) => j.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  async function saveInlineField(
    joueur: JoueurV2,
    field: "telephone" | "passeport_numero" | "passeport_expiration" | "statut",
    value: string
  ) {
    const current = (joueur[field] ?? "") as string;
    if ((current || "") === (value || "")) return;
    setSavingInline((s) => ({ ...s, [joueur.id]: true }));
    const res = await updateJoueur(joueur.id, { [field]: value || null });
    setSavingInline((s) => ({ ...s, [joueur.id]: false }));
    if (!res.ok) {
      toast(res.error ?? "Erreur sauvegarde rapide", "error");
      return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === joueur.id ? ({ ...p, [field]: value || null } as JoueurV2) : p))
    );
    toast("Mise à jour enregistrée", "success");
  }

  function exportPdf() {
    const filtres = [
      sexe && `Sexe: ${sexe}`,
      categorie && `Catégorie: ${categorie}`,
      annee && `Année: ${annee}`,
      statut && `Statut: ${statut}`,
      search && `Recherche: ${search}`,
      clubFilter && `Club: ${clubFilter}`,
      sortMode !== "nom" && `Tri: ${sortMode}`,
    ]
      .filter(Boolean)
      .join(" · ");
    exportJoueursPDF(
      filtered.map((j, i) => ({
        "#": String(i + 1),
        Nom: j.nom,
        Prénom: j.prenom,
        Sexe: j.sexe === "F" ? "F" : "M",
        Catégorie: getJoueurDisplayCategorie(j),
        "Né le": j.date_naissance ?? "—",
        Âge: String(calcAge(j.date_naissance) ?? "—"),
        Classement: j.classement ?? "—",
        Club: (j as { club?: string }).club ?? "—",
        Statut: j.statut ?? "actif",
      })),
      filtres || undefined
    );
  }

  function sexeBadgeClass(sexeValue: string | null | undefined): string {
    if (sexeValue === "F") {
      return "bg-pink-500/15 text-pink-300 ring-pink-500/30";
    }
    if (sexeValue === "M") {
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    }
    return "bg-surface-elevated text-muted ring-border/60";
  }

  return (
    <>
      <V2PageHeader
        title="Joueurs — Centre national"
        description={`Annuaire de ${items.length} licencié${items.length !== 1 ? "s" : ""} · fiches, filtres et répartitions par catégorie, club et stages`}
        actions={
          <div className="flex items-center gap-2">
            {pageTab === "annuaire" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView(view === "list" ? "grid" : "list")}
                title={view === "list" ? "Vue grille" : "Vue liste"}
              >
                {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
            )}
            <V2PageActions canAdd={canManageJoueurs} onAdd={openCreate} onExportPdf={exportPdf} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast("Import Excel disponible dans la prochaine iteration", "info")}
            >
              Import Excel
            </Button>
            {canDeleteJoueurs && selectedIds.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                Supprimer sélection ({selectedIds.length})
              </Button>
            )}
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setPageTab("annuaire")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pageTab === "annuaire"
                ? "border-frmt-green text-frmt-green"
                : "border-transparent text-muted hover:text-[var(--fg)]"
            )}
          >
            <Users2 className="h-4 w-4" />
            Annuaire
          </button>
          <button
            type="button"
            onClick={() => setPageTab("repartitions")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pageTab === "repartitions"
                ? "border-frmt-green text-frmt-green"
                : "border-transparent text-muted hover:text-[var(--fg)]"
            )}
          >
            <PieChart className="h-4 w-4" />
            Répartitions
          </button>
        </div>

        <JoueursFiltersBar
          search={search}
          onSearchChange={setSearch}
          sexe={sexe}
          onSexeChange={setSexe}
          categorie={categorie}
          onCategorieChange={setCategorie}
          annee={annee}
          onAnneeChange={setAnnees}
          statut={statut}
          onStatutChange={setStatut}
          clubFilter={clubFilter}
          onClubFilterChange={setClubFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          ageCategories={ageCategories}
          birthYears={birthYears}
          clubOptions={clubOptions}
          activeFilterCount={activeFilterCount}
          resultCount={filtered.length}
          totalCount={items.length}
          onReset={resetFilters}
        />

        <StatsKpiRow
          items={[
            {
              label: "Effectif filtré",
              value: filtered.length,
              sub: `${items.length} au total`,
            },
            {
              label: "Actifs",
              value: summary.actifs,
              sub: "Statut actif",
              progress: filtered.length ? (summary.actifs / filtered.length) * 100 : 0,
            },
            {
              label: "En stage",
              value: summary.enStage,
              sub: "Au moins 1 stage",
              progress: filtered.length ? (summary.enStage / filtered.length) * 100 : 0,
            },
            {
              label: "Dossiers complets",
              value: summary.docsOk,
              sub: "Passeport renseigné",
              progress: filtered.length ? (summary.docsOk / filtered.length) * 100 : 0,
            },
          ]}
        />

        {pageTab === "repartitions" ? (
          <JoueursRepartitionPanel joueurs={filtered} stageCounts={stageCounts} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun joueur"
            description="Créez votre premier joueur ou modifiez les filtres."
            actionLabel="Ajouter un joueur"
            onAction={openCreate}
          />
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((j) => (
              <Card
                key={j.id}
                className="card-premium overflow-hidden border border-border/80 transition hover:border-frmt-green/40"
              >
                {canDeleteJoueurs && (
                  <div className="mb-2 flex justify-end">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(j.id)}
                      onChange={() => toggleSelect(j.id)}
                      aria-label={`Sélectionner ${j.prenom} ${j.nom}`}
                    />
                  </div>
                )}
                <Link href={`/v2/joueurs/${j.id}`} className="flex flex-col items-center gap-2 text-center">
                      <PlayerAvatar
                    prenom={j.prenom}
                    nom={j.nom}
                    photoUrl={resolveJoueurPhotoUrl(j.id, j.photo_url)}
                        categorie={getJoueurDisplayCategorie(j)}
                    size="lg"
                  />
                  <p className="font-semibold">
                    {j.prenom} {j.nom}
                  </p>
                  <p className="text-xs text-muted">
                    {getJoueurDisplayCategorie(j)}
                    {j.licence ? ` · #${j.licence}` : ""}
                  </p>
                  {j.club && <p className="text-xs text-frmt-green">{j.club}</p>}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sexeBadgeClass(j.sexe)}`}
                  >
                    {j.sexe === "F" ? "Féminin" : "Masculin"}
                  </span>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px]">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                      {stageCounts[j.id] ?? 0} stage{(stageCounts[j.id] ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        joueurDocsComplete(j)
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      )}
                    >
                      {joueurDocsComplete(j) ? "Dossier OK" : "À compléter"}
                    </span>
                  </div>
                  <StatusBadge statut={j.statut ?? "actif"} />
                </Link>
                <div className="mt-3 flex justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted">
                    {j.classement ? `Cl. ${j.classement}` : "Non classé"}
                  </span>
                  <div className="flex gap-1">
                    {canManageJoueurs && (
                      <Button variant="secondary" size="sm" onClick={() => void openEdit(j)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {canDeleteJoueurs && (
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(j)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border border-border/80">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated/80 px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Annuaire — {filtered.length} joueur{filtered.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted">
                Cliquez sur un nom pour ouvrir la fiche · faites défiler horizontalement si besoin
              </p>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="sticky top-0 z-10 bg-surface-elevated shadow-sm">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3 w-10">
                    {canDeleteJoueurs && (
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 && filtered.every((j) => selectedIds.includes(j.id))
                        }
                        onChange={toggleSelectAllFiltered}
                        aria-label="Tout sélectionner"
                      />
                    )}
                  </th>
                  <th className="p-3 whitespace-nowrap min-w-[14rem]">Joueur</th>
                  <th className="p-3 whitespace-nowrap">Sexe</th>
                  <th className="p-3 whitespace-nowrap">Catégorie</th>
                  <th className="p-3 whitespace-nowrap">Âge</th>
                  <th className="p-3 whitespace-nowrap">Classement</th>
                  <th className="p-3 whitespace-nowrap min-w-[8rem]">Club</th>
                  <th className="p-3 text-center whitespace-nowrap">Stages</th>
                  <th className="p-3 whitespace-nowrap">Dossier</th>
                  <th className="p-3 whitespace-nowrap min-w-[7rem]">Statut</th>
                  <th className="p-3 w-24 shrink-0" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((j, i) => (
                  <tr
                    key={j.id}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-frmt-green/[0.04]",
                      i % 2 === 1 && "bg-surface-elevated/20"
                    )}
                  >
                    <td className="p-3">
                      {canDeleteJoueurs && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(j.id)}
                          onChange={() => toggleSelect(j.id)}
                          aria-label={`Sélectionner ${j.prenom} ${j.nom}`}
                        />
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Link
                        href={`/v2/joueurs/${j.id}`}
                        className="flex items-center gap-3 font-medium hover:text-frmt-green"
                      >
                        <PlayerAvatar
                          prenom={j.prenom}
                          nom={j.nom}
                          photoUrl={resolveJoueurPhotoUrl(j.id, j.photo_url)}
                          categorie={getJoueurDisplayCategorie(j)}
                          size="md"
                        />
                        <span>
                          {j.prenom} {j.nom}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sexeBadgeClass(j.sexe)}`}
                      >
                        {j.sexe === "F" ? "Féminin" : "Masculin"}
                      </span>
                    </td>
                    <td className="p-3">{getJoueurDisplayCategorie(j)}</td>
                    <td className="p-3">{calcAge(j.date_naissance) ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap tabular-nums">{j.classement ?? "—"}</td>
                    <td className="p-3 max-w-[12rem] truncate" title={j.club ?? undefined}>
                      {j.club ?? "—"}
                    </td>
                    <td className="p-3 text-center tabular-nums">
                      <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        {stageCounts[j.id] ?? 0}
                      </span>
                    </td>
                    <td className="p-3">
                      {joueurDocsComplete(j) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                          <UserCheck className="h-3.5 w-3.5" />
                          Complet
                        </span>
                      ) : (
                        <span className="text-xs text-amber-300">À compléter</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {canManageJoueurs ? (
                        <Select
                          value={inlineEdits[j.id]?.statut ?? (j.statut ?? "actif")}
                          className="h-8 min-w-[6.5rem] text-xs"
                          disabled={!!savingInline[j.id]}
                          onChange={(e) => {
                            const next = e.target.value;
                            setInlineEdits((s) => ({
                              ...s,
                              [j.id]: { ...(s[j.id] ?? {}), statut: next },
                            }));
                            void saveInlineField(j, "statut", next);
                          }}
                        >
                          <option value="actif">Actif</option>
                          <option value="inactif">Inactif</option>
                          <option value="blesse">Blessé</option>
                          <option value="suspendu">Suspendu</option>
                        </Select>
                      ) : (
                        <StatusBadge statut={j.statut ?? "actif"} />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {canManageJoueurs && (
                          <Button variant="secondary" size="sm" onClick={() => void openEdit(j)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteJoueurs && (
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(j)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        )}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Modifier le joueur" : "Ajouter un joueur"}
        footer={
          <Button
            onClick={() => void handleSave()}
            disabled={!form.nom || !form.prenom || savingPhoto || loadingEditForm}
          >
            {savingPhoto
              ? "Enregistrement…"
              : loadingEditForm
                ? "Chargement…"
                : editTarget
                  ? "Mettre à jour"
                  : "Enregistrer"}
          </Button>
        }
      >
        <div
          className={`grid gap-3 sm:grid-cols-2 ${loadingEditForm ? "pointer-events-none opacity-60" : ""}`}
        >
          {loadingEditForm && (
            <p className="sm:col-span-2 text-center text-xs text-muted">Chargement de la fiche…</p>
          )}
          <JoueurPhotoField
            prenom={form.prenom}
            nom={form.nom}
            categorie={form.categorie_age}
            photoPreview={photoPreview}
            onPhotoChange={onPhotoChange}
            passeportNumero={form.passeport_numero}
            passeportExpiration={form.passeport_expiration}
          />
          <div>
            <Label>Prénom *</Label>
            <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <div>
            <Label>Nom *</Label>
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <div>
            <Label>Sexe *</Label>
            <Select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value as "M" | "F" })}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <CategorySelect
              value={form.categorie_age}
              onChange={(categorie_age) => setForm({ ...form, categorie_age })}
              disabled={!manualCategorie}
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={manualCategorie}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setManualCategorie(enabled);
                  if (!enabled && form.date_naissance) {
                    setForm({
                      ...form,
                      categorie_age: categorieDepuisNaissance(form.date_naissance),
                    });
                  }
                }}
              />
              Modifier manuellement la catégorie
            </label>
          </div>
          <div>
            <Label>Date de naissance</Label>
            <Input
              type="date"
              value={form.date_naissance}
              onChange={(e) => {
                const date_naissance = e.target.value;
                setForm({
                  ...form,
                  date_naissance,
                  categorie_age:
                    !manualCategorie && date_naissance
                      ? categorieDepuisNaissance(date_naissance)
                      : form.categorie_age,
                });
              }}
            />
          </div>
          <div>
            <Label>Classement national (optionnel)</Label>
            <Input
              placeholder="Laisser vide si non classé"
              value={form.classement}
              onChange={(e) => setForm({ ...form, classement: e.target.value })}
            />
          </div>
          <div>
            <Label>IPIN</Label>
            <Input
              placeholder="Identifiant IPIN ITF"
              value={form.ipin}
              onChange={(e) => setForm({ ...form, ipin: e.target.value })}
            />
          </div>
          <div>
            <Label>Club</Label>
            <Input
              placeholder="Club du joueur"
              value={form.club}
              onChange={(e) => setForm({ ...form, club: e.target.value })}
            />
          </div>
          <div>
            <Label>N° Passeport (optionnel)</Label>
            <Input
              placeholder="Laisser vide si indisponible"
              value={form.passeport_numero}
              onChange={(e) => setForm({ ...form, passeport_numero: e.target.value })}
            />
          </div>
          <div>
            <Label>Expiration passeport (optionnel)</Label>
            <Input
              type="date"
              value={form.passeport_expiration}
              onChange={(e) => setForm({ ...form, passeport_expiration: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 space-y-2 rounded border border-[var(--border)] bg-[var(--bg-main)] p-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={registerPasseportModule}
                onChange={(e) => setRegisterPasseportModule(e.target.checked)}
              />
              Enregistrer aussi dans <span className="text-[var(--text-primary)]">Passeports & Visas</span>{" "}
              (si un n° est saisi)
            </label>
            <p className="text-xs text-muted">
              Copie passeport : onglet Documents de la fiche joueur ou rubrique Passeports & Visas.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le joueur"
        description={
          deleteTarget
            ? `Le joueur ${deleteTarget.prenom} ${deleteTarget.nom} sera retiré de tous les stages.`
            : ""
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Supprimer les joueurs sélectionnés"
        description={`Cette action est irréversible. ${selectedIds.length} joueur(s) seront supprimé(s).`}
        onConfirm={() => void confirmBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
  );
}
