"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { CompetitionParticipantPicker } from "@/app/competitions/[id]/components/CompetitionParticipantPicker";
import { CompetitionTaillesEquipeEditor } from "@/app/competitions/[id]/components/CompetitionTaillesEquipeEditor";
import {
  CompetitionTextileStockPanel,
  competitionStockRemaining,
} from "@/app/competitions/[id]/components/CompetitionTextileStockPanel";
import { mergeCompetitionParticipantsEnriched } from "@/lib/competitions/merge-participants-enriched";
import {
  equipementKindsForJoueur,
  equipementTaillesComplets,
  getEquipementTaille,
  matchMaterielForEquipementKind,
  type EquipementKind,
} from "@/lib/constants/equipement-tailles";
import { getMateriels } from "@/lib/data/materiel";
import type { Materiel } from "@/lib/types/materiel";
import type { CompetitionMaterielStockEnriched, CompetitionParticipantEnriched } from "@/lib/types/competition";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";

type TextileRow = {
  id: string;
  competition_id: string;
  participant_id: string;
  article_id: string;
  taille: string | null;
  quantite: number;
  materiels?: { nom: string; quantite_disponible: number } | null;
};

type LineQty = Record<string, number>;

export function TabTextiles({
  competitionId,
  dateFin,
}: {
  competitionId: string;
  dateFin: string;
}) {
  const { toast } = useToast();
  const [textiles, setTextiles] = useState<TextileRow[]>([]);
  const [participants, setParticipants] = useState<CompetitionParticipantEnriched[]>([]);
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [coachs, setCoachs] = useState<EntraineurV2[]>([]);
  const [stock, setStock] = useState<Materiel[]>([]);
  const [competitionStock, setCompetitionStock] = useState<CompetitionMaterielStockEnriched[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [lineQty, setLineQty] = useState<LineQty>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tRes, pRes, sRes, j, c, m] = await Promise.all([
      fetch(`/api/competitions/${competitionId}/textiles`),
      fetch(
        `/api/competitions/${competitionId}/participants?date_fin=${encodeURIComponent(dateFin)}`
      ),
      fetch(`/api/competitions/${competitionId}/textiles/stock`),
      getJoueurs(),
      getEntraineurs(),
      getMateriels(),
    ]);
    const tJson = await tRes.json();
    const pJson = await pRes.json();
    const sJson = await sRes.json();
    const raw: CompetitionParticipantEnriched[] = pJson.participants ?? [];
    const merged = mergeCompetitionParticipantsEnriched(raw, j, c);
    setTextiles(tJson.textiles ?? []);
    setCompetitionStock(sJson.stock ?? []);
    setParticipants(merged);
    setJoueurs(j);
    setStock(m);
  }, [competitionId, dateFin]);

  useEffect(() => {
    void load();
  }, [load]);

  const joueurParticipants = useMemo(
    () => participants.filter((p) => p.participant_type === "joueur"),
    [participants]
  );

  const pickerOptions = useMemo(
    () =>
      joueurParticipants.map((p) => ({
        participant_id: p.participant_id,
        prenom: p.prenom,
        nom: p.nom,
        poste: p.poste,
      })),
    [joueurParticipants]
  );

  const selectedJoueur = useMemo(
    () => (selectedId ? joueurs.find((j) => j.id === selectedId) ?? null : null),
    [selectedId, joueurs]
  );

  const textileKinds = useMemo(
    () => (selectedJoueur ? equipementKindsForJoueur(selectedJoueur) : []),
    [selectedJoueur]
  );

  const assignedForSelected = useMemo(
    () => textiles.filter((t) => t.participant_id === selectedId),
    [textiles, selectedId]
  );

  const lines = useMemo(() => {
    if (!selectedJoueur) return [];
    return textileKinds.map((kind) => {
      const taille = getEquipementTaille(selectedJoueur, kind);
      const materiel = matchMaterielForEquipementKind(stock, kind);
      const existing = assignedForSelected.find((t) => t.article_id === materiel?.id);
      return { kind, taille, materiel, existing };
    });
  }, [selectedJoueur, textileKinds, stock, assignedForSelected]);

  function participantName(id: string) {
    const p = participants.find((x) => x.participant_id === id);
    return p ? `${p.prenom} ${p.nom}`.trim() : "—";
  }

  async function assignLine(kind: EquipementKind, materielId: string, taille: string, qty: number) {
    if (!selectedId) return;
    setAssigning(kind.id);
    const res = await fetch(`/api/competitions/${competitionId}/textiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: selectedId,
        article_id: materielId,
        taille: taille || null,
        quantite: qty,
      }),
    });
    const json = await res.json();
    setAssigning(null);
    if (!res.ok) {
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast(`${kind.label} attribué`, "success");
    await load();
  }

  async function assignPack() {
    if (!selectedJoueur) return;
    const pending = lines.filter((l) => {
      if (!l.materiel || !l.taille || l.existing) return false;
      const qty = lineQty[l.kind.id] ?? 1;
      if (qty < 1) return false;
      const poolRestant = competitionStockRemaining(competitionStock, l.materiel.id);
      return poolRestant === null || poolRestant >= qty;
    });
    if (pending.length === 0) {
      toast("Rien à attribuer (tailles manquantes, stock ou déjà attribué)", "info");
      return;
    }
    setAssigning("pack");
    let ok = 0;
    for (const l of pending) {
      const res = await fetch(`/api/competitions/${competitionId}/textiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: selectedId,
          article_id: l.materiel!.id,
          taille: l.taille,
          quantite: lineQty[l.kind.id] ?? 1,
        }),
      });
      if (res.ok) ok += 1;
      else {
        const json = await res.json();
        toast(json.error ?? `Erreur ${l.kind.label}`, "error");
        break;
      }
    }
    setAssigning(null);
    if (ok > 0) {
      toast(`Pack textile : ${ok} article(s) attribué(s)`, "success");
      await load();
    }
  }

  async function remove(textileId: string) {
    const res = await fetch(
      `/api/competitions/${competitionId}/textiles?textile_id=${textileId}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok) {
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast("Attribution retirée", "success");
    await load();
  }

  const displayedTextiles = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return textiles;
    return textiles.filter((t) => {
      const p = participants.find((x) => x.participant_id === t.participant_id);
      const name = p ? `${p.prenom} ${p.nom}`.trim().toLowerCase() : "";
      return name.includes(q);
    });
  }, [textiles, listFilter, participants]);

  return (
    <div className="space-y-4">
      <CompetitionTextileStockPanel
        competitionId={competitionId}
        materiels={stock}
        onSaved={() => void load()}
      />

      <CompetitionTaillesEquipeEditor
        participants={participants}
        joueurs={joueurs}
        coachs={coachs}
        onJoueurUpdated={(j) => {
          setJoueurs((prev) => prev.map((x) => (x.id === j.id ? j : x)));
          if (selectedId === j.id) setLineQty({});
        }}
        onCoachUpdated={(c) => {
          setCoachs((prev) => prev.map((x) => (x.id === c.id ? c : x)));
        }}
      />

      <Card className="space-y-4 p-4">
        <div>
          <h3 className="font-semibold">Attribution stock matériel</h3>
          <p className="mt-1 text-sm text-muted">
            Participants issus de l&apos;onglet <strong>Participants</strong>. Les tailles viennent de la
            fiche joueur — vous renseignez uniquement la quantité.
          </p>
        </div>

        {joueurParticipants.length === 0 ? (
          <p className="text-sm text-amber-200">
            Aucun joueur dans la compétition. Ajoutez l&apos;équipe dans l&apos;onglet Participants.
          </p>
        ) : (
          <>
            <CompetitionParticipantPicker
              value={selectedId}
              options={pickerOptions}
              onSelect={(o) => setSelectedId(o?.participant_id ?? "")}
            />

            {selectedJoueur && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {selectedJoueur.prenom} {selectedJoueur.nom}
                    </p>
                    {equipementTaillesComplets(selectedJoueur, textileKinds) ? (
                      <p className="text-xs text-emerald-300">Tailles complètes sur la fiche</p>
                    ) : (
                      <p className="text-xs text-amber-200">
                        Tailles incomplètes —{" "}
                        <Link
                          href={`/v2/joueurs/${selectedJoueur.id}`}
                          className="underline hover:text-white"
                        >
                          compléter la fiche joueur
                        </Link>
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={assigning === "pack"}
                    onClick={() => void assignPack()}
                  >
                    {assigning === "pack" ? "Attribution…" : "Attribuer tout le pack"}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="v2-data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Article</th>
                        <th className="p-2 text-left">Taille (fiche)</th>
                        <th className="p-2 text-left">Stock compétition</th>
                        <th className="p-2 text-left">Magasin</th>
                        <th className="p-2 text-right">Qté</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(({ kind, taille, materiel, existing }) => {
                        const poolRestant = materiel
                          ? competitionStockRemaining(competitionStock, materiel.id)
                          : null;
                        const qty = lineQty[kind.id] ?? 1;
                        const poolOk = poolRestant === null || poolRestant >= qty;
                        return (
                        <tr key={kind.id}>
                          <td className="p-2 font-medium">{kind.label}</td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs",
                                taille
                                  ? "bg-sky-500/15 text-sky-200"
                                  : "bg-amber-500/15 text-amber-200"
                              )}
                            >
                              {taille || "Non renseignée"}
                            </span>
                          </td>
                          <td className="p-2 text-xs">
                            {materiel ? (
                              poolRestant !== null ? (
                                <span
                                  className={cn(
                                    "font-semibold",
                                    poolRestant <= 2 ? "text-amber-300" : "text-emerald-300"
                                  )}
                                >
                                  {poolRestant} restant{poolRestant !== 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-amber-200">Stock initial non défini</span>
                              )
                            ) : (
                              <span className="text-amber-200">—</span>
                            )}
                          </td>
                          <td className="p-2 text-muted text-xs">
                            {materiel ? (
                              <>
                                {materiel.nom}
                                <br />
                                <span className="text-[11px]">dispo : {materiel.quantite_disponible}</span>
                              </>
                            ) : (
                              <span className="text-amber-200">Aucun article stock (nom à rapprocher)</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min={1}
                              className="ml-auto w-20 text-right"
                              disabled={Boolean(existing) || !materiel || !taille}
                              value={lineQty[kind.id] ?? 1}
                              onChange={(e) =>
                                setLineQty((prev) => ({
                                  ...prev,
                                  [kind.id]: Math.max(1, Number(e.target.value) || 1),
                                }))
                              }
                            />
                          </td>
                          <td className="p-2 text-right">
                            {existing ? (
                              <span className="text-xs text-emerald-300">Déjà attribué</span>
                            ) : (
                              <Button
                                size="sm"
                                disabled={
                                  !materiel ||
                                  !taille ||
                                  !poolOk ||
                                  assigning === kind.id ||
                                  assigning === "pack"
                                }
                                onClick={() =>
                                  void assignLine(
                                    kind,
                                    materiel!.id,
                                    taille,
                                    lineQty[kind.id] ?? 1
                                  )
                                }
                              >
                                {assigning === kind.id ? "…" : "Attribuer"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-4">
        <Label>Filtrer les attributions</Label>
        <Input
          className="mt-1 max-w-md"
          placeholder="Nom ou prénom…"
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
        />
      </Card>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="v2-data-table w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Participant</th>
              <th className="p-2 text-left">Article</th>
              <th className="p-2 text-left">Taille</th>
              <th className="p-2 text-right">Qté</th>
              <th className="p-2 text-right">Stock compétition</th>
              <th className="p-2 text-right">Magasin</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {displayedTextiles.map((t) => {
              const poolRestant = competitionStockRemaining(competitionStock, t.article_id);
              return (
              <tr key={t.id}>
                <td className="p-2">{participantName(t.participant_id)}</td>
                <td className="p-2">{t.materiels?.nom ?? t.article_id}</td>
                <td className="p-2">{t.taille ?? "—"}</td>
                <td className="p-2 text-right">{t.quantite}</td>
                <td className="p-2 text-right">
                  {poolRestant !== null ? poolRestant : "—"}
                </td>
                <td className="p-2 text-right">{t.materiels?.quantite_disponible ?? "—"}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => void remove(t.id)}>
                    Retirer
                  </Button>
                </td>
              </tr>
            );})}
            {displayedTextiles.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  Aucune attribution textile
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
