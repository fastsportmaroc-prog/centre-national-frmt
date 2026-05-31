"use client";

import { Card } from "@/components/ui/Card";
import type { ParticipantResume } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionParticipants({ participants }: { participants: ParticipantResume[] }) {
  const joueurs = participants.filter((p) => p.role === "joueur");
  const staff = participants.filter((p) => p.role !== "joueur");

  return (
    <Card className="space-y-4 p-4" id="section-participants">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.participants}</h2>
      <div className="flex gap-4 text-sm">
        <span>{joueurs.length} joueur(s)</span>
        <span>{staff.length} encadrant(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
              <th className="pb-2 pr-4">Nom</th>
              <th className="pb-2 pr-4">Rôle</th>
              <th className="pb-2 pr-4">Catégorie</th>
              <th className="pb-2">Présence</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]/50">
                <td className="py-2 pr-4">{p.prenom} {p.nom}</td>
                <td className="py-2 pr-4 capitalize">{p.role}</td>
                <td className="py-2 pr-4">{p.categorie ?? "—"}</td>
                <td className="py-2">{p.presence_pct != null ? `${p.presence_pct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
