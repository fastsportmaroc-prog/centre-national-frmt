"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import {
  STATUTS_BESOIN,
  STATUTS_FACTURE,
  TYPES_EVENEMENT,
  TYPES_REPAS,
} from "@/lib/constants/restauration";
import {
  createBesoinRestauration,
  createFactureRestauration,
  createPrestataireRestauration,
  deleteBesoinRestauration,
  deleteFactureRestauration,
  deletePrestataireRestauration,
  getBesoinsRestauration,
  getFacturesRestauration,
  getPrestatairesEtatGeneral,
  getPrestatairesRestauration,
  updateBesoinRestauration,
  updateFactureRestauration,
  updatePrestataireRestauration,
} from "@/lib/data/restauration";
import { getRepas } from "@/lib/data/repas";
import type { Repas } from "@/lib/types/database";
import type {
  BesoinRestauration,
  BesoinRestaurationInput,
  FactureRestauration,
  FactureRestaurationInput,
  PrestataireEtatGeneral,
  PrestataireRestauration,
  PrestataireRestaurationInput,
  StatutBesoinRestauration,
  StatutFactureRestauration,
  TypeEvenementRestauration,
} from "@/lib/types/restauration";
import { formatDate } from "@/lib/utils/dates";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  FileDown,
  FileText,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { getStageProvisionSummaries } from "@/lib/data/stage-besoins";
import type { StageProvisionSummary } from "@/lib/data/stage-besoins";
import { StageProvisionList } from "@/components/stages/StageProvisionList";
import { parseStageIdFromNotes } from "@/lib/utils/stage-link";
import { getStageRestaurations, deleteStageRestauration } from "@/lib/data/stage-services";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { buildRestaurationStagesReport } from "@/lib/reports/restauration-report";
import type { StageRestaurationRecord } from "@/lib/types/stage-services";

type Tab = "besoins" | "prestataires" | "factures";

function emptyBesoin(): BesoinRestaurationInput {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    titre: "",
    type_evenement: "tournoi",
    date_evenement: today,
    date_besoin: today,
    type_repas: "dejeuner",
    nombre_personnes: 10,
    menu_prevu: "",
    allergies: "",
    prestataire_id: null,
    statut: "planifie",
    montant_estime: null,
    notes: "",
  };
}

function emptyPrestataire(): PrestataireRestaurationInput {
  return {
    nom: "",
    contact_nom: "",
    email: "",
    telephone: "",
    adresse: "",
    notes: "",
    actif: true,
  };
}

function emptyFacture(prestataireId = ""): FactureRestaurationInput {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    prestataire_id: prestataireId,
    besoin_id: null,
    numero_facture: "",
    date_facture: today,
    date_echeance: null,
    montant_ht: 0,
    montant_ttc: 0,
    tva_pct: 20,
    devise: "MAD",
    statut: "emise",
    piece_jointe_url: null,
    notes: "",
  };
}

function besoinBadgeVariant(
  statut: StatutBesoinRestauration
): "muted" | "success" | "warning" | "danger" {
  if (statut === "paye" || statut === "livre") return "success";
  if (statut === "annule") return "danger";
  if (statut === "commande" || statut === "facture") return "warning";
  return "muted";
}

function factureBadgeVariant(
  statut: StatutFactureRestauration
): "muted" | "success" | "warning" | "danger" {
  if (statut === "payee") return "success";
  if (statut === "litige" || statut === "annulee") return "danger";
  if (statut === "en_attente_paiement" || statut === "emise") return "warning";
  return "muted";
}

