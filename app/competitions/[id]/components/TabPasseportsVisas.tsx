"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { mergeCompetitionParticipantsEnriched } from "@/lib/competitions/merge-participants-enriched";
import type { CompetitionParticipantEnriched } from "@/lib/types/competition";
import {
  passeportAlerteLabel,
  visaStatutLabel,
} from "@/lib/competitions/passeport-competition";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils/cn";

function alertClass(niveau: string) {
  if (niveau === "valide") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (niveau === "attention") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  if (niveau === "expire") return "border-red-500/40 bg-red-500/10 text-red-300";
  return "border-[var(--border)] bg-[var(--bg-main)] text-muted";
}

function visaClass(statut: string) {
  if (statut === "obtenu" || statut === "non_requis") return "border-emerald-500/40 bg-emerald-500/10";
  if (statut === "en_cours") return "border-amber-500/40 bg-amber-500/10";
  if (statut === "refuse") return "border-red-500/40 bg-red-500/10";
  return "border-[var(--border)]";
}

function displayName(p: CompetitionParticipantEnriched): string {
  const full = `${p.prenom ?? ""} ${p.nom ?? ""}`.trim();
  if (full && !/^inconnu$/i.test(full)) return full;
  if (p.nom && p.nom !== "Inconnu") return p.nom;
  return "—";
}

export function TabPasseportsVisas({
  competitionId,
  dateFin,
  visasRequis = false,
  refreshKey = 0,
}: {
  competitionId: string;
  dateFin: string;
  visasRequis?: boolean;
  refreshKey?: number;
}) {
  const [participants, setParticipants] = useState<CompetitionParticipantEnriched[]>([]);

  const load = useCallback(async () => {
    const [res, joueurs, coachs] = await Promise.all([
      fetch(
        `/api/competitions/${competitionId}/participants?date_fin=${encodeURIComponent(dateFin)}`
      ),
      getJoueurs(),
      getEntraineurs(),
    ]);
    const json = await res.json();
    const raw: CompetitionParticipantEnriched[] = json.participants ?? [];
    setParticipants(
      mergeCompetitionParticipantsEnriched(raw, joueurs, coachs, { dateFin, visasRequis })
    );
  }, [competitionId, dateFin, visasRequis]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {visasRequis
          ? "Suivi visa activé pour cette compétition (joueurs et coaches)."
          : "Compétition sans suivi visa — statut « Non requis » pour tous."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
      {participants.map((p) => (
        <Card key={p.id} className="p-4">
          <p className="font-medium">
            {displayName(p)}{" "}
            <span className="text-xs text-muted">
              ({p.participant_type === "coach" ? "Coach" : p.poste})
            </span>
          </p>
          {p.participant_type === "coach" && p.fonction ? (
            <p className="mt-0.5 text-xs text-muted">{p.fonction}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            Expiration passeport : {p.passeport_expiration ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                alertClass(p.passeport_alerte)
              )}
            >
              {passeportAlerteLabel(p.passeport_alerte)}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                visaClass(p.visa_statut)
              )}
            >
              Visa : {visaStatutLabel(p.visa_statut)}
            </span>
          </div>
        </Card>
      ))}
      {participants.length === 0 && (
        <p className="text-sm text-muted">Ajoutez des participants pour voir les alertes passeport/visa.</p>
      )}
      </div>
    </div>
  );
}
