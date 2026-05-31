"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  getStageKinesitherapieAction,
  saveStageKinesitherapieAction,
} from "@/lib/actions/stage-kinesitherapie-actions";
import type { JoueurV2, StageProgrammeV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";

type ToastFn = (msg: string, type?: "success" | "error" | "info" | "warning") => void;

export function StageKinesitherapieSection({
  stage,
  joueurs,
  canManage,
  toast,
}: {
  stage: StageProgrammeV2;
  joueurs: JoueurV2[];
  canManage: boolean;
  toast: ToastFn;
}) {
  const [actif, setActif] = useState(false);
  const [dates, setDates] = useState({ debut: stage.date_debut, fin: stage.date_fin });
  const [remarques, setRemarques] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const bundle = await getStageKinesitherapieAction(
      stage.id,
      joueurs.map((j) => j.id)
    );
    setActif(bundle.stageKinesitherapieFlag || Boolean(bundle.config?.actif));
    setDates({
      debut: bundle.config?.date_debut ?? stage.date_debut,
      fin: bundle.config?.date_fin ?? stage.date_fin,
    });
    setRemarques(bundle.config?.remarques ?? "");
    setSelected(new Set(bundle.selectedJoueurIds));
    setSuggested(bundle.suggestedJoueurIds);
    setLoading(false);
  }, [stage.id, stage.date_debut, stage.date_fin, joueurs]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedJoueurs = useMemo(
    () => [...joueurs].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")),
    [joueurs]
  );

  function toggleJoueur(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyAutoSelection() {
    setSelected(new Set(suggested));
    toast(
      suggested.length
        ? `${suggested.length} joueur(s) sélectionné(s) (séances kiné sur la période du stage)`
        : "Aucune séance kiné trouvée sur cette période pour les joueurs du stage",
      suggested.length ? "success" : "info"
    );
  }

  async function save() {
    setSaving(true);
    const res = await saveStageKinesitherapieAction({
      stageId: stage.id,
      actif,
      dateDebut: dates.debut,
      dateFin: dates.fin,
      remarques,
      selectedJoueurIds: [...selected],
      suggestedJoueurIds: suggested,
    });
    setSaving(false);
    if (!res.ok) {
      toast(res.error ?? "Erreur", "error");
      return;
    }
    toast("Kinésithérapie stage enregistrée", "success");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted">Chargement kinésithérapie…</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={actif}
          disabled={!canManage}
          onChange={(e) => setActif(e.target.checked)}
        />
        Kinésithérapie active pour ce stage
      </label>

      {actif ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Période kiné (début)</Label>
              <Input
                type="date"
                value={dates.debut}
                disabled={!canManage}
                onChange={(e) => setDates((d) => ({ ...d, debut: e.target.value }))}
              />
            </div>
            <div>
              <Label>Période kiné (fin)</Label>
              <Input
                type="date"
                value={dates.fin}
                disabled={!canManage}
                onChange={(e) => setDates((d) => ({ ...d, fin: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Remarques</Label>
            <Input
              value={remarques}
              disabled={!canManage}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Ex. protocole, fréquence…"
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Joueurs du stage — prise en charge kiné</p>
              {canManage && (
                <Button type="button" size="sm" variant="secondary" onClick={applyAutoSelection}>
                  Sélection auto (séances sur la période)
                </Button>
              )}
            </div>
            {joueurs.length === 0 ? (
              <p className="text-muted">Ajoutez des joueurs dans l&apos;onglet Participants.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {sortedJoueurs.map((j) => {
                  const isSuggested = suggested.includes(j.id);
                  const checked = selected.has(j.id);
                  return (
                    <li key={j.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2",
                          checked
                            ? "border-frmt-green/40 bg-frmt-green/10"
                            : "border-[var(--border)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage}
                          onChange={() => toggleJoueur(j.id)}
                        />
                        <span className="flex-1 font-medium">
                          {j.prenom} {j.nom}
                        </span>
                        {isSuggested && (
                          <span className="text-xs text-sky-300">Séance(s) sur la période</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">
              {selected.size} joueur{selected.size !== 1 ? "s" : ""} sélectionné
              {selected.size !== 1 ? "s" : ""} · {suggested.length} avec séance kiné enregistrée sur la
              période
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer kinésithérapie"}
              </Button>
              <Link href={`/v2/kinesitherapie?stage=${stage.id}`}>
                <Button type="button" variant="secondary">
                  Ouvrir rubrique Kinésithérapie
                </Button>
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">Kinésithérapie non activée pour ce stage.</p>
      )}
    </div>
  );
}
