import { getBilletsAvion } from "@/lib/data/billets";
import { getBesoinsRestauration } from "@/lib/data/restauration";
import { getOccupationAlertes, getOccupationCentreResume } from "@/lib/data/occupation-cne";
import { getPasseportVisaAlertes } from "@/lib/data/passeport";
import { getMateriels } from "@/lib/data/materiel";
import { getStagesProgramme } from "@/lib/data/stages";

export type FrmtInsight = {
  id: string;
  level: "info" | "warn" | "error";
  title: string;
  message: string;
  href?: string;
};

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function getFrmtInsights(): Promise<FrmtInsight[]> {
  const [stages, alertes, resume, billets, besoins, passeportAlertes, materiels] =
    await Promise.all([
      getStagesProgramme(),
      getOccupationAlertes(),
      getOccupationCentreResume(),
      getBilletsAvion(),
      getBesoinsRestauration(),
      getPasseportVisaAlertes(),
      getMateriels(),
    ]);

  const insights: FrmtInsight[] = [];
  const today = new Date().toISOString().split("T")[0]!;

  if (resume.alertes_surcharge > 0) {
    insights.push({
      id: "occ-surcharge",
      level: "error",
      title: "Surcharge hébergement",
      message: `${resume.alertes_surcharge} chambre(s) en surcharge aujourd'hui.`,
      href: "/occupation",
    });
  }

  if (resume.taux_chambres_pct >= 85) {
    insights.push({
      id: "occ-high",
      level: "warn",
      title: "Occupation élevée",
      message: `Taux chambres ${resume.taux_chambres_pct}% — anticiper les affectations.`,
      href: "/occupation",
    });
  }

  for (const a of alertes.slice(0, 3)) {
    if (a.alerte) {
      insights.push({
        id: `occ-${a.id}`,
        level: "warn",
        title: "Alerte chambre",
        message: a.alerte,
        href: "/occupation",
      });
    }
  }

  const upcoming = stages.filter((s) => s.date_fin >= today);
  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const a = upcoming[i]!;
      const b = upcoming[j]!;
      if (
        a.hebergement &&
        b.hebergement &&
        overlap(a.date_debut, a.date_fin, b.date_debut, b.date_fin)
      ) {
        const totalChambres = a.chambres + b.chambres;
        if (totalChambres > 15) {
          insights.push({
            id: `conflict-${a.id}-${b.id}`,
            level: "warn",
            title: "Conflit planning stages",
            message: `"${a.stage_action}" et "${b.stage_action}" se chevauchent (${totalChambres} ch. demandées).`,
            href: "/stages",
          });
        }
      }
    }
  }

  for (const a of passeportAlertes.slice(0, 5)) {
    insights.push({
      id: a.id,
      level: a.severite === "expire" ? "error" : "warn",
      title: a.type === "passeport" ? "Passeport" : `Visa ${a.pays ?? ""}`.trim(),
      message: `${a.joueur_nom} — ${a.message}`,
      href: `/passeport?joueur=${a.joueur_id}`,
    });
  }

  const billetsAttente = billets.filter((b) => b.statut === "en_attente");
  if (billetsAttente.length > 0) {
    insights.push({
      id: "billets-attente",
      level: "info",
      title: "Billets en attente d'accord",
      message: `${billetsAttente.length} demande(s) à valider (prix + retour).`,
      href: "/billets-avion",
    });
  }

  const besoinsActifs = besoins.filter((b) => !["paye", "annule", "brouillon"].includes(b.statut));
  if (besoinsActifs.length > 0) {
    insights.push({
      id: "resto-besoins",
      level: "info",
      title: "Restauration — événements actifs",
      message: `${besoinsActifs.length} besoin(s) en cours de traitement.`,
      href: "/restauration",
    });
  }

  const stockFaible = materiels.filter((m) => m.quantite_disponible <= m.seuil_alerte);
  if (stockFaible.length > 0) {
    insights.push({
      id: "materiel-stock",
      level: "warn",
      title: "Stock matériel faible",
      message: `${stockFaible.length} référence(s) sous le seuil : ${stockFaible
        .slice(0, 3)
        .map((m) => m.nom)
        .join(", ")}${stockFaible.length > 3 ? "…" : ""}.`,
      href: "/materiel",
    });
  }

  const prochains = upcoming.filter((s) => s.date_debut <= today && s.date_fin >= today);
  if (prochains.length > 0) {
    const est = prochains.reduce(
      (sum, s) => sum + (s.budget_prevu ?? s.nombre_joueurs * 120),
      0
    );
    insights.push({
      id: "cost-estimate",
      level: "info",
      title: "Estimation coûts stages en cours",
      message: `~${est.toLocaleString("fr-FR")} MAD (estimation repas/logistique).`,
      href: "/stages",
    });
  }

  return insights.slice(0, 8);
}
