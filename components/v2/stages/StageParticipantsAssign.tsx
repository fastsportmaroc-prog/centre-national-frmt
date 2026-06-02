"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import {
  assignCoachToStageAction,
  assignCoachsToStageAction,
  assignJoueurToStageAction,
  assignJoueursToStageAction,
  getStageParticipantCatalogAction,
  getStageParticipantsAction,
  removeCoachFromStageAction,
  removeJoueurFromStageAction,
} from "@/lib/actions/stage-participants-actions";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import type { EntraineurV2, JoueurV2, StageProgrammeV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function personLabel(prenom: string | null | undefined, nom: string | null | undefined): string {
  return [prenom, nom].filter(Boolean).join(" ").trim() || "Sans nom";
}

function matchesName(
  prenom: string | null | undefined,
  nom: string | null | undefined,
  rawQuery: string
): boolean {
  const q = normalize(rawQuery.trim());
  if (!q) return false;
  const hay = normalize(personLabel(prenom, nom));
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

function stagePhaseLabel(stage: StageProgrammeV2): { label: string; statut: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (stage.date_fin < today || stage.statut === "termine") {
    return { label: "Stage passé", statut: "termine" };
  }
  if (stage.date_debut <= today && stage.date_fin >= today) {
    return { label: "Stage en cours", statut: "confirme" };
  }
  return { label: "Stage prévu", statut: "prevu" };
}

type PersonRow = {
  id: string;
  prenom: string | null | undefined;
  nom: string | null | undefined;
  extra?: string;
};

function PersonAssignBlock({
  title,
  icon: Icon,
  assigned,
  catalog,
  canManage,
  onAssignOne,
  onAssignMany,
  onRemove,
  profileHref,
  extraColumn,
}: {
  title: string;
  icon: typeof Users;
  assigned: PersonRow[];
  catalog: PersonRow[];
  canManage: boolean;
  onAssignOne: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onAssignMany: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (id: string, name: string) => Promise<void>;
  profileHref: (id: string) => string;
  extraColumn?: (row: PersonRow) => React.ReactNode;
}) {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.id)), [assigned]);

  const available = useMemo(
    () => catalog.filter((p) => !assignedIds.has(p.id)),
    [catalog, assignedIds]
  );

  const showResults = open && query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return available.filter((p) => matchesName(p.prenom, p.nom, query)).slice(0, 30);
  }, [available, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function handleAssignOne(id: string) {
    setBusy(true);
    const res = await onAssignOne(id);
    setBusy(false);
    if (res.ok) {
      setQuery("");
      setSelected(new Set());
      setOpen(false);
    }
    return res;
  }

  async function handleAssignSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    const res = await onAssignMany(ids);
    setBusy(false);
    if (res.ok) {
      setQuery("");
      setSelected(new Set());
      setOpen(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {title} ({assigned.length})
      </h4>

      {canManage && (
        <div ref={wrapRef} className="relative space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3">
          <Label htmlFor={inputId} className="text-xs">
            Ajouter {title.toLowerCase()}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id={inputId}
              className="pl-9"
              value={query}
              disabled={busy}
              placeholder="Tapez un nom ou prénom pour afficher les résultats…"
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            />

            {showResults && (
              <ul
                className="absolute z-[80] mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl"
                role="listbox"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                    {available.length === 0
                      ? "Toutes les personnes sont déjà affectées à ce stage"
                      : "Aucune personne trouvée pour cette recherche"}
                  </li>
                ) : (
                  filtered.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 border-b border-[var(--border)]/60 px-2 py-2 last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="shrink-0 rounded border-border"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        disabled={busy}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        role="option"
                        className="flex-1 text-left text-sm text-[var(--text-primary)] hover:text-frmt-green"
                        disabled={busy}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void handleAssignOne(p.id)}
                      >
                        <span className="font-medium">
                          {personLabel(p.prenom, p.nom)}
                        </span>
                        {p.extra && (
                          <span className="ml-2 text-xs text-[var(--text-muted)]">{p.extra}</span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {showResults && selected.size > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
              <span className="text-xs text-[var(--text-muted)]">{selected.size} sélectionné(s)</span>
              <Button size="sm" disabled={busy} onClick={() => void handleAssignSelected()}>
                <UserPlus className="h-3.5 w-3.5" />
                Affecter la sélection
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="v2-data-table w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Nom</th>
              {extraColumn && <th className="p-2 text-left">Détail</th>}
              {canManage && <th className="p-2 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {assigned.map((p) => (
              <tr key={p.id}>
                <td className="p-2">
                  <Link href={profileHref(p.id)} className="hover:text-frmt-green">
                    {p.prenom} {p.nom}
                  </Link>
                </td>
                {extraColumn && <td className="p-2">{extraColumn(p)}</td>}
                {canManage && (
                  <td className="p-2 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void onRemove(p.id, `${p.prenom} ${p.nom}`)
                      }
                      title="Retirer du stage"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      Retirer
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {assigned.length === 0 && (
              <tr>
                <td
                  colSpan={extraColumn ? (canManage ? 3 : 2) : canManage ? 2 : 1}
                  className="p-4 text-center text-muted"
                >
                  Aucune personne affectée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ParticipantMutationResult = {
  ok: boolean;
  error?: string;
  joueurs?: JoueurV2[];
  coachs?: EntraineurV2[];
};

type Props = {
  stage: StageProgrammeV2;
  joueurs: JoueurV2[];
  coachs: EntraineurV2[];
  canManage: boolean;
  onParticipantsChange: (joueurs: JoueurV2[], coachs: EntraineurV2[]) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
};

export function StageParticipantsAssign({
  stage,
  joueurs,
  coachs,
  canManage,
  onParticipantsChange,
  toast,
}: Props) {
  const [catalogJoueurs, setCatalogJoueurs] = useState<JoueurV2[]>([]);
  const [catalogCoachs, setCatalogCoachs] = useState<EntraineurV2[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const phase = stagePhaseLabel(stage);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      let [j, c] = await Promise.all([getJoueurs(), getEntraineurs()]);
      if (j.length === 0 && c.length === 0) {
        const fallback = await getStageParticipantCatalogAction();
        j = fallback.joueurs;
        c = fallback.coachs;
      }
      setCatalogJoueurs(j);
      setCatalogCoachs(c);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const joueurRows: PersonRow[] = joueurs.map((j) => ({
    id: j.id,
    prenom: j.prenom,
    nom: j.nom,
    extra: j.categorie_age ?? undefined,
  }));

  const catalogJoueurRows: PersonRow[] = catalogJoueurs.map((j) => ({
    id: j.id,
    prenom: j.prenom,
    nom: j.nom,
    extra: j.categorie_age ?? undefined,
  }));

  const coachRows: PersonRow[] = coachs.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    extra: c.specialite ?? undefined,
  }));

  const catalogCoachRows: PersonRow[] = catalogCoachs.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    extra: c.specialite ?? undefined,
  }));

  async function afterMutation(res: ParticipantMutationResult, successMsg: string) {
    if (res.ok) {
      toast(successMsg, "success");
      if (res.joueurs && res.coachs) {
        onParticipantsChange(res.joueurs, res.coachs);
      } else {
        const fresh = await getStageParticipantsAction(stage.id);
        onParticipantsChange(fresh.joueurs, fresh.coachs);
      }
    } else {
      toast(res.error ?? "Échec de l'opération", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
          "border-[var(--border)] bg-[var(--bg-elevated)]/30"
        )}
      >
        <p className="text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">
            {joueurs.length} joueur{joueurs.length !== 1 ? "s" : ""} · {coachs.length} coach
            {coachs.length !== 1 ? "s" : ""}
          </span>
          {" "}
          — affectez des personnes depuis la recherche ci-dessous.
        </p>
        <span className="inline-flex items-center gap-2">
          <StatusBadge statut={phase.statut} />
          <span className="text-xs text-[var(--text-muted)]">{phase.label}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/v2/groupes?stage=${stage.id}`}>
          <Button type="button" variant="secondary">
            Ouvrir rubrique Groupes
          </Button>
        </Link>
      </div>

      {catalogLoading && canManage && (
        <p className="text-xs text-[var(--text-muted)]">Chargement de la liste des joueurs et du staff…</p>
      )}

      <PersonAssignBlock
        title="Joueurs"
        icon={Users}
        assigned={joueurRows}
        catalog={catalogJoueurRows}
        canManage={canManage && !catalogLoading}
        profileHref={(id) => `/v2/joueurs/${id}`}
        extraColumn={(p) => {
          const j = joueurs.find((x) => x.id === p.id);
          return j ? <StatusBadge statut={j.statut ?? "actif"} /> : "—";
        }}
        onAssignOne={async (id) => {
          const res = await assignJoueurToStageAction(stage.id, id);
          await afterMutation(res, "Joueur affecté au stage");
          return res;
        }}
        onAssignMany={async (ids) => {
          const res = await assignJoueursToStageAction(stage.id, ids);
          await afterMutation(res, `${res.linked ?? ids.length} joueur(s) affecté(s)`);
          return res;
        }}
        onRemove={async (id, name) => {
          if (!confirm(`Retirer ${name} de ce stage ?`)) return;
          const res = await removeJoueurFromStageAction(stage.id, id);
          await afterMutation(res, "Joueur retiré du stage");
        }}
      />

      <PersonAssignBlock
        title="Staff / entraîneurs"
        icon={Users}
        assigned={coachRows}
        catalog={catalogCoachRows}
        canManage={canManage && !catalogLoading}
        profileHref={(id) => `/v2/entraineurs/${id}`}
        onAssignOne={async (id) => {
          const res = await assignCoachToStageAction(stage.id, id);
          await afterMutation(res, "Membre du staff affecté au stage");
          return res;
        }}
        onAssignMany={async (ids) => {
          const res = await assignCoachsToStageAction(stage.id, ids);
          await afterMutation(res, `${res.linked ?? ids.length} membre(s) affecté(s)`);
          return res;
        }}
        onRemove={async (id, name) => {
          if (!confirm(`Retirer ${name} de ce stage ?`)) return;
          const res = await removeCoachFromStageAction(stage.id, id);
          await afterMutation(res, "Membre du staff retiré du stage");
        }}
      />
    </div>
  );
}
