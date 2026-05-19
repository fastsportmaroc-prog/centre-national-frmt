"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { DocumentUpload } from "./DocumentUpload";
import {
  addVisa,
  getDossierByJoueurId,
  getPasseportVisaAlertes,
  removeVisa,
  upsertDossierPasseport,
} from "@/lib/data/passeport";
import { PasseportAlertesBanner } from "@/components/passeport/PasseportAlertesBanner";
import {
  alertesPourJoueur,
  getPasseportExpirationAlert,
  getVisaExpirationAlert,
  joueurAAlerte,
  type PasseportAlerte,
} from "@/lib/utils/passeport-alertes";
import { getJoueurs } from "@/lib/data/joueurs";
import { uploadDocument } from "@/lib/storage/upload-document";
import { TYPES_VISA } from "@/lib/constants/passeport";
import type { DossierPasseport, DossierPasseportInput } from "@/lib/types/passeport";
import type { Joueur } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, Plus, Save, Shield, Trash2 } from "lucide-react";

function emptyDossier(joueurId: string): DossierPasseportInput {
  return {
    joueur_id: joueurId,
    numero_passeport: null,
    pays_emission: "Maroc",
    date_emission: null,
    date_expiration: null,
    image_passeport_url: null,
    visas: [],
    assurance: null,
    notes: null,
  };
}

function dossierToInput(d: DossierPasseport): DossierPasseportInput {
  return {
    joueur_id: d.joueur_id,
    numero_passeport: d.numero_passeport,
    pays_emission: d.pays_emission,
    date_emission: d.date_emission,
    date_expiration: d.date_expiration,
    image_passeport_url: d.image_passeport_url,
    visas: d.visas,
    assurance: d.assurance,
    notes: d.notes,
  };
}

function alertBorderClass(level: ReturnType<typeof getPasseportExpirationAlert>) {
  if (level === "expire") return "border-red-500/50 bg-red-500/10";
  if (level === "bientot") return "border-amber-500/50 bg-amber-500/10";
  return "";
}

