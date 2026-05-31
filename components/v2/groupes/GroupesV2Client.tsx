"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { V2PageHeader } from "@/components/v2/V2PageHeader";

import { V2PageActions } from "@/components/v2/V2PageActions";

import { Button } from "@/components/ui/Button";

import { Card } from "@/components/ui/Card";

import { Input, Label, Select } from "@/components/ui/Input";

import { useAgeCategories } from "@/lib/hooks/useAgeCategories";

import {

  getEntraineursByStage,

  getGroupes,

  getJoueurs,

  getJoueursByStage,

  getStageJoueursLinks,

  getStages,

} from "@/lib/supabase/queries";

import { exportListePdf } from "@/lib/pdf/frmt-pdf";

import { matchesOfficialCategoryFilter } from "@/lib/constants/official-categories";

import {

  birthYearFromDate,

  groupKeyFromJoueur,

  groupLabelForBirthYear,

} from "@/lib/v2/categories-age-store";

import {

  getGroupesViewMode,

  saveGroupesViewMode,

  type GroupesViewMode,

} from "@/lib/v2/groupes-prefs";

import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";

import type { EntraineurV2, StageProgrammeV2 } from "@/lib/types/v2";



type PlayerRow = Awaited<ReturnType<typeof getJoueursByStage>>[number];



