"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { accorderBilletAvion } from "@/lib/data/billets";
import type { DemandeBilletAvion } from "@/lib/types/logistique";
import { DUREE_SEJOUR_DEFAUT_JOURS } from "@/lib/constants/billets";
import { computeDateRetour } from "@/lib/utils/billet-vol";
import { formatDate } from "@/lib/utils/dates";
import { Check } from "lucide-react";

type Props = {
  billet: DemandeBilletAvion | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function BilletAccordModal({ billet, onClose, onSuccess }: Props) {
  const [allerRetour, setAllerRetour] = useState(true);
  const [duree, setDuree] = useState(DUREE_SEJOUR_DEFAUT_JOURS);
  const [dateRetour, setDateRetour] = useState("");
  const [prix, setPrix] = useState("");
  const [devise, setDevise] = useState("MAD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!billet) return;
    const ar = billet.aller_retour ?? true;
    const d = billet.duree_sejour_jours ?? DUREE_SEJOUR_DEFAUT_JOURS;
    setAllerRetour(ar);
    setDuree(d);
    setDateRetour(
      billet.date_retour ??
        (ar ? computeDateRetour(billet.date_aller, d) ?? "" : "")
    );
    setPrix(billet.prix_billet != null ? String(billet.prix_billet) : "");
    setDevise(billet.prix_devise ?? "MAD");
  }, [billet]);

  useEffect(() => {
    if (!billet || !allerRetour) return;
    setDateRetour(computeDateRetour(billet.date_aller, duree) ?? "");
  }, [billet, allerRetour, duree]);

  async function handleAccord(e: React.FormEvent) {
    e.preventDefault();
    if (!billet) return;
    const montant = Number(prix);
    if (!montant || montant <= 0) {
      alert("Indiquez le prix du billet.");
      return;
    }
    if (allerRetour && !dateRetour) {
      alert("Indiquez la date de retour.");
      return;
    }
    setSaving(true);
    try {
      await accorderBilletAvion(billet.id, {
        aller_retour: allerRetour,
        date_retour: allerRetour ? dateRetour : null,
        duree_sejour_jours: allerRetour ? duree : null,
        prix_billet: montant,
        prix_devise: devise,
        validateur: "Direction",
      });
      onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!billet) return null;

  const dep = billet.aeroport_depart_code ?? billet.ville_depart.slice(0, 3);
  const arr = billet.aeroport_arrivee_code ?? billet.ville_arrivee.slice(0, 3);

  return (
    <Modal open={!!billet} onClose={onClose} title="Accord — validation billet">
      <form onSubmit={handleAccord} className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-elevated/50 p-3 text-sm">
          <p className="font-medium">
            {dep} → {arr} · Aller {formatDate(billet.date_aller)}
          </p>
          <p className="mt-1 text-muted">
            {billet.joueur_concerne_nom ?? billet.type_personne} · {billet.motif_deplacement}
          </p>
          <p className="mt-1 text-xs text-muted">
            Souhait initial : {billet.aller_retour ? "aller-retour envisagé" : "aller simple"}
            {billet.duree_sejour_jours ? ` · ~${billet.duree_sejour_jours} j` : ""}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Type de vol accordé</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="typeVol"
              checked={!allerRetour}
              onChange={() => setAllerRetour(false)}
            />
            Aller simple
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="typeVol"
              checked={allerRetour}
              onChange={() => setAllerRetour(true)}
            />
            Aller-retour
          </label>
        </fieldset>

        {allerRetour && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Durée séjour (jours)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={duree}
                onChange={(e) => setDuree(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label>Date retour accordée</Label>
              <Input
                type="date"
                required
                value={dateRetour}
                onChange={(e) => setDateRetour(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">
                Retour : {arr} → {dep}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Prix du billet *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="Ex. 3500"
            />
          </div>
          <div>
            <Label>Devise</Label>
            <Input value={devise} onChange={(e) => setDevise(e.target.value)} />
          </div>
        </div>

        {billet.joueur_concerne_id ? (
          <p className="rounded-md border border-frmt-green/30 bg-frmt-green/10 px-3 py-2 text-sm text-frmt-green">
            Ce montant sera enregistré automatiquement sur le compte dépenses du joueur.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Aucun joueur lié — pas d&apos;imputation au compte dépenses.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          <Check className="h-4 w-4" />
          {saving ? "Enregistrement…" : "Confirmer l'accord"}
        </Button>
      </form>
    </Modal>
  );
}
