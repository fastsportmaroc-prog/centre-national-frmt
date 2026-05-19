import { BESOINS_EN_COURS, FACTURES_IMPAYEES } from "@/lib/constants/restauration";
import type {
  BesoinRestauration,
  FactureRestauration,
  PrestataireEtatGeneral,
  PrestataireRestauration,
} from "@/lib/types/restauration";

export function computePrestataireEtats(
  prestataires: PrestataireRestauration[],
  besoins: BesoinRestauration[],
  factures: FactureRestauration[]
): PrestataireEtatGeneral[] {
  return prestataires.map((p) => {
    const besoinsP = besoins.filter((b) => b.prestataire_id === p.id);
    const facturesP = factures.filter((f) => f.prestataire_id === p.id);
    const payees = facturesP.filter((f) => f.statut === "payee");
    const impayees = facturesP.filter((f) => FACTURES_IMPAYEES.includes(f.statut));

    const dates = facturesP.map((f) => f.date_facture).sort().reverse();

    return {
      prestataire: p,
      besoins_total: besoinsP.length,
      besoins_en_cours: besoinsP.filter((b) => BESOINS_EN_COURS.includes(b.statut)).length,
      factures_total: facturesP.length,
      montant_facture_ttc: facturesP.reduce((s, f) => s + f.montant_ttc, 0),
      montant_paye: payees.reduce((s, f) => s + f.montant_ttc, 0),
      montant_impaye: impayees.reduce((s, f) => s + f.montant_ttc, 0),
      derniere_facture_date: dates[0] ?? null,
    };
  });
}

export function syncBesoinStatutFromFacture(
  statutFacture: FactureRestauration["statut"]
): BesoinRestauration["statut"] | null {
  if (statutFacture === "payee") return "paye";
  if (statutFacture === "emise" || statutFacture === "en_attente_paiement") return "facture";
  return null;
}
