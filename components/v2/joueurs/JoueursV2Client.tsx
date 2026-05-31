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
import { JoueurPhotoField } from "@/components/v2/joueurs/JoueurPhotoField";
import { exportJoueursPDF } from "@/lib/pdf/pdf-exports";
import { calcAge } from "@/lib/v2/status-styles";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { normalizeSearchText } from "@/lib/v2/global-search";
import type { JoueurV2 } from "@/lib/types/v2";
import { LayoutGrid, List, Pencil, Trash2, Users } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { upsertOwnerPasseportDocument } from "@/lib/passeport/upsert-owner-passeport";

type ViewMode = "list" | "grid";

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
  const { canWrite, canDelete, role } = useRole();
  const canManageJoueurs = canWrite || role === "viewer" || role === "direction";
  const canDeleteJoueurs = canDelete || role === "viewer" || role === "direction";
  const [items, setItems] = useState<JoueurV2[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
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

  const birthYears = useMemo(() => {
    const years = new Set<number>();
    for (const j of items) {
      if (j.date_naissance) years.add(new Date(j.date_naissance).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [items]);

  const clubOptions = useMemo(() => {
    const clubs = new Set<string>();
    for (const j of items) {
      const c = (j.club ?? "").trim();
      if (c) clubs.add(c);
    }
    return [...clubs].sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
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
  }, [items, debouncedSearch, sexe, categorie, annee, statut, clubFilter, sortMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((j) => j.id === id)));
  }, [filtered]);

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
        title={`Joueurs (${items.length})`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView(view === "list" ? "grid" : "list")}
              title={view === "list" ? "Vue grille" : "Vue liste"}
            >
              {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
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
        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={sexe} onChange={(e) => setSexe(e.target.value)}>
            <option value="">Sexe — Tous</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </Select>
          <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            <option value="">Catégorie / année — Toutes</option>
            {ageCategories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={annee} onChange={(e) => setAnnees(e.target.value)}>
            <option value="">Année naissance</option>
            {birthYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
          <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Statut — Tous</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="blesse">Blessé</option>
            <option value="suspendu">Suspendu</option>
          </Select>
          <Select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}>
            <option value="">Club — Tous</option>
            {clubOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={sortMode}
            onChange={(e) =>
              setSortMode(e.target.value as "nom" | "club" | "classement_asc" | "classement_desc")
            }
          >
            <option value="nom">Tri : Nom A→Z</option>
            <option value="club">Tri : Club A→Z</option>
            <option value="classement_asc">Tri : Classement ↑</option>
            <option value="classement_desc">Tri : Classement ↓</option>
          </Select>
        </Card>

        {filtered.length === 0 ? (
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
              <Card key={j.id} className="card-premium p-4">
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
                    photoUrl={j.photo_url}
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
                    <span>🎾 {stageCounts[j.id] ?? 0} stage(s)</span>
                    <span className="text-[var(--success)]">✅ Docs OK</span>
                  </div>
                  <StatusBadge statut={j.statut ?? "actif"} />
                </Link>
                <div className="mt-3 flex justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted">{stageCounts[j.id] ?? 0} stage(s)</span>
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
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated text-left text-muted">
                  <th className="p-3">
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
                  <th className="p-3" />
                  <th className="p-3">Nom</th>
                  <th className="p-3">Prénom</th>
                  <th className="p-3">Sexe</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Âge</th>
                  <th className="p-3">Classement</th>
                  <th className="p-3">Club</th>
                  <th className="p-3">Stages</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((j, i) => (
                  <tr
                    key={j.id}
                    className={`border-b border-border/50 ${i % 2 === 1 ? "bg-surface-elevated/30" : ""}`}
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
                    <td className="p-3">
                      <PlayerAvatar
                        prenom={j.prenom}
                        nom={j.nom}
                        photoUrl={j.photo_url}
                        categorie={getJoueurDisplayCategorie(j)}
                        size="sm"
                      />
                    </td>
                    <td className="p-3">
                      <Link href={`/v2/joueurs/${j.id}`} className="font-medium hover:text-frmt-green">
                        {j.nom}
                      </Link>
                    </td>
                    <td className="p-3">{j.prenom}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sexeBadgeClass(j.sexe)}`}
                      >
                        {j.sexe === "F" ? "Féminin" : "Masculin"}
                      </span>
                    </td>
                    <td className="p-3">{getJoueurDisplayCategorie(j)}</td>
                    <td className="p-3">{calcAge(j.date_naissance) ?? "—"}</td>
                    <td className="p-3">{j.classement ?? "—"}</td>
                    <td className="p-3">{j.club ?? "—"}</td>
                    <td className="p-3">{stageCounts[j.id] ?? 0}</td>
                    <td className="p-3">
                      {canManageJoueurs ? (
                        <Select
                          value={inlineEdits[j.id]?.statut ?? (j.statut ?? "actif")}
                          className="h-8 text-xs"
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