export function RestaurationClient() {
  const [tab, setTab] = useState<Tab>("besoins");
  const [repas, setRepas] = useState<Repas[]>([]);
  const [besoins, setBesoins] = useState<BesoinRestauration[]>([]);
  const [prestataires, setPrestataires] = useState<PrestataireRestauration[]>([]);
  const [factures, setFactures] = useState<FactureRestauration[]>([]);
  const [etats, setEtats] = useState<PrestataireEtatGeneral[]>([]);

  const [modalBesoin, setModalBesoin] = useState(false);
  const [editBesoin, setEditBesoin] = useState<BesoinRestauration | null>(null);
  const [formBesoin, setFormBesoin] = useState<BesoinRestaurationInput>(emptyBesoin);

  const [modalPrestataire, setModalPrestataire] = useState(false);
  const [editPrestataire, setEditPrestataire] = useState<PrestataireRestauration | null>(null);
  const [formPrestataire, setFormPrestataire] = useState<PrestataireRestaurationInput>(
    emptyPrestataire()
  );

  const [modalFacture, setModalFacture] = useState(false);
  const [editFacture, setEditFacture] = useState<FactureRestauration | null>(null);
  const [formFacture, setFormFacture] = useState<FactureRestaurationInput>(emptyFacture());

  const [detailPrestataire, setDetailPrestataire] = useState<PrestataireEtatGeneral | null>(null);
  const [stageProvisions, setStageProvisions] = useState<StageProvisionSummary[]>([]);
  const [stageRestaurations, setStageRestaurations] = useState<StageRestaurationRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [r, b, p, f, e, provisions, stageRestau] = await Promise.all([
        getRepas(),
        getBesoinsRestauration(),
        getPrestatairesRestauration(),
        getFacturesRestauration(),
        getPrestatairesEtatGeneral(),
        getStageProvisionSummaries(),
        getStageRestaurations(),
      ]);
      setRepas(r);
      setBesoins(b);
      setPrestataires(p);
      setFactures(f);
      setEtats(e);
      setStageProvisions(provisions);
      setStageRestaurations(stageRestau);
    } catch (err) {
      console.warn("Chargement restauration:", err);
      setRepas([]);
      setBesoins([]);
      setPrestataires([]);
      setFactures([]);
      setEtats([]);
      setStageProvisions([]);
      setStageRestaurations([]);
      setLoadError(
        err instanceof Error ? err.message : "Impossible de charger la restauration"
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const impaye = etats.reduce((s, e) => s + e.montant_impaye, 0);
    const besoinsActifs = besoins.filter((b) => !["paye", "annule", "brouillon"].includes(b.statut))
      .length;
    return { impaye, besoinsActifs };
  }, [etats, besoins]);

  function applyTva(ht: number, tva: number) {
    return Math.round(ht * (1 + tva / 100) * 100) / 100;
  }

  async function submitBesoin(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...formBesoin,
      menu_prevu: formBesoin.menu_prevu || null,
      allergies: formBesoin.allergies || null,
      notes: formBesoin.notes || null,
      montant_estime: formBesoin.montant_estime || null,
    };
    if (editBesoin) await updateBesoinRestauration(editBesoin.id, payload);
    else await createBesoinRestauration(payload);
    setModalBesoin(false);
    setEditBesoin(null);
    await load();
  }

  function openAjouterPrestataire() {
    setEditPrestataire(null);
    setFormPrestataire(emptyPrestataire());
    setModalPrestataire(true);
  }

  function openModifierPrestataire(p: PrestataireRestauration) {
    setEditPrestataire(p);
    setFormPrestataire({
      nom: p.nom,
      contact_nom: p.contact_nom,
      email: p.email,
      telephone: p.telephone,
      adresse: p.adresse,
      actif: p.actif,
      notes: p.notes,
    });
    setModalPrestataire(true);
  }

  async function handleSupprimerPrestataire(p: PrestataireRestauration) {
    const etat = etats.find((e) => e.prestataire.id === p.id);
    const nbFactures = etat?.factures_total ?? 0;
    const msg =
      nbFactures > 0
        ? `Ce prestataire a ${nbFactures} facture(s). Supprimez les factures avant de retirer le prestataire.`
        : `Supprimer le prestataire « ${p.nom} » ? Les besoins liés seront désassignés.`;
    if (!confirm(msg)) return;
    if (nbFactures > 0) return;
    try {
      await deletePrestataireRestauration(p.id);
      setDetailPrestataire(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  async function submitPrestataire(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...formPrestataire,
      contact_nom: formPrestataire.contact_nom || null,
      email: formPrestataire.email || null,
      telephone: formPrestataire.telephone || null,
      adresse: formPrestataire.adresse || null,
      notes: formPrestataire.notes || null,
    };
    if (editPrestataire) await updatePrestataireRestauration(editPrestataire.id, payload);
    else await createPrestataireRestauration(payload);
    setModalPrestataire(false);
    setEditPrestataire(null);
    await load();
  }

  async function submitFacture(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...formFacture,
      besoin_id: formFacture.besoin_id || null,
      date_echeance: formFacture.date_echeance || null,
      notes: formFacture.notes || null,
      montant_ttc:
        formFacture.montant_ttc > 0
          ? formFacture.montant_ttc
          : applyTva(formFacture.montant_ht, formFacture.tva_pct),
    };
    if (editFacture) await updateFactureRestauration(editFacture.id, payload);
    else await createFactureRestauration(payload);
    setModalFacture(false);
    setEditFacture(null);
    await load();
  }

  const tabs: { id: Tab; label: string; icon: typeof UtensilsCrossed }[] = [
    { id: "besoins", label: "Événements & besoins", icon: CalendarDays },
    { id: "prestataires", label: "Prestataires", icon: Building2 },
    { id: "factures", label: "Factures", icon: FileText },
  ];

  return (
    <>
      <PageHeader
        title="Restauration"
        description="Besoins par événement · Factures prestataires · État général"
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const meta = buildRestaurationStagesReport(
                  stageRestaurations,
                  stageProvisions
                );
                await openPrintReport(meta);
              }}
            >
              Imprimer
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const meta = buildRestaurationStagesReport(
                  stageRestaurations,
                  stageProvisions
                );
                await exportPdfReport("restauration.pdf", meta);
              }}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </>
        }
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {loadError && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            {loadError}
          </Card>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Besoins actifs</p>
            <p className="text-2xl font-semibold">{totals.besoinsActifs}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Impayé prestataires</p>
            <p className="text-2xl font-semibold text-frmt-red">
              {totals.impaye.toLocaleString("fr-FR")} MAD
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Repas du jour (planning)</p>
            <p className="text-2xl font-semibold">{repas.length}</p>
          </Card>
        </div>

        {repas.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <UtensilsCrossed className="h-4 w-4 text-frmt-green" />
              Repas planifiés aujourd&apos;hui
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {repas.map((r) => (
                <li key={r.id} className="rounded-md border border-border px-3 py-2">
                  <span className="capitalize font-medium">{r.type_repas}</span> ·{" "}
                  {r.nombre_personnes} pers. — {r.menu ?? "—"}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={tab === id ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "besoins" && (
          <section className="space-y-3">
            <StageProvisionList
              summaries={stageProvisions}
              filter="restauration"
              emptyMessage="Aucun besoin restauration auto-créé par un stage."
            />
            {stageRestaurations.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-semibold">Restaurations stage (table)</p>
                <ul className="space-y-2 text-sm">
                  {stageRestaurations.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Stage {r.stage_id.slice(0, 8)} · {formatDate(r.date_debut)} →{" "}
                        {formatDate(r.date_fin)} · {r.nb_personnes} pers. · {r.total_repas} repas
                      </span>
                      <div className="flex gap-2">
                        <Link href={`/stages/${r.stage_id}`}>
                          <Button size="sm" variant="ghost">
                            Voir stage
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            if (!confirm("Supprimer cette restauration stage ?")) return;
                            await deleteStageRestauration(r.id);
                            await load();
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                          Supprimer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <p className="text-xs text-muted">
              Besoins manuels et événements hors stage ci-dessous.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditBesoin(null);
                  setFormBesoin(emptyBesoin());
                  setModalBesoin(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nouveau besoin
              </Button>
            </div>
            {besoins.map((b) => {
              const stageId = parseStageIdFromNotes(b.notes);
              return (
              <Card key={b.id}>
                <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{b.titre}</h3>
                      {stageId && (
                        <Link
                          href={`/stages/${stageId}`}
                          className="text-xs text-frmt-green hover:underline"
                        >
                          Stage lié
                        </Link>
                      )}
                      <Badge variant={besoinBadgeVariant(b.statut)}>
                        {STATUTS_BESOIN.find((s) => s.value === b.statut)?.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {TYPES_EVENEMENT.find((t) => t.value === b.type_evenement)?.label} ·{" "}
                      {TYPES_REPAS.find((t) => t.value === b.type_repas)?.label ?? b.type_repas} ·{" "}
                      {b.nombre_personnes} pers.
                    </p>
                    <p className="text-sm text-muted">
                      Événement {formatDate(b.date_evenement)} · Besoin{" "}
                      {formatDate(b.date_besoin)}
                    </p>
                    {b.prestataire_nom && (
                      <p className="text-sm text-frmt-green">Prestataire : {b.prestataire_nom}</p>
                    )}
                    {b.menu_prevu && <p className="mt-1 text-sm">{b.menu_prevu}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditBesoin(b);
                        setFormBesoin({
                          titre: b.titre,
                          type_evenement: b.type_evenement,
                          date_evenement: b.date_evenement,
                          date_besoin: b.date_besoin,
                          type_repas: b.type_repas,
                          nombre_personnes: b.nombre_personnes,
                          menu_prevu: b.menu_prevu ?? "",
                          allergies: b.allergies ?? "",
                          prestataire_id: b.prestataire_id,
                          statut: b.statut,
                          montant_estime: b.montant_estime,
                          notes: b.notes ?? "",
                        });
                        setModalBesoin(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm("Supprimer ce besoin ?")) {
                          deleteBesoinRestauration(b.id).then(load);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
            })}
          </section>
        )}

        {tab === "prestataires" && (
          <section className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={openAjouterPrestataire}>
                <Plus className="h-4 w-4" />
                Ajouter prestataire
              </Button>
            </div>
            {etats.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted">
                Aucun prestataire. Cliquez sur « Ajouter prestataire » pour commencer.
              </Card>
            ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {etats.map((e) => (
                <Card key={e.prestataire.id} className="transition hover:border-frmt-green/40">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setDetailPrestataire(e)}
                    >
                      <h3 className="font-semibold">{e.prestataire.nom}</h3>
                      {!e.prestataire.actif && <Badge variant="danger">Inactif</Badge>}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Modifier"
                        onClick={() => openModifierPrestataire(e.prestataire)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Supprimer prestataire"
                        onClick={() => handleSupprimerPrestataire(e.prestataire)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                      <Building2 className="h-5 w-5 text-muted" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full text-left"
                    onClick={() => setDetailPrestataire(e)}
                  >
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted">Besoins en cours</dt>
                      <dd className="font-medium">{e.besoins_en_cours}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Factures</dt>
                      <dd className="font-medium">{e.factures_total}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Total facturé</dt>
                      <dd className="font-medium">
                        {e.montant_facture_ttc.toLocaleString("fr-FR")} MAD
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Impayé</dt>
                      <dd
                        className={`font-medium ${e.montant_impaye > 0 ? "text-frmt-red" : "text-frmt-green"}`}
                      >
                        {e.montant_impaye.toLocaleString("fr-FR")} MAD
                      </dd>
                    </div>
                  </dl>
                  {e.derniere_facture_date && (
                    <p className="mt-2 text-xs text-muted">
                      Dernière facture : {formatDate(e.derniere_facture_date)}
                    </p>
                  )}
                  </button>
                </Card>
              ))}
            </div>
            )}
          </section>
        )}

        {tab === "factures" && (
          <section className="space-y-3">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditFacture(null);
                  setFormFacture(emptyFacture(prestataires[0]?.id ?? ""));
                  setModalFacture(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nouvelle facture
              </Button>
            </div>
            {factures.map((f) => {
              const prest = prestataires.find((p) => p.id === f.prestataire_id);
              const besoin = besoins.find((b) => b.id === f.besoin_id);
              return (
                <Card key={f.id}>
                  <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{f.numero_facture}</h3>
                        <Badge variant={factureBadgeVariant(f.statut)}>
                          {STATUTS_FACTURE.find((s) => s.value === f.statut)?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">
                        {prest?.nom ?? "—"} · {formatDate(f.date_facture)}
                      </p>
                      {besoin && (
                        <p className="text-sm text-frmt-green">Événement : {besoin.titre}</p>
                      )}
                      <p className="mt-1 font-medium">
                        {f.montant_ttc.toLocaleString("fr-FR")} {f.devise} TTC
                        <span className="text-sm font-normal text-muted">
                          {" "}
                          (HT {f.montant_ht.toLocaleString("fr-FR")})
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditFacture(f);
                          setFormFacture({
                            prestataire_id: f.prestataire_id,
                            besoin_id: f.besoin_id,
                            numero_facture: f.numero_facture,
                            date_facture: f.date_facture,
                            date_echeance: f.date_echeance,
                            montant_ht: f.montant_ht,
                            montant_ttc: f.montant_ttc,
                            tva_pct: f.tva_pct,
                            devise: f.devise,
                            statut: f.statut,
                            piece_jointe_url: f.piece_jointe_url,
                            notes: f.notes ?? "",
                          });
                          setModalFacture(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm("Supprimer cette facture ?")) {
                            deleteFactureRestauration(f.id).then(load);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </main>

      {/* Modal besoin */}
      <Modal
        open={modalBesoin}
        onClose={() => setModalBesoin(false)}
        title={editBesoin ? "Modifier le besoin" : "Nouveau besoin / événement"}
      >
        <form onSubmit={submitBesoin} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <Label>Titre *</Label>
            <Input
              required
              value={formBesoin.titre}
              onChange={(e) => setFormBesoin({ ...formBesoin, titre: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type événement</Label>
              <Select
                value={formBesoin.type_evenement}
                onChange={(e) =>
                  setFormBesoin({
                    ...formBesoin,
                    type_evenement: e.target.value as TypeEvenementRestauration,
                  })
                }
              >
                {TYPES_EVENEMENT.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={formBesoin.statut}
                onChange={(e) =>
                  setFormBesoin({
                    ...formBesoin,
                    statut: e.target.value as StatutBesoinRestauration,
                  })
                }
              >
                {STATUTS_BESOIN.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date événement</Label>
              <Input
                type="date"
                required
                value={formBesoin.date_evenement}
                onChange={(e) =>
                  setFormBesoin({ ...formBesoin, date_evenement: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date besoin (livraison)</Label>
              <Input
                type="date"
                required
                value={formBesoin.date_besoin}
                onChange={(e) => setFormBesoin({ ...formBesoin, date_besoin: e.target.value })}
              />
            </div>
            <div>
              <Label>Type repas</Label>
              <Select
                value={formBesoin.type_repas}
                onChange={(e) => setFormBesoin({ ...formBesoin, type_repas: e.target.value })}
              >
                {TYPES_REPAS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Nombre de personnes</Label>
              <Input
                type="number"
                min={1}
                value={formBesoin.nombre_personnes}
                onChange={(e) =>
                  setFormBesoin({
                    ...formBesoin,
                    nombre_personnes: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Prestataire</Label>
              <div className="flex flex-wrap gap-2">
                <Select
                  className="min-w-[200px] flex-1"
                  value={formBesoin.prestataire_id ?? ""}
                  onChange={(e) =>
                    setFormBesoin({
                      ...formBesoin,
                      prestataire_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">— À assigner —</option>
                  {prestataires.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" size="sm" onClick={openAjouterPrestataire}>
                  <Plus className="h-4 w-4" />
                  Ajouter prestataire
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label>Menu prévu</Label>
            <Textarea
              rows={2}
              value={formBesoin.menu_prevu ?? ""}
              onChange={(e) => setFormBesoin({ ...formBesoin, menu_prevu: e.target.value })}
            />
          </div>
          <div>
            <Label>Allergies / régimes</Label>
            <Input
              value={formBesoin.allergies ?? ""}
              onChange={(e) => setFormBesoin({ ...formBesoin, allergies: e.target.value })}
            />
          </div>
          <div>
            <Label>Montant estimé (MAD)</Label>
            <Input
              type="number"
              min={0}
              value={formBesoin.montant_estime ?? ""}
              onChange={(e) =>
                setFormBesoin({
                  ...formBesoin,
                  montant_estime: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </form>
      </Modal>

      {/* Modal prestataire */}
      <Modal
        open={modalPrestataire}
        onClose={() => setModalPrestataire(false)}
        title={editPrestataire ? "Modifier prestataire" : "Ajouter prestataire"}
      >
        <form onSubmit={submitPrestataire} className="space-y-3">
          <div>
            <Label>Raison sociale *</Label>
            <Input
              required
              value={formPrestataire.nom}
              onChange={(e) => setFormPrestataire({ ...formPrestataire, nom: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Contact</Label>
              <Input
                value={formPrestataire.contact_nom ?? ""}
                onChange={(e) =>
                  setFormPrestataire({ ...formPrestataire, contact_nom: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={formPrestataire.telephone ?? ""}
                onChange={(e) =>
                  setFormPrestataire({ ...formPrestataire, telephone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formPrestataire.email ?? ""}
              onChange={(e) => setFormPrestataire({ ...formPrestataire, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input
              value={formPrestataire.adresse ?? ""}
              onChange={(e) =>
                setFormPrestataire({ ...formPrestataire, adresse: e.target.value })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formPrestataire.actif}
              onChange={(e) =>
                setFormPrestataire({ ...formPrestataire, actif: e.target.checked })
              }
            />
            Prestataire actif
          </label>
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </form>
      </Modal>

      {/* Modal facture */}
      <Modal
        open={modalFacture}
        onClose={() => setModalFacture(false)}
        title={editFacture ? "Modifier facture" : "Nouvelle facture prestataire"}
      >
        <form onSubmit={submitFacture} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Prestataire *</Label>
              <Select
                required
                value={formFacture.prestataire_id}
                onChange={(e) =>
                  setFormFacture({ ...formFacture, prestataire_id: e.target.value })
                }
              >
                <option value="">— Choisir —</option>
                {prestataires.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Événement / besoin lié</Label>
              <Select
                value={formFacture.besoin_id ?? ""}
                onChange={(e) =>
                  setFormFacture({
                    ...formFacture,
                    besoin_id: e.target.value || null,
                  })
                }
              >
                <option value="">— Aucun —</option>
                {besoins.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titre}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>N° facture *</Label>
              <Input
                required
                value={formFacture.numero_facture}
                onChange={(e) =>
                  setFormFacture({ ...formFacture, numero_facture: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={formFacture.statut}
                onChange={(e) =>
                  setFormFacture({
                    ...formFacture,
                    statut: e.target.value as StatutFactureRestauration,
                  })
                }
              >
                {STATUTS_FACTURE.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date facture</Label>
              <Input
                type="date"
                required
                value={formFacture.date_facture}
                onChange={(e) =>
                  setFormFacture({ ...formFacture, date_facture: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Échéance</Label>
              <Input
                type="date"
                value={formFacture.date_echeance ?? ""}
                onChange={(e) =>
                  setFormFacture({
                    ...formFacture,
                    date_echeance: e.target.value || null,
                  })
                }
              />
            </div>
            <div>
              <Label>Montant HT</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formFacture.montant_ht}
                onChange={(e) => {
                  const ht = Number(e.target.value) || 0;
                  setFormFacture({
                    ...formFacture,
                    montant_ht: ht,
                    montant_ttc: applyTva(ht, formFacture.tva_pct),
                  });
                }}
              />
            </div>
            <div>
              <Label>TVA %</Label>
              <Input
                type="number"
                min={0}
                value={formFacture.tva_pct}
                onChange={(e) => {
                  const tva = Number(e.target.value) || 0;
                  setFormFacture({
                    ...formFacture,
                    tva_pct: tva,
                    montant_ttc: applyTva(formFacture.montant_ht, tva),
                  });
                }}
              />
            </div>
            <div>
              <Label>Montant TTC</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formFacture.montant_ttc}
                onChange={(e) =>
                  setFormFacture({
                    ...formFacture,
                    montant_ttc: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Enregistrer la facture
          </Button>
        </form>
      </Modal>

      {/* Détail état prestataire */}
      <Modal
        open={!!detailPrestataire}
        onClose={() => setDetailPrestataire(null)}
        title={detailPrestataire?.prestataire.nom ?? "Prestataire"}
      >
        {detailPrestataire && (
          <div className="space-y-4 text-sm">
            <Card className="p-3">
              <h4 className="font-semibold mb-2">État général</h4>
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-muted">Besoins total</dt>
                <dd>{detailPrestataire.besoins_total}</dd>
                <dt className="text-muted">En cours</dt>
                <dd>{detailPrestataire.besoins_en_cours}</dd>
                <dt className="text-muted">Facturé TTC</dt>
                <dd>{detailPrestataire.montant_facture_ttc.toLocaleString("fr-FR")} MAD</dd>
                <dt className="text-muted">Payé</dt>
                <dd className="text-frmt-green">
                  {detailPrestataire.montant_paye.toLocaleString("fr-FR")} MAD
                </dd>
                <dt className="text-muted">Impayé</dt>
                <dd className="text-frmt-red">
                  {detailPrestataire.montant_impaye.toLocaleString("fr-FR")} MAD
                </dd>
              </dl>
            </Card>
            <div>
              <h4 className="font-semibold mb-2">Besoins liés</h4>
              <ul className="space-y-1">
                {besoins
                  .filter((b) => b.prestataire_id === detailPrestataire.prestataire.id)
                  .map((b) => (
                    <li key={b.id} className="rounded border border-border px-2 py-1">
                      {b.titre} — {STATUTS_BESOIN.find((s) => s.value === b.statut)?.label}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Factures</h4>
              <ul className="space-y-1">
                {factures
                  .filter((f) => f.prestataire_id === detailPrestataire.prestataire.id)
                  .map((f) => (
                    <li key={f.id} className="rounded border border-border px-2 py-1">
                      {f.numero_facture} — {f.montant_ttc} {f.devise} —{" "}
                      {STATUTS_FACTURE.find((s) => s.value === f.statut)?.label}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  openModifierPrestataire(detailPrestataire.prestataire);
                  setDetailPrestataire(null);
                }}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
              <Button
                className="flex-1"
                variant="danger"
                onClick={() => handleSupprimerPrestataire(detailPrestataire.prestataire)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer prestataire
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setFormFacture(emptyFacture(detailPrestataire.prestataire.id));
                setEditFacture(null);
                setModalFacture(true);
                setDetailPrestataire(null);
                setTab("factures");
              }}
            >
              <Plus className="h-4 w-4" />
              Ajouter une facture
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
