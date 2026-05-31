import "server-only";

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  listBillets,
  listCompetitions,
  listParticipantsEnriched,
} from "@/lib/competitions/server";
import type {
  CompetitionDashboardCard,
  CompetitionDashboardSummary,
  CompetitionVisaUrgentRow,
} from "@/lib/competitions/dashboard-summary";

function logistiquePretPct(card: Omit<CompetitionDashboardCard, "pret_logistique_pct">): number {
  const tasks = [
    card.nb_participants > 0,
    !card.visas_requis || card.visas_a_prevoir === 0,
    card.passeports_alerte === 0,
    card.billets_en_attente === 0,
  ];
  return Math.round((tasks.filter(Boolean).length / tasks.length) * 100);
}

export async function getCompetitionDashboardSummary(): Promise<CompetitionDashboardSummary> {
  const empty: CompetitionDashboardSummary = {
    competitions: [],
    kpis: {
      actives: 0,
      avec_visas: 0,
      visas_a_prevoir: 0,
      passeports_critiques: 0,
      billets_en_attente: 0,
      participants_total: 0,
    },
    visasUrgents: [],
  };

  const { data: list, error } = await listCompetitions();
  if (error) return { ...empty, error };

  const today = new Date().toISOString().slice(0, 10);
  const active = list
    .filter((c) => c.statut !== "annulee" && c.date_fin.slice(0, 10) >= today)
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    .slice(0, 20);

  const cards: CompetitionDashboardCard[] = [];
  const visasUrgents: CompetitionVisaUrgentRow[] = [];

  await Promise.all(
    active.map(async (c) => {
      const [{ data: participants }, { data: billets }] = await Promise.all([
        listParticipantsEnriched(c.id, c.date_fin),
        listBillets(c.id),
      ]);

      const parts = participants ?? [];
      const visasRequis = c.visas_requis ?? false;
      const visas_a_prevoir = visasRequis
        ? parts.filter((p) => p.visa_statut === "inconnu" || p.visa_statut === "refuse").length
        : 0;
      const visas_en_cours = visasRequis
        ? parts.filter((p) => p.visa_statut === "en_cours").length
        : 0;
      const visas_obtenus = visasRequis
        ? parts.filter((p) => p.visa_statut === "obtenu" || p.visa_statut === "non_requis").length
        : parts.length;
      const passeports_alerte = parts.filter(
        (p) =>
          p.passeport_alerte === "expire" ||
          p.passeport_alerte === "attention" ||
          p.passeport_alerte === "inconnu"
      ).length;
      const billets_en_attente = (billets ?? []).filter((b) => b.statut === "en_attente").length;

      const start = parseISO(
        c.date_debut.includes("T") ? c.date_debut : `${c.date_debut.slice(0, 10)}T12:00:00`
      );
      const jours_avant = differenceInCalendarDays(start, new Date());

      const base = {
        id: c.id,
        nom: c.nom,
        categorie: c.categorie,
        date_debut: c.date_debut,
        date_fin: c.date_fin,
        lieu: c.lieu,
        statut_affichage: c.statut_affichage,
        visas_requis: visasRequis,
        nb_participants: parts.length,
        visas_a_prevoir,
        visas_en_cours,
        visas_obtenus,
        passeports_alerte,
        billets_en_attente,
        jours_avant,
      };

      cards.push({
        ...base,
        pret_logistique_pct: logistiquePretPct(base),
      });

      if (visasRequis) {
        for (const p of parts) {
          const visaUrgent =
            p.visa_statut === "inconnu" ||
            p.visa_statut === "refuse" ||
            p.visa_statut === "en_cours";
          const passeportUrgent =
            p.passeport_alerte === "expire" ||
            p.passeport_alerte === "attention" ||
            p.passeport_alerte === "inconnu";
          if (!visaUrgent && !passeportUrgent) continue;
          if (p.participant_type !== "joueur" && p.participant_type !== "coach") continue;
          visasUrgents.push({
            competition_id: c.id,
            competition_nom: c.nom,
            date_fin: c.date_fin,
            participant_id: p.participant_id,
            participant_type: p.participant_type,
            nom: p.nom,
            prenom: p.prenom,
            poste: p.poste,
            visa_statut: p.visa_statut,
            passeport_alerte: p.passeport_alerte,
          });
        }
      }
    })
  );

  cards.sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  visasUrgents.sort((a, b) => {
    const score = (r: CompetitionVisaUrgentRow) => {
      let s = 0;
      if (r.visa_statut === "refuse") s += 100;
      if (r.visa_statut === "inconnu") s += 80;
      if (r.passeport_alerte === "expire") s += 60;
      if (r.visa_statut === "en_cours") s += 40;
      if (r.passeport_alerte === "attention") s += 30;
      if (r.passeport_alerte === "inconnu") s += 20;
      return s;
    };
    return score(b) - score(a) || a.date_fin.localeCompare(b.date_fin);
  });

  return {
    competitions: cards,
    kpis: {
      actives: cards.length,
      avec_visas: cards.filter((c) => c.visas_requis).length,
      visas_a_prevoir: cards.reduce((s, c) => s + c.visas_a_prevoir, 0),
      passeports_critiques: cards.reduce((s, c) => s + c.passeports_alerte, 0),
      billets_en_attente: cards.reduce((s, c) => s + c.billets_en_attente, 0),
      participants_total: cards.reduce((s, c) => s + c.nb_participants, 0),
    },
    visasUrgents: visasUrgents.slice(0, 24),
  };
}
