import { getBesoinsRestauration } from "@/lib/data/restauration";
import { getMateriels } from "@/lib/data/materiel";
import { getStagesProgramme } from "@/lib/data/stages";
import { getStagesProchainsAvecAlertes, getDaysUntilStage } from "@/lib/data/stage-besoins";
import { parseLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";

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
  const [stages, besoins, materiels, stagesAlertes] = await Promise.all([
    getStagesProgramme(),
    getBesoinsRestauration(),
    getMateriels(),
    getStagesProchainsAvecAlertes(12),
  ]);

  const insights: FrmtInsight[] = [];
  const today = new Date().toISOString().split("T")[0]!;

  for (const { stage, alertes } of stagesAlertes) {
    for (const msg of alertes) {
      insights.push({
        id: `stage-${stage.id}-${msg.slice(0, 24)}`,
        level: msg.includes("Conflit") ? "error" : "warn",
        title: stage.stage_action,
        message: msg,
        href: `/stages/${stage.id}`,
      });
    }
    const jours = getDaysUntilStage(stage);
    if (jours >= 0 && jours < 7) {
      insights.push({
        id: `stage-soon-${stage.id}`,
        level: "warn",
        title: "Stage imminent",
        message: `"${stage.stage_action}" débute dans ${jours} jour(s).`,
        href: `/stages/${stage.id}`,
      });
    }
  }

  const upcoming = stages.filter((s) => s.date_fin >= today && s.statut !== "annule");
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

  for (const s of upcoming) {
    const pack = parseLogistiqueFromNotes(s.notes);
    if (pack?.terrains?.actif && s.infrastructure_ids.length === 0) {
      insights.push({
        id: `no-terrain-${s.id}`,
        level: "error",
        title: "Stage sans terrain",
        message: `"${s.stage_action}" : terrains demandés mais aucune réservation.`,
        href: `/stages/${s.id}`,
      });
    }
  }

  const besoinsStage = besoins.filter(
    (b) => b.notes?.includes("stage_id:") && b.statut === "planifie"
  );
  if (besoinsStage.length > 0) {
    insights.push({
      id: "resto-stage-planifie",
      level: "warn",
      title: "Restauration stage non confirmée",
      message: `${besoinsStage.length} besoin(s) stage en statut « planifié ».`,
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
      href: "/budget",
    });
  }

  return insights.slice(0, 10);
}
