"use client";

import { Card } from "@/components/ui/Card";
import type { StageProgramme } from "@/lib/types/stages";
import type { StageLogistiquePack } from "@/lib/types/stage-logistique";
import {
  calculateAccommodationNeeds,
  calculateMealNeeds,
  calculateStageParticipants,
  creneauHoraires,
} from "@/lib/stages/stage-calculations";
import { getJoueurs } from "@/lib/data/joueurs";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { useEffect, useState } from "react";

type Props = {
  stage: StageProgramme;
  logistique: StageLogistiquePack | null;
  infraLabels: string[];
};

export function StageDetailSections({ stage, logistique, infraLabels }: Props) {
  const [joueurLabels, setJoueurLabels] = useState<string[]>([]);
  const [coachLabels, setCoachLabels] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getJoueurs(), getEntraineurs()]).then(([joueurs, coaches]) => {
      const ids = logistique?.joueur_ids ?? [];
      const cids = logistique?.entraineur_ids.length
        ? logistique.entraineur_ids
        : stage.entraineur_ids;
      setJoueurLabels(
        ids.map((id) => {
          const j = joueurs.find((x) => x.id === id);
          return j ? `${j.prenom} ${j.nom}` : id;
        })
      );
      setCoachLabels(
        cids.map((id) => {
          const c = coaches.find((x) => x.id === id);
          return c ? `${c.prenom} ${c.nom}` : id;
        })
      );
    });
  }, [logistique, stage.entraineur_ids]);

  const rawParticipants = calculateStageParticipants(
    logistique?.joueur_ids ?? [],
    logistique?.entraineur_ids.length ? logistique.entraineur_ids : stage.entraineur_ids
  );
  const participants =
    rawParticipants.total > 0
      ? rawParticipants
      : {
          joueurs: stage.nombre_joueurs,
          coachs: stage.nombre_encadrants,
          total: stage.nombre_joueurs + stage.nombre_encadrants,
        };

  const hebergement = logistique?.hebergement;
  const restauration = logistique?.restauration;
  const terrains = logistique?.terrains;
  const acc =
    hebergement?.actif &&
    calculateAccommodationNeeds(hebergement, participants.joueurs, participants.coachs);
  const meals =
    restauration?.actif && calculateMealNeeds(restauration, participants.total);
  const horaires = terrains?.actif
    ? creneauHoraires(terrains.creneau, {
        debut: terrains.heure_debut,
        fin: terrains.heure_fin,
      })
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="premium p-5">
        <h3 className="mb-3 font-semibold">Participants</h3>
        <p className="text-sm">
          <span className="text-muted">Joueurs :</span>{" "}
          {joueurLabels.length ? joueurLabels.join(", ") : `${participants.joueurs} (nombre)`}
        </p>
        <p className="text-sm mt-2">
          <span className="text-muted">Coachs / staff :</span>{" "}
          {coachLabels.length ? coachLabels.join(", ") : `${participants.coachs} (nombre)`}
        </p>
        <p className="text-sm mt-2 font-medium">Total : {participants.total}</p>
      </Card>

      {hebergement?.actif && acc && (
        <Card className="premium p-5">
          <h3 className="mb-3 font-semibold">Hébergement — Oui</h3>
          <ul className="text-sm space-y-1 text-muted">
            <li>
              {hebergement.date_debut} → {hebergement.date_fin}
            </li>
            <li>
              Joueurs {hebergement.type_chambre_joueurs} : {acc.chambres_joueurs} ch.
            </li>
            <li>
              Staff {hebergement.type_chambre_staff} : {acc.chambres_staff} ch.
            </li>
            {hebergement.kitchenette && (
              <li>Kitchenette : {acc.chambres_kitchenette} ch.</li>
            )}
            <li className="font-medium text-foreground">
              Total {acc.total_chambres} chambres · {acc.total_nuitees} nuitées
            </li>
            {hebergement.remarques && <li>{hebergement.remarques}</li>}
          </ul>
        </Card>
      )}

      {restauration?.actif && meals && (
        <Card className="premium p-5">
          <h3 className="mb-3 font-semibold">Restauration — Oui</h3>
          <ul className="text-sm space-y-1 text-muted">
            <li>
              {restauration.date_debut} → {restauration.date_fin}
            </li>
            {restauration.petit_dejeuner && <li>Petit-déjeuner : {meals.petits_dejeuners}</li>}
            {restauration.dejeuner && <li>Déjeuner : {meals.dejeuners}</li>}
            {restauration.diner && <li>Dîner : {meals.diners}</li>}
            <li className="font-medium text-foreground">Total repas : {meals.total_repas}</li>
            {restauration.allergies && <li>Allergies : {restauration.allergies}</li>}
          </ul>
        </Card>
      )}

      {terrains?.actif && (
        <Card className="premium p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Courts / planning</h3>
          <ul className="text-sm space-y-1 text-muted">
            <li>
              {terrains.nombre_courts} court(s) · surface {terrains.surface} · créneau{" "}
              {terrains.creneau}
            </li>
            {horaires && (
              <li>
                Horaires : {horaires.debut} — {horaires.fin}
              </li>
            )}
            <li>Courts : {infraLabels.join(", ") || "—"}</li>
            {logistique?.dernier_provisionnement?.conflits.length ? (
              <li className="text-amber-300">
                Conflits : {logistique.dernier_provisionnement.conflits.join(" · ")}
              </li>
            ) : null}
          </ul>
        </Card>
      )}
    </div>
  );
}
