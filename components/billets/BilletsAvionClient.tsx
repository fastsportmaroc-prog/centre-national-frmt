"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BilletAccordModal } from "./BilletAccordModal";
import { BilletWizardModal, emptyBilletForm } from "./BilletWizardModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  createBilletAvion,
  envoyerBilletAgence,
  getBilletsAvion,
  refuserBillet,
} from "@/lib/data/billets";
import { getJoueurs } from "@/lib/data/joueurs";
import { AGENCE_VOYAGE_DEFAUT, STATUTS_DEMANDE } from "@/lib/constants/logistique";
import type { DemandeBilletAvion, DemandeBilletAvionInput } from "@/lib/types/logistique";
import type { Joueur } from "@/lib/types/database";
import { buildEmailAgenceBillet, copyEmailToClipboard } from "@/lib/email/billet-agence";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { reportBilletsAvion } from "@/lib/reports/generators";
import { formatDate } from "@/lib/utils/dates";
import { logHistorique } from "@/lib/audit/historique";
import {
  Check,
  Mail,
  Plane,
  Plus,
  Printer,
  FileDown,
  X,
} from "lucide-react";

function routeLabel(b: DemandeBilletAvion): string {
  const dep = b.aeroport_depart_code ?? b.ville_depart.slice(0, 3).toUpperCase();
  const arr = b.aeroport_arrivee_code ?? b.ville_arrivee.slice(0, 3).toUpperCase();
  return `${dep} → ${arr}`;
}

function isAllerRetour(b: DemandeBilletAvion): boolean {
  return b.aller_retour_accorde ?? b.aller_retour;
}

function dateRetourAffichee(b: DemandeBilletAvion): string | null {
  return b.date_retour_accorde ?? b.date_retour;
}

export function BilletsAvionClient() {
  const [items, setItems] = useState<DemandeBilletAvion[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DemandeBilletAvion | null>(null);
  const [accord, setAccord] = useState<DemandeBilletAvion | null>(null);
  const [form, setForm] = useState<DemandeBilletAvionInput>(emptyBilletForm);

  const load = useCallback(async () => {
    const [b, j] = await Promise.all([getBilletsAvion(), getJoueurs()]);
    setItems(b);
    setJoueurs(j);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const j = joueurs.find((x) => x.id === form.joueur_concerne_id);
    await createBilletAvion({
      ...form,
      joueur_concerne_nom: j ? `${j.prenom} ${j.nom}` : form.joueur_concerne_nom,
      date_retour: null,
      agence_voyage: form.agence_voyage || AGENCE_VOYAGE_DEFAUT,
    });
    setOpen(false);
    setForm(emptyBilletForm());
    await load();
  }

  async function printBillet(b: DemandeBilletAvion) {
    const ar = isAllerRetour(b);
    const retour = dateRetourAffichee(b);
    const meta = {
      titre: `Demande billet — ${routeLabel(b)}`,
      colonnes: ["Champ", "Valeur"],
      lignes: [
        ["Demandeur", `${b.demandeur_nom} (${b.demandeur_role})`],
        ["Joueur", b.joueur_concerne_nom ?? "—"],
        ["Aller", `${b.ville_depart} — ${formatDate(b.date_aller)}`],
        [
          "Retour",
          ar && retour
            ? `${b.ville_arrivee} → ${b.ville_depart} — ${formatDate(retour)}`
            : "Aller simple",
        ],
        ["Prix", b.prix_billet != null ? `${b.prix_billet} ${b.prix_devise ?? "MAD"}` : "—"],
        ["Motif", b.motif_deplacement],
        ["Urgence", b.urgence ? "Oui" : "Non"],
        ["Statut", b.statut],
      ],
    };
    await openPrintReport(meta);
    await logHistorique({
      action: "export",
      module: "billets",
      entite_id: b.id,
      entite_label: "Impression demande",
      ancienne_valeur: null,
      nouvelle_valeur: "PDF",
      commentaire: null,
    });
  }

  return (
    <>
      <PageHeader
        title="Billets d'avion"
        description="Assistant 2 étapes · Accord avec prix et imputation dépenses joueur"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const meta = await reportBilletsAvion();
              await exportPdfReport("billets-avion.pdf", meta);
            }}
          >
            <FileDown className="h-4 w-4" />
            Export PDF liste
          </Button>
          <Button
            onClick={() => {
              setForm(emptyBilletForm());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((b) => {
            const ar = isAllerRetour(b);
            const retour = dateRetourAffichee(b);
            return (
              <Card key={b.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Plane className="h-5 w-5 text-frmt-green" />
                      <span className="font-semibold">{routeLabel(b)}</span>
                      {ar ? <Badge variant="success">Aller-retour</Badge> : null}
                      {b.urgence && <Badge variant="danger">Urgent</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {b.ville_depart} → {b.ville_arrivee}
                    </p>
                    <p className="text-sm text-muted">
                      {b.joueur_concerne_nom ?? b.type_personne} · Aller{" "}
                      {formatDate(b.date_aller)}
                      {ar && retour
                        ? ` · Retour ${formatDate(retour)}`
                        : !ar
                          ? " · Aller simple"
                          : " · Retour à fixer à l'accord"}
                    </p>
                    {b.prix_billet != null && (
                      <p className="text-sm font-medium text-frmt-red">
                        {b.prix_billet} {b.prix_devise ?? "MAD"}
                        {b.depense_enregistree ? " · imputé au joueur" : ""}
                      </p>
                    )}
                    <Badge variant="muted" className="mt-2">
                      {STATUTS_DEMANDE.find((s) => s.value === b.statut)?.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(b)}>
                      Détail
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => printBillet(b)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    {b.statut === "en_attente" && (
                      <Button size="sm" onClick={() => setAccord(b)}>
                        <Check className="h-4 w-4" />
                        Accord
                      </Button>
                    )}
                    {b.statut === "validee_direction" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => envoyerBilletAgence(b.id).then(load)}
                      >
                        <Mail className="h-4 w-4" />
                        Envoyer agence
                      </Button>
                    )}
                    {b.statut !== "refusee" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const m = prompt("Motif refus");
                          if (m) refuserBillet(b.id, m).then(load);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      <BilletWizardModal
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        joueurs={joueurs}
        onSubmit={handleSubmit}
      />

      <BilletAccordModal
        billet={accord}
        onClose={() => setAccord(null)}
        onSuccess={load}
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détail demande billet">
        {detail && (
          <div className="space-y-4 text-sm">
            {detail.prix_billet != null && (
              <p className="font-medium">
                Prix accordé : {detail.prix_billet} {detail.prix_devise ?? "MAD"}
              </p>
            )}
            <pre className="max-h-48 overflow-auto rounded-lg bg-surface-elevated p-3 text-xs whitespace-pre-wrap">
              {buildEmailAgenceBillet(detail).body}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  window.location.href = buildEmailAgenceBillet(detail).mailto;
                }}
              >
                <Mail className="h-4 w-4" />
                Ouvrir email agence
              </Button>
              <Button variant="secondary" onClick={() => copyEmailToClipboard(detail)}>
                Copier l&apos;email
              </Button>
              <Button variant="ghost" onClick={() => printBillet(detail)}>
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