export function PasseportClient() {
  const searchParams = useSearchParams();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allAlertes, setAllAlertes] = useState<PasseportAlerte[]>([]);
  const [form, setForm] = useState<DossierPasseportInput | null>(null);
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [visaOpen, setVisaOpen] = useState(false);
  const [newVisa, setNewVisa] = useState({
    pays: "",
    type_visa: "tournoi",
    date_debut: "",
    date_fin: "",
    numero_visa: "",
    notes: "",
  });

  const loadJoueur = useCallback(async (joueurId: string) => {
    const existing = await getDossierByJoueurId(joueurId);
    if (existing) {
      setForm(dossierToInput(existing));
      setDossierId(existing.id);
    } else {
      setForm(emptyDossier(joueurId));
      setDossierId(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([getJoueurs(), getPasseportVisaAlertes()]).then(([j, alertes]) => {
      setJoueurs(j);
      setAllAlertes(alertes);
      const fromUrl = searchParams.get("joueur");
      if (fromUrl && j.some((x) => x.id === fromUrl)) {
        setSelectedId(fromUrl);
      } else if (j.length) {
        setSelectedId(j[0].id);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (selectedId) loadJoueur(selectedId);
  }, [selectedId, loadJoueur]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return joueurs;
    return joueurs.filter(
      (j) =>
        j.prenom.toLowerCase().includes(q) ||
        j.nom.toLowerCase().includes(q)
    );
  }, [joueurs, search]);

  const selectedJoueur = joueurs.find((j) => j.id === selectedId);
  const alertesJoueur = useMemo(
    () => (selectedId ? alertesPourJoueur(allAlertes, selectedId) : []),
    [allAlertes, selectedId]
  );
  const passeportAlert = getPasseportExpirationAlert(form?.date_expiration ?? null);

  async function refreshAlertes() {
    setAllAlertes(await getPasseportVisaAlertes());
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await upsertDossierPasseport(form);
      setDossierId(saved.id);
      setForm(dossierToInput(saved));
      await refreshAlertes();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVisa() {
    if (!form) return;
    let id = dossierId;
    if (!id) {
      const saved = await upsertDossierPasseport(form);
      id = saved.id;
      setDossierId(id);
      setForm(dossierToInput(saved));
    }
    const updated = await addVisa(id, {
      pays: newVisa.pays,
      type_visa: newVisa.type_visa,
      date_debut: newVisa.date_debut || null,
      date_fin: newVisa.date_fin || null,
      numero_visa: newVisa.numero_visa || null,
      image_visa_url: null,
      photo_visa_url: null,
      notes: newVisa.notes || null,
    });
    setForm(dossierToInput(updated));
    setVisaOpen(false);
    setNewVisa({
      pays: "",
      type_visa: "tournoi",
      date_debut: "",
      date_fin: "",
      numero_visa: "",
      notes: "",
    });
  }

  if (!form || !selectedJoueur) {
    return (
      <>
        <PageHeader title="Passeport & voyages" description="Chargement…" />
        <main className="p-6 text-muted">Chargement des dossiers…</main>
      </>
    );
  }

  const uploadFor = (sub: string) => (file: File) =>
    uploadDocument(file, `passeport/${selectedId}/${sub}`);

  return (
    <>
      <PageHeader
        title="Passeport & voyages"
        description="Passeport, visas, photos visa et assurance voyage par joueur"
      />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <PasseportAlertesBanner
          alertes={allAlertes}
          onSelectJoueur={(id) => setSelectedId(id)}
        />

        <div className="flex flex-1 flex-col gap-4 lg:flex-row min-h-0">
        <Card className="lg:w-72 shrink-0 flex flex-col max-h-[calc(100vh-12rem)]">
          <Label className="mb-2">Joueur</Label>
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <ul className="flex-1 space-y-1 overflow-y-auto pr-1 -mr-1">
            {filtered.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(j.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selectedId === j.id
                      ? "bg-frmt-green/15 text-frmt-green font-medium"
                      : "hover:bg-surface-elevated text-muted"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      {j.prenom} {j.nom}
                    </span>
                    {joueurAAlerte(allAlertes, j.id) && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1">
          {alertesJoueur.length > 0 && (
            <PasseportAlertesBanner alertes={alertesJoueur} compact showActions={false} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedJoueur.prenom} {selectedJoueur.nom}
              </h2>
              <p className="text-sm text-muted">{selectedJoueur.nationalite ?? "—"}</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              Enregistrer le dossier
            </Button>
          </div>

          <Card className={passeportAlert ? alertBorderClass(passeportAlert) : undefined}>
            <h3 className="mb-4 flex flex-wrap items-center gap-2 font-semibold">
              <Badge>Passeport</Badge>
              {passeportAlert && (
                <Badge variant={passeportAlert === "expire" ? "danger" : "warning"}>
                  {passeportAlert === "expire" ? "Expiré" : "Expire < 6 mois"}
                </Badge>
              )}
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>N° passeport</Label>
                  <Input
                    value={form.numero_passeport ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, numero_passeport: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <Label>Pays d&apos;émission</Label>
                  <Input
                    value={form.pays_emission ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, pays_emission: e.target.value || null })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date émission</Label>
                    <Input
                      type="date"
                      value={form.date_emission ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, date_emission: e.target.value || null })
                      }
                    />
                  </div>
                  <div>
                    <Label>Date expiration</Label>
                    <Input
                      type="date"
                      className={passeportAlert ? alertBorderClass(passeportAlert) : undefined}
                      value={form.date_expiration ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, date_expiration: e.target.value || null })
                      }
                    />
                  </div>
                </div>
              </div>
              <DocumentUpload
                label="Image du passeport"
                hint="Scan ou photo de la page d'identité"
                currentUrl={form.image_passeport_url}
                onUploaded={(url) =>
                  setForm({ ...form, image_passeport_url: url })
                }
                onUpload={uploadFor("passeport")}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Visas</h3>
              <Button size="sm" variant="secondary" onClick={() => setVisaOpen(!visaOpen)}>
                <Plus className="h-4 w-4" />
                Ajouter un visa
              </Button>
            </div>
            {visaOpen && (
              <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-elevated p-4 sm:grid-cols-2">
                <div>
                  <Label>Pays</Label>
                  <Input
                    value={newVisa.pays}
                    onChange={(e) => setNewVisa({ ...newVisa, pays: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newVisa.type_visa}
                    onChange={(e) => setNewVisa({ ...newVisa, type_visa: e.target.value })}
                  >
                    {TYPES_VISA.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Début</Label>
                  <Input
                    type="date"
                    value={newVisa.date_debut}
                    onChange={(e) => setNewVisa({ ...newVisa, date_debut: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input
                    type="date"
                    value={newVisa.date_fin}
                    onChange={(e) => setNewVisa({ ...newVisa, date_fin: e.target.value })}
                  />
                </div>
                <Button className="sm:col-span-2" onClick={handleAddVisa}>
                  Enregistrer le visa
                </Button>
              </div>
            )}
            {form.visas.length === 0 ? (
              <p className="text-sm text-muted">Aucun visa enregistré.</p>
            ) : (
              <ul className="space-y-4">
                {form.visas.map((v) => {
                  const visaAlert = getVisaExpirationAlert(v.date_fin);
                  return (
                  <li
                    key={v.id}
                    className={cn(
                      "rounded-lg border p-4 space-y-3",
                      visaAlert ? alertBorderClass(visaAlert) : "border-border"
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium flex flex-wrap items-center gap-2">
                          {v.pays} — {TYPES_VISA.find((t) => t.value === v.type_visa)?.label ?? v.type_visa}
                          {visaAlert && (
                            <Badge variant={visaAlert === "expire" ? "danger" : "warning"}>
                              {visaAlert === "expire" ? "Visa expiré" : "Visa < 2 mois"}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {v.date_debut ? formatDate(v.date_debut) : "—"} →{" "}
                          {v.date_fin ? formatDate(v.date_fin) : "—"}
                        </p>
                      </div>
                      {dossierId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeVisa(dossierId, v.id).then(async (d) => {
                              setForm(dossierToInput(d));
                              await refreshAlertes();
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DocumentUpload
                        label="Image du visa (scan)"
                        currentUrl={v.image_visa_url}
                        onUploaded={async (url) => {
                          const visas = form.visas.map((x) =>
                            x.id === v.id ? { ...x, image_visa_url: url } : x
                          );
                          const next = { ...form, visas };
                          setForm(next);
                          await upsertDossierPasseport(next);
                        }}
                        onUpload={uploadFor(`visa-${v.id}-scan`)}
                      />
                      <DocumentUpload
                        label="Photo visa"
                        hint="Photo format visa / biométrique"
                        currentUrl={v.photo_visa_url}
                        onUploaded={async (url) => {
                          const visas = form.visas.map((x) =>
                            x.id === v.id ? { ...x, photo_visa_url: url } : x
                          );
                          const next = { ...form, visas };
                          setForm(next);
                          await upsertDossierPasseport(next);
                        }}
                        onUpload={uploadFor(`visa-${v.id}-photo`)}
                      />
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-frmt-green" />
              Assurance voyage
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>Compagnie</Label>
                  <Input
                    value={form.assurance?.compagnie ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assurance: {
                          ...(form.assurance ?? {
                            compagnie: null,
                            numero_police: null,
                            date_debut: null,
                            date_fin: null,
                            couverture: null,
                            image_url: null,
                          }),
                          compagnie: e.target.value || null,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>N° police</Label>
                  <Input
                    value={form.assurance?.numero_police ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assurance: {
                          ...(form.assurance ?? {
                            compagnie: null,
                            numero_police: null,
                            date_debut: null,
                            date_fin: null,
                            couverture: null,
                            image_url: null,
                          }),
                          numero_police: e.target.value || null,
                        },
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Début</Label>
                    <Input
                      type="date"
                      value={form.assurance?.date_debut ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          assurance: {
                            ...(form.assurance ?? {
                              compagnie: null,
                              numero_police: null,
                              date_debut: null,
                              date_fin: null,
                              couverture: null,
                              image_url: null,
                            }),
                            date_debut: e.target.value || null,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input
                      type="date"
                      value={form.assurance?.date_fin ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          assurance: {
                            ...(form.assurance ?? {
                              compagnie: null,
                              numero_police: null,
                              date_debut: null,
                              date_fin: null,
                              couverture: null,
                              image_url: null,
                            }),
                            date_fin: e.target.value || null,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Couverture</Label>
                  <Textarea
                    value={form.assurance?.couverture ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assurance: {
                          ...(form.assurance ?? {
                            compagnie: null,
                            numero_police: null,
                            date_debut: null,
                            date_fin: null,
                            couverture: null,
                            image_url: null,
                          }),
                          couverture: e.target.value || null,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <DocumentUpload
                label="Attestation / contrat assurance"
                currentUrl={form.assurance?.image_url ?? null}
                onUploaded={(url) =>
                  setForm({
                    ...form,
                    assurance: {
                      ...(form.assurance ?? {
                        compagnie: null,
                        numero_police: null,
                        date_debut: null,
                        date_fin: null,
                        couverture: null,
                        image_url: null,
                      }),
                      image_url: url,
                    },
                  })
                }
                onUpload={uploadFor("assurance")}
              />
            </div>
          </Card>

          <Card>
            <Label>Notes</Label>
            <Textarea
              className="mt-2"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            />
          </Card>
        </div>
        </div>
      </main>
    </>
  );
}
