"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addExternalHebergementParticipantAction,
  bulkSaveHebergementParticipantsAction,
  getInterneChambresAction,
  getStageHebergementParticipantsAction,
  removeHebergementParticipantAction,
  saveHebergementParticipantAction,
} from "@/lib/actions/stage-logistique-participants-actions";
import type { HebergementParticipantRow, InterneChambreV2 } from "@/lib/types/v2";
import {
  calcNuits,
  daysAfterStage,
  daysBeforeStage,
  personInitials,
} from "@/lib/v2/stage-logistique-ui";
import { cn } from "@/lib/utils/cn";

type Props = {
  stageId: string;
  stageDateDebut: string;
  stageDateFin: string;
  disabled?: boolean;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function ParticipantTable({
  title,
  rows,
  stageDebut,
  stageFin,
  chambres,
  disabled,
  saveState,
  onUpdate,
  onToggleHeberge,
  onRemoveReservation,
}: {
  title: string;
  rows: HebergementParticipantRow[];
  stageDebut: string;
  stageFin: string;
  chambres: InterneChambreV2[];
  disabled?: boolean;
  saveState: Record<string, SaveState>;
  onUpdate: (p: HebergementParticipantRow, patch: Partial<HebergementParticipantRow>) => void;
  onToggleHeberge: (p: HebergementParticipantRow) => void;
  onRemoveReservation: (p: HebergementParticipantRow) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--bg-elevated)]/80 text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Participant</th>
              <th className="px-3 py-2">Hébergé</th>
              <th className="px-3 py-2">Arrivée</th>
              <th className="px-3 py-2">Départ</th>
              <th className="px-3 py-2">Chambre</th>
              <th className="px-3 py-2">Nuits</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const key = p.id ?? `${p.participant_type}:${p.participant_id ?? ""}`;
              const st = saveState[key] ?? "idle";
              const early = p.date_arrivee < stageDebut;
              const late = p.date_depart > stageFin;
              return (
                <tr
                  key={key}
                  className={cn(
                    "border-t border-[var(--border)]/60",
                    !p.heberge && "opacity-50"
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-frmt-green/20 text-xs font-bold text-frmt-green">
                        {personInitials(p.nom ?? "", p.prenom ?? "")}
                      </div>
                      <div>
                        <div className="font-medium">
                          {p.nom} {p.prenom}
                        </div>
                        <div className="text-[10px] uppercase text-[var(--text-muted)]">{p.meta}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleHeberge(p)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition",
                        p.heberge
                          ? "bg-frmt-green/20 text-frmt-green"
                          : "bg-red-500/15 text-red-400"
                      )}
                    >
                      {p.heberge ? "🏠 Hébergé" : "🚫 Non hébergé"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      disabled={disabled || !p.heberge}
                      value={p.date_arrivee}
                      max={p.date_depart}
                      onChange={(e) => onUpdate(p, { date_arrivee: e.target.value })}
                      className={cn(
                        "text-xs",
                        early && "border-amber-500/60 ring-1 ring-amber-500/30"
                      )}
                    />
                    {early && p.heberge && (
                      <p className="mt-0.5 text-[10px] text-amber-500">
                        Arrivée anticipée ({daysBeforeStage(p.date_arrivee, stageDebut)} j.)
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      disabled={disabled || !p.heberge}
                      value={p.date_depart}
                      min={p.date_arrivee}
                      onChange={(e) => onUpdate(p, { date_depart: e.target.value })}
                      className={cn(
                        "text-xs",
                        late && "border-sky-500/60 ring-1 ring-sky-500/30"
                      )}
                    />
                    {late && p.heberge && (
                      <p className="mt-0.5 text-[10px] text-sky-400">
                        Départ tardif (+{daysAfterStage(p.date_depart, stageFin)} j.)
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={disabled || !p.heberge}
                      value={p.chambre_id ?? ""}
                      onChange={(e) =>
                        onUpdate(p, { chambre_id: e.target.value || null })
                      }
                      className="w-full min-w-[120px] rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-1.5 text-xs"
                    >
                      <option value="">— Non assigné —</option>
                      {chambres.map((c) => (
                        <option key={c.id} value={c.id}>
                          Ch. {c.numero}
                          {c.batiment ? ` · ${c.batiment}` : ""} ({c.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-xs font-medium">
                      {calcNuits(p.date_arrivee, p.date_depart)} nuits
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={disabled || !p.heberge}
                      value={p.statut}
                      onChange={(e) =>
                        onUpdate(p, {
                          statut: e.target.value as HebergementParticipantRow["statut"],
                        })
                      }
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-1 text-xs"
                    >
                      <option value="confirmé">confirmé</option>
                      <option value="en attente">en attente</option>
                      <option value="annulé">annulé</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <div className="flex items-center justify-center gap-1">
                      {st === "saving" && <span title="Enregistrement">💾</span>}
                      {st === "saved" && <span className="text-frmt-green" title="Enregistré">✓</span>}
                      {st === "error" && <span className="text-red-400" title="Erreur">!</span>}
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => onRemoveReservation(p)}
                          className="rounded p-1 text-red-400 hover:bg-red-500/10"
                          title="Supprimer cette réservation d'hébergement"
                          aria-label="Supprimer réservation hébergement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HebergementParticipantsTab({
  stageId,
  stageDateDebut,
  stageDateFin,
  disabled,
  toast,
}: Props) {
  const [participants, setParticipants] = useState<HebergementParticipantRow[]>([]);
  const [chambres, setChambres] = useState<InterneChambreV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [extNom, setExtNom] = useState("");
  const [extPrenom, setExtPrenom] = useState("");
  const [extArrivee, setExtArrivee] = useState(stageDateDebut);
  const [extDepart, setExtDepart] = useState(stageDateFin);
  const [extChambreId, setExtChambreId] = useState("");
  const [extBusy, setExtBusy] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const [data, rooms] = await Promise.all([
      getStageHebergementParticipantsAction(stageId),
      getInterneChambresAction(),
    ]);
    if (data) setParticipants(data.participants);
    setChambres(rooms);
    setLoading(false);
  }, [stageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const heberges = participants.filter((p) => p.heberge);
    const nonHeberges = participants.length - heberges.length;
    const chambresSet = new Set(heberges.map((p) => p.chambre_id).filter(Boolean));
    const early = heberges.filter((p) => p.date_arrivee < stageDateDebut).length;
    const late = heberges.filter((p) => p.date_depart > stageDateFin).length;
    return { heberges: heberges.length, nonHeberges, chambres: chambresSet.size, early, late };
  }, [participants, stageDateDebut, stageDateFin]);

  const joueurs = participants.filter((p) => p.participant_type === "joueur");
  const coachs = participants.filter((p) => p.participant_type === "coach");
  const externes = participants.filter((p) => p.participant_type === "hors_participant");

  function scheduleSave(updated: HebergementParticipantRow) {
    const key = updated.id ?? `${updated.participant_type}:${updated.participant_id ?? ""}`;
    const prev = timers.current.get(key);
    if (prev) clearTimeout(prev);
    setSaveState((s) => ({ ...s, [key]: "saving" }));
    timers.current.set(
      key,
      setTimeout(() => {
        void saveHebergementParticipantAction(updated).then((res) => {
          setSaveState((s) => ({
            ...s,
            [key]: res.ok ? "saved" : "error",
          }));
          if (!res.ok) toast(res.error ?? "Erreur enregistrement", "error");
        });
      }, 800)
    );
  }

  function patchParticipant(
    p: HebergementParticipantRow,
    patch: Partial<HebergementParticipantRow>
  ) {
    const next = { ...p, ...patch };
    setParticipants((list) =>
      list.map((row) =>
        row.participant_id === p.participant_id && row.participant_type === p.participant_type
          ? next
          : row
      )
    );
    scheduleSave(next);
  }

  async function removeReservation(p: HebergementParticipantRow) {
    if (p.participant_type !== "hors_participant") {
      patchParticipant(p, {
        heberge: false,
        statut: "annulé",
        chambre_id: null,
      });
      toast("Participant retiré de l'hébergement", "success");
      return;
    }
    const res = await removeHebergementParticipantAction({
      stageId: stageId,
      participantType: p.participant_type,
      participantId: p.participant_id,
      rowId: p.id,
    });
    if (!res.ok) {
      toast(res.error ?? "Erreur suppression", "error");
      return;
    }
    setParticipants((list) =>
      list.filter((row) => {
        if (p.id && row.id) return row.id !== p.id;
        return true;
      })
    );
    toast("Hors participant supprimé de l'hébergement", "success");
  }

  function toggleHeberge(p: HebergementParticipantRow) {
    patchParticipant(p, {
      heberge: !p.heberge,
      statut: !p.heberge ? "annulé" : "confirmé",
    });
  }

  async function applyBulk(
    mapper: (p: HebergementParticipantRow) => HebergementParticipantRow
  ) {
    setBulkBusy(true);
    const next = participants.map(mapper);
    setParticipants(next);
    const res = await bulkSaveHebergementParticipantsAction(stageId, next);
    setBulkBusy(false);
    if (res.ok) toast("Hébergement participants enregistré", "success");
    else toast(res.error ?? "Erreur", "error");
  }

  async function addExternalParticipant() {
    if (!extNom.trim()) {
      toast("Nom obligatoire", "error");
      return;
    }
    if (!extArrivee || !extDepart || extArrivee > extDepart) {
      toast("Dates invalides", "error");
      return;
    }
    setExtBusy(true);
    const res = await addExternalHebergementParticipantAction({
      stageId,
      nom: extNom.trim(),
      prenom: extPrenom.trim() || undefined,
      dateArrivee: extArrivee,
      dateDepart: extDepart,
      chambreId: extChambreId || null,
    });
    setExtBusy(false);
    if (!res.ok) {
      toast(res.error ?? "Erreur ajout hors participant", "error");
      return;
    }
    setExtNom("");
    setExtPrenom("");
    setExtArrivee(stageDateDebut);
    setExtDepart(stageDateFin);
    setExtChambreId("");
    await load();
    toast("Hors participant ajouté à l'hébergement", "success");
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Chargement des participants…</p>;
  }

  if (participants.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Affectez des joueurs et du staff dans l&apos;onglet Participants.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-frmt-green/15 px-3 py-1 text-frmt-green">
          {summary.heberges} hébergé(s)
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1">
          {summary.nonHeberges} non hébergé(s)
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1">
          {summary.chambres} chambre(s) assignée(s)
        </span>
        {summary.early > 0 && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-500">
            {summary.early} arrivée(s) anticipée(s)
          </span>
        )}
        {summary.late > 0 && (
          <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-400">
            {summary.late} départ(s) tardif(s)
          </span>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={bulkBusy}
            onClick={() =>
              void applyBulk((p) => ({ ...p, heberge: true, statut: "confirmé" }))
            }
          >
            Tous hébergés
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={bulkBusy}
            onClick={() =>
              void applyBulk((p) => ({ ...p, heberge: false, statut: "annulé" }))
            }
          >
            Aucun hébergé
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={bulkBusy}
            onClick={() =>
              void applyBulk((p) => ({
                ...p,
                date_arrivee: stageDateDebut,
                heberge: p.heberge,
              }))
            }
          >
            Arrivée = début stage
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={bulkBusy}
            onClick={() =>
              void applyBulk((p) => ({
                ...p,
                date_depart: stageDateFin,
                heberge: p.heberge,
              }))
            }
          >
            Départ = fin stage
          </Button>
        </div>
      )}

      {!disabled && (
        <div className="space-y-2 rounded-lg border border-dashed border-[var(--border)] p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Ajouter un hors participant (hébergement uniquement)
          </h4>
          <div className="grid gap-2 sm:grid-cols-6">
            <Input
              placeholder="Nom"
              value={extNom}
              onChange={(e) => setExtNom(e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Prénom"
              value={extPrenom}
              onChange={(e) => setExtPrenom(e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              type="date"
              value={extArrivee}
              onChange={(e) => setExtArrivee(e.target.value)}
            />
            <Input
              type="date"
              value={extDepart}
              onChange={(e) => setExtDepart(e.target.value)}
            />
            <select
              value={extChambreId}
              onChange={(e) => setExtChambreId(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-1.5 text-xs sm:col-span-2"
            >
              <option value="">— Chambre (optionnel) —</option>
              {chambres.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch. {c.numero}
                  {c.batiment ? ` · ${c.batiment}` : ""} ({c.type})
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <Button size="sm" disabled={extBusy} onClick={() => void addExternalParticipant()}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {extBusy ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ParticipantTable
        title="Joueurs"
        rows={joueurs}
        stageDebut={stageDateDebut}
        stageFin={stageDateFin}
        chambres={chambres}
        disabled={disabled}
        saveState={saveState}
        onUpdate={patchParticipant}
        onToggleHeberge={toggleHeberge}
        onRemoveReservation={removeReservation}
      />

      <ParticipantTable
        title="Coachs"
        rows={coachs}
        stageDebut={stageDateDebut}
        stageFin={stageDateFin}
        chambres={chambres}
        disabled={disabled}
        saveState={saveState}
        onUpdate={patchParticipant}
        onToggleHeberge={toggleHeberge}
        onRemoveReservation={removeReservation}
      />

      <ParticipantTable
        title="Hors participants"
        rows={externes}
        stageDebut={stageDateDebut}
        stageFin={stageDateFin}
        chambres={chambres}
        disabled={disabled}
        saveState={saveState}
        onUpdate={patchParticipant}
        onToggleHeberge={toggleHeberge}
        onRemoveReservation={removeReservation}
      />
    </div>
  );
}
