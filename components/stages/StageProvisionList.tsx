"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import type { StageProvisionSummary } from "@/lib/data/stage-besoins";
import { Trophy } from "lucide-react";

type Props = {
  summaries: StageProvisionSummary[];
  filter?: "hebergement" | "restauration" | "terrains" | "all";
  emptyMessage?: string;
};

export function StageProvisionList({
  summaries,
  filter = "all",
  emptyMessage = "Aucun besoin auto-créé par un stage pour le moment.",
}: Props) {
  const filtered = summaries.filter((s) => {
    if (filter === "hebergement") return !!s.hebergement;
    if (filter === "restauration") return s.besoins_restauration.length > 0;
    if (filter === "terrains") return s.reservations.length > 0;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <Card className="border-dashed p-4 text-sm text-muted">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-frmt-green">
        <Trophy className="h-4 w-4" />
        Provisions automatiques (stages)
      </div>
      {filtered.map(({ stage, hebergement, besoins_restauration, reservations, conflits }) => (
        <Card key={stage.id} className="border-frmt-green/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/stages/${stage.id}`}
                className="font-semibold hover:text-frmt-green hover:underline"
              >
                {stage.stage_action}
              </Link>
              <p className="text-sm text-muted">
                {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)} · {stage.categorie}
              </p>
              {(filter === "all" || filter === "hebergement") && hebergement ? (
                <p className="mt-1 text-sm">
                  Hébergement : {hebergement.chambres} chambres · {hebergement.nuitees} nuitées
                </p>
              ) : null}
              {(filter === "all" || filter === "restauration") &&
              besoins_restauration.length > 0 ? (
                <p className="mt-1 text-sm">
                  Restauration : {besoins_restauration.length} besoin(s) —{" "}
                  {besoins_restauration.map((b) => b.type_repas).join(", ")}
                </p>
              ) : null}
              {(filter === "all" || filter === "terrains") && reservations.length > 0 ? (
                <p className="mt-1 text-sm">
                  Terrains : {reservations.length} créneau(x) réservé(s)
                </p>
              ) : null}
              {conflits.length > 0 && (
                <Badge variant="danger" className="mt-2">
                  Conflit : {conflits[0]}
                </Badge>
              )}
            </div>
            <Badge variant={stage.statut === "confirme" ? "success" : "muted"}>
              {stage.statut}
            </Badge>
          </div>
        </Card>
      ))}
    </section>
  );
}