export function GroupesV2Client() {

  const searchParams = useSearchParams();

  const { categories: ageCategories } = useAgeCategories();

  const [items, setItems] = useState<{ id: string; nom: string }[]>([]);

  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);

  const [stageId, setStageId] = useState("");

  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const [playerStageIds, setPlayerStageIds] = useState<Map<string, string[]>>(new Map());

  const [coaches, setCoaches] = useState<EntraineurV2[]>([]);

  const [groupMode, setGroupMode] = useState<GroupesViewMode>("categorie");

  const [filterCategorie, setFilterCategorie] = useState("");

  const [filterBirthYear, setFilterBirthYear] = useState("");

  const [search, setSearch] = useState("");



  const sortedStages = useMemo(

    () => [...stages].sort((a, b) => b.date_debut.localeCompare(a.date_debut)),

    [stages]

  );



  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);



  useEffect(() => {

    setGroupMode(getGroupesViewMode());

  }, []);



  useEffect(() => {

    const stageFromUrl = searchParams.get("stage");

    if (stageFromUrl) setStageId(stageFromUrl);

  }, [searchParams]);



  const loadPlayersForStage = useCallback(async (id: string) => {

    const [p, c] = await Promise.all([getJoueursByStage(id), getEntraineursByStage(id)]);

    setPlayers(p);

    setPlayerStageIds(new Map());

    setCoaches(c);

  }, []);



  const loadAllStagePlayers = useCallback(async (stageList: StageProgrammeV2[]) => {

    const [links, allJoueurs] = await Promise.all([getStageJoueursLinks(), getJoueurs()]);

    const stageIdsSet = new Set(stageList.map((s) => s.id));

    const relevantLinks = links.filter((l) => stageIdsSet.has(l.stage_id));

    const joueurIds = new Set(relevantLinks.map((l) => l.joueur_id));

    const p = allJoueurs.filter((j) => joueurIds.has(j.id));



    const byJoueur = new Map<string, string[]>();

    for (const l of relevantLinks) {

      const arr = byJoueur.get(l.joueur_id) ?? [];

      if (!arr.includes(l.stage_id)) arr.push(l.stage_id);

      byJoueur.set(l.joueur_id, arr);

    }



    const coachResults = await Promise.all(stageList.map((s) => getEntraineursByStage(s.id)));

    const coachDedup = new Map<string, EntraineurV2>();

    for (const list of coachResults) {

      for (const c of list) coachDedup.set(c.id, c);

    }



    setPlayers(p);

    setPlayerStageIds(byJoueur);

    setCoaches([...coachDedup.values()]);

  }, []);



  const loadPlayers = useCallback(

    async (id: string, stageList: StageProgrammeV2[]) => {

      if (!id) {

        await loadAllStagePlayers(stageList);

        return;

      }

      await loadPlayersForStage(id);

    },

    [loadAllStagePlayers, loadPlayersForStage]

  );



  const load = useCallback(async () => {

    const [g, st] = await Promise.all([getGroupes(), getStages()]);

    setItems(g);

    setStages(st);

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (stages.length === 0) {

      setPlayers([]);

      setCoaches([]);

      setPlayerStageIds(new Map());

      return;

    }

    void loadPlayers(stageId, stages);

  }, [stageId, stages, loadPlayers]);



  const stageLabel = stageId

    ? (stageMap.get(stageId)?.stage_action ?? "")

    : "Tous les stages";



  function playerStageNames(playerId: string): string {

    const ids = playerStageIds.get(playerId);

    if (!ids?.length) return "";

    return ids

      .map((id) => stageMap.get(id)?.stage_action ?? id)

      .sort((a, b) => a.localeCompare(b, "fr"))

      .join(", ");

  }



  const coachLabel =

    coaches.length === 0

      ? "—"

      : coaches.map((c) => `${c.prenom} ${c.nom}`).join(", ");



  const birthYears = useMemo(() => {

    const years = new Set<number>();

    for (const p of players) {

      const y = birthYearFromDate(p.date_naissance);

      if (y != null) years.add(y);

    }

    return [...years].sort((a, b) => b - a);

  }, [players]);



  const filteredPlayers = useMemo(() => {

    const q = search.trim().toLowerCase();

    return players.filter((p) => {

      const cat = getJoueurDisplayCategorie(p);

      if (filterCategorie && !matchesOfficialCategoryFilter(filterCategorie, cat)) {

        return false;

      }

      if (filterBirthYear) {

        const y = birthYearFromDate(p.date_naissance);

        if (y == null || String(y) !== filterBirthYear) return false;

      }

      if (q) {

        const hay = `${p.prenom} ${p.nom} ${p.club ?? ""} ${cat} ${p.licence ?? ""}`.toLowerCase();

        if (!hay.includes(q)) return false;

      }

      return true;

    });

  }, [players, filterCategorie, filterBirthYear, search]);



  const grouped = useMemo(() => {

    const byKey = new Map<string, PlayerRow[]>();

    for (const p of filteredPlayers) {

      const key =

        groupMode === "birthYear"

          ? groupKeyFromJoueur(p, "birthYear")

          : getJoueurDisplayCategorie(p);

      if (!byKey.has(key)) byKey.set(key, []);

      byKey.get(key)!.push(p);

    }

    const entries = [...byKey.entries()];

    if (groupMode === "birthYear") {

      entries.sort((a, b) => {

        const na = a[0] === "Année inconnue" ? 0 : Number.parseInt(a[0], 10);

        const nb = b[0] === "Année inconnue" ? 0 : Number.parseInt(b[0], 10);

        return nb - na;

      });

    } else {

      entries.sort((a, b) => a[0].localeCompare(b[0], "fr"));

    }

    return entries;

  }, [filteredPlayers, groupMode]);



  function resetFilters() {

    setFilterCategorie("");

    setFilterBirthYear("");

    setSearch("");

  }



  const hasActiveFilters = Boolean(filterCategorie || filterBirthYear || search.trim());



  function groupTitle(key: string): string {

    if (groupMode === "birthYear") {

      const y = Number.parseInt(key, 10);

      return Number.isFinite(y) ? groupLabelForBirthYear(y) : key;

    }

    return `GROUPE ${key}`;

  }



  function exportGroupPdf(groupe: string, rows: PlayerRow[]) {

    exportListePdf(

      groupMode === "birthYear" ? groupTitle(groupe) : `LISTE DU GROUPE ${groupe}`,

      ["#", "Nom Prénom", "Né le", "Catégorie", "Club", "Licence"],

      rows.map((p, idx) => [

        String(idx + 1),

        `${p.prenom} ${p.nom}`,

        p.date_naissance ?? "—",

        getJoueurDisplayCategorie(p),

        p.club ?? "Club FRMT",

        p.licence ?? "—",

      ]),

      `groupe-${groupe}.pdf`

    );

  }



  function onModeChange(mode: GroupesViewMode) {

    setGroupMode(mode);

    saveGroupesViewMode(mode);

  }



  function onStageChange(id: string) {

    setStageId(id);

    setFilterCategorie("");

    setFilterBirthYear("");

    setSearch("");

  }



  return (

    <>

      <V2PageHeader

        title="Groupes"

        description="Listes par catégorie d'âge ou par année de naissance"

        actions={

          <V2PageActions

            onExportPdf={() =>

              exportListePdf("Groupes", ["Nom"], items.map((g) => [g.nom]), "groupes-frmt.pdf")

            }

          />

        }

      />

      <main className="space-y-4 p-4 sm:p-6">

        <Card className="space-y-3 p-4">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

            <div>

              <Label>Stage</Label>

              <Select value={stageId} onChange={(e) => onStageChange(e.target.value)}>

                <option value="">Tous les stages</option>

                {sortedStages.map((s) => (

                  <option key={s.id} value={s.id}>

                    {s.stage_action} · {s.categorie} · {s.date_debut}

                  </option>

                ))}

              </Select>

            </div>

            <div>

              <Label>Regrouper par</Label>

              <Select

                value={groupMode}

                onChange={(e) => onModeChange(e.target.value as GroupesViewMode)}

              >

                <option value="categorie">Catégorie (U8, U10… Elite Pro)</option>

                <option value="birthYear">Année de naissance</option>

              </Select>

            </div>

            <div>

              <Label>Recherche</Label>

              <Input

                placeholder="Nom, club, licence…"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

              />

            </div>

            <div>

              <Label>Catégorie</Label>

              <Select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}>

                <option value="">Toutes les catégories</option>

                {ageCategories.map((c) => (

                  <option key={c.id} value={c.code}>

                    {c.code}

                  </option>

                ))}

              </Select>

            </div>

            <div>

              <Label>Année de naissance</Label>

              <Select value={filterBirthYear} onChange={(e) => setFilterBirthYear(e.target.value)}>

                <option value="">Toutes les années</option>

                {birthYears.map((y) => (

                  <option key={y} value={String(y)}>

                    {y}

                  </option>

                ))}

              </Select>

            </div>

            <div className="flex flex-col justify-end gap-2">

              <p className="text-sm text-muted">

                {filteredPlayers.length} / {players.length} joueur

                {players.length !== 1 ? "s" : ""}

              </p>

              {hasActiveFilters && (

                <Button type="button" size="sm" variant="secondary" onClick={resetFilters}>

                  Réinitialiser filtres

                </Button>

              )}

            </div>

          </div>

        </Card>



        <div className="grid gap-3 sm:grid-cols-2">

          {grouped.map(([key, rows]) => (

            <Card key={key} className="space-y-3 p-4">

              <div className="flex items-center justify-between gap-2">

                <p className="font-semibold">{groupTitle(key)}</p>

                <Button size="sm" variant="secondary" onClick={() => exportGroupPdf(key, rows)}>

                  📄 Liste PDF

                </Button>

              </div>

              <p className="text-xs text-muted">Stage : {stageLabel || "—"}</p>

              <p className="text-xs text-muted">

                Coach : {coachLabel} · {rows.length} joueur{rows.length !== 1 ? "s" : ""}

              </p>

              <ul className="space-y-1 text-sm">

                {rows.map((p, idx) => {

                  const y = birthYearFromDate(p.date_naissance);

                  const stageNames = !stageId ? playerStageNames(p.id) : "";

                  return (

                    <li key={p.id}>

                      {idx + 1}. {p.prenom} {p.nom}

                      {stageNames ? <span className="text-muted"> · {stageNames}</span> : null}

                      {groupMode === "categorie" && y != null ? (

                        <span className="text-muted"> · né en {y}</span>

                      ) : null}

                      {groupMode === "birthYear" && (

                        <span className="text-muted"> · {getJoueurDisplayCategorie(p)}</span>

                      )}

                      {p.classement ? ` · #${p.classement} FRMT` : ""}

                    </li>

                  );

                })}

              </ul>

            </Card>

          ))}

        </div>



        {grouped.length === 0 && (

          <Card className="p-6 text-sm text-muted">

            {players.length === 0

              ? stageId

                ? "Aucun joueur affecté à ce stage. Affectez des participants depuis la fiche stage."

                : "Aucun joueur affecté à un stage. Affectez des participants depuis les fiches stage."

              : "Aucun joueur ne correspond aux filtres sélectionnés."}

          </Card>

        )}

      </main>

    </>

  );

}


