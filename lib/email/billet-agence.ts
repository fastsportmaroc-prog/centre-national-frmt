import type { DemandeBilletAvion } from "@/lib/types/logistique";
import { formatDate } from "@/lib/utils/dates";

export function buildEmailAgenceBillet(billet: DemandeBilletAvion): {
  subject: string;
  body: string;
  mailto: string;
} {
  const subject = `[Centre National FRMT] Demande billet — ${billet.ville_depart} → ${billet.ville_arrivee}${billet.urgence ? " — URGENT" : ""}`;

  const body = `Madame, Monsieur,

Dans le cadre de la gestion du centre national de tennis, nous vous prions de bien vouloir procéder à la réservation suivante :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMANDE DE BILLET D'AVION
Référence : ${billet.id.slice(0, 8).toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Demandeur : ${billet.demandeur_nom} (${billet.demandeur_role})
Type de personne : ${billet.type_personne}
${billet.joueur_concerne_nom ? `Joueur concerné : ${billet.joueur_concerne_nom}` : ""}

TRAJET
• Aller : ${billet.aeroport_depart_code ? `[${billet.aeroport_depart_code}] ` : ""}${billet.ville_depart}
  → ${billet.aeroport_arrivee_code ? `[${billet.aeroport_arrivee_code}] ` : ""}${billet.ville_arrivee}
• Date aller : ${formatDate(billet.date_aller)}
${
  billet.aller_retour !== false && billet.date_retour
    ? `• Retour : ${billet.aeroport_arrivee_code ? `[${billet.aeroport_arrivee_code}] ` : ""}${billet.ville_arrivee}
  → ${billet.aeroport_depart_code ? `[${billet.aeroport_depart_code}] ` : ""}${billet.ville_depart}
• Date retour : ${formatDate(billet.date_retour)}${billet.duree_sejour_jours ? ` (${billet.duree_sejour_jours} jours de séjour)` : ""}`
    : "• Type : Aller simple"
}
• Préférence horaire : ${billet.preference_horaire ?? "Flexible"}

INFORMATIONS COMPLÉMENTAIRES
• Bagages : ${billet.bagage ?? "Standard"}
• Passeport / pièces : ${billet.passeport ?? "À confirmer"}
• Motif : ${billet.motif_deplacement}
• Contexte : ${billet.contexte}
• Urgence : ${billet.urgence ? "OUI" : "Non"}

${billet.notes ? `Notes : ${billet.notes}` : ""}

Statut validation : ${billet.statut}
${billet.validateur ? `Validé par : ${billet.validateur} le ${billet.date_validation ? formatDate(billet.date_validation) : ""}` : ""}

Merci de nous adresser votre proposition tarifaire et les options de vols dans les meilleurs délais.

Cordialement,
Service Logistique — Centre National FRMT
Centre National de Tennis / Fédération

---
Document confidentiel — Usage professionnel uniquement`;

  const mailto = `mailto:${encodeURIComponent(billet.agence_voyage.includes("@") ? billet.agence_voyage : "contact@agence-voyage.fr")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailto };
}

export function copyEmailToClipboard(billet: DemandeBilletAvion): Promise<void> {
  const { subject, body } = buildEmailAgenceBillet(billet);
  const full = `Objet: ${subject}\n\n${body}`;
  return navigator.clipboard.writeText(full);
}
