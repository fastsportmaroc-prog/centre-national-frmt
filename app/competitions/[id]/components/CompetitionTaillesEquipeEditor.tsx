"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { PersonEquipementTaillesForm } from "@/components/v2/equipement/PersonEquipementTaillesForm";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { CompetitionParticipantEnriched } from "@/lib/types/competition";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type Props = {
  participants: CompetitionParticipantEnriched[];
  joueurs: JoueurV2[];
  coachs: EntraineurV2[];
  onJoueurUpdated: (j: JoueurV2) => void;
  onCoachUpdated: (c: EntraineurV2) => void;
};

export function CompetitionTaillesEquipeEditor({
  participants,
  joueurs,
  coachs,
  onJoueurUpdated,
  onCoachUpdated,
}: Props) {
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const out: {
      key: string;
      type: "joueur" | "coach";
      id: string;
      prenom: string;
      nom: string;
      poste: string;
    }[] = [];
    for (const p of participants) {
      if (p.participant_type === "joueur") {
        out.push({
          key: `j:${p.participant_id}`,
          type: "joueur",
          id: p.participant_id,
          prenom: p.prenom,
          nom: p.nom,
          poste: p.poste,
        });
      } else if (p.participant_type === "coach") {
        out.push({
          key: `c:${p.participant_id}`,
          type: "coach",
          id: p.participant_id,
          prenom: p.prenom,
          nom: p.nom,
          poste: "Coach",
        });
      }
    }
    return out.sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")
    );
  }, [participants]);

  const filtered = useMemo(() => {
    const q = normalize(filter.trim());
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = normalize(`${r.prenom} ${r.nom} ${r.poste}`);
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [rows, filter]);

  if (rows.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-amber-200">
          Aucun participant. Ajoutez joueurs et coaches dans l&apos;onglet{" "}
          <strong>Participants</strong>, puis revenez ici pour enregistrer leurs tailles.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold">Tailles textiles & chaussures — équipe</h3>
        <p className="mt-1 text-sm text-muted">
          Une fiche par personne : renseignez les tailles puis cliquez sur{" "}
          <strong>Enregistrer les tailles</strong> pour sauvegarder ses données.
        </p>
      </div>

      <div>
        <Label>Rechercher une personne</Label>
        <Input
          className="mt-1 max-w-md"
          placeholder="Nom, prénom…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const open = expandedId === row.key;
          const joueur =
            row.type === "joueur" ? joueurs.find((j) => j.id === row.id) : undefined;
          const coach =
            row.type === "coach" ? coachs.find((c) => c.id === row.id) : undefined;

          return (
            <div
              key={row.key}
              className={cn(
                "rounded-lg border border-[var(--border)]",
                open && "ring-1 ring-frmt-green/40"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <p className="font-medium">
                    {row.prenom} {row.nom}
                  </p>
                  <p className="text-xs text-muted">{row.poste}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={open ? "secondary" : "primary"}
                  onClick={() => setExpandedId(open ? null : row.key)}
                >
                  {open ? "Fermer" : "Renseigner / modifier les tailles"}
                </Button>
              </div>

              {open && joueur && (
                <div className="border-t border-[var(--border)] p-3">
                  <PersonEquipementTaillesForm
                    kind="joueur"
                    person={joueur}
                    editable
                    onSaved={(next) => {
                      onJoueurUpdated(next);
                      toast(`Tailles enregistrées — ${next.prenom} ${next.nom}`, "success");
                    }}
                  />
                </div>
              )}

              {open && coach && (
                <div className="border-t border-[var(--border)] p-3">
                  <PersonEquipementTaillesForm
                    kind="entraineur"
                    person={coach}
                    editable
                    onSaved={(next) => {
                      onCoachUpdated(next);
                      toast(`Tailles enregistrées — ${next.prenom} ${next.nom}`, "success");
                    }}
                  />
                </div>
              )}

              {open && !joueur && !coach && (
                <p className="border-t border-[var(--border)] p-3 text-sm text-amber-200">
                  Personne introuvable en base — vérifiez la fiche joueur / entraîneur.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted">Aucun résultat pour cette recherche.</p>
      )}
    </Card>
  );
}
