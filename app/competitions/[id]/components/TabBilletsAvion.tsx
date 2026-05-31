"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, FileText, Upload } from "lucide-react";
import { AirportAutocomplete } from "@/components/billets/AirportAutocomplete";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { mergeCompetitionParticipantsEnriched } from "@/lib/competitions/merge-participants-enriched";
import { uploadDocument } from "@/lib/storage/upload-document";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import type {
  CompetitionBillet,
  CompetitionBilletFacture,
  CompetitionBilletLegInput,
  CompetitionParticipantEnriched,
} from "@/lib/types/competition";

type LegForm = {
  enabled: boolean;
  date_vol: string;
  heure: string;
  numero_vol: string;
  compagnie: string;
  aeroport_depart: string;
  aeroport_retour: string;
  aeroport_depart_iata: string | null;
  aeroport_retour_iata: string | null;
};

const emptyLeg = (): LegForm => ({
  enabled: true,
  date_vol: "",
  heure: "",
  numero_vol: "",
  compagnie: "",
  aeroport_depart: "CMN - Casablanca",
  aeroport_retour: "",
  aeroport_depart_iata: "CMN",
  aeroport_retour_iata: null,
});

function formatMontant(n: number | null | undefined, devise = "MAD") {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;
}

export function TabBilletsAvion({
  competitionId,
  competitionNom,
  dateFin,
}: {
  competitionId: string;
  competitionNom?: string;
  dateFin: string;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [billets, setBillets] = useState<CompetitionBillet[]>([]);
  const [participants, setParticipants] = useState<CompetitionParticipantEnriched[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [singleParticipantId, setSingleParticipantId] = useState("");
  const [statut, setStatut] = useState<CompetitionBillet["statut"]>("en_attente");
  const [tarifMode, setTarifMode] = useState<"individuel" | "groupe">("individuel");
  const [montantUnitaire, setMontantUnitaire] = useState("");
  const [montantGroupe, setMontantGroupe] = useState("");
  const [devise, setDevise] = useState("MAD");
  const [aller, setAller] = useState<LegForm>(() => ({ ...emptyLeg(), enabled: true }));
  const [retour, setRetour] = useState<LegForm>(() => ({
    ...emptyLeg(),
    enabled: false,
    aeroport_depart: "",
    aeroport_retour: "CMN - Casablanca",
    aeroport_depart_iata: null,
    aeroport_retour_iata: "CMN",
  }));
  const [saving, setSaving] = useState(false);
  const [facture, setFacture] = useState<CompetitionBilletFacture | null>(null);
  const [prestataire, setPrestataire] = useState("");
  const [factureMontant, setFactureMontant] = useState("");
  const [factureUrl, setFactureUrl] = useState("");
  const [factureRef, setFactureRef] = useState("");
  const [savingFacture, setSavingFacture] = useState(false);

  const load = useCallback(async () => {
    const [bRes, pRes, fRes, joueurs, coachs] = await Promise.all([
      fetch(`/api/competitions/${competitionId}/billets`),
      fetch(
        `/api/competitions/${competitionId}/participants?date_fin=${encodeURIComponent(dateFin)}`
      ),
      fetch(`/api/competitions/${competitionId}/billets/facture`),
      getJoueurs(),
      getEntraineurs(),
    ]);
    const bJson = await bRes.json();
    const pJson = await pRes.json();
    const fJson = await fRes.json();
    setBillets(bJson.billets ?? []);
    const raw: CompetitionParticipantEnriched[] = pJson.participants ?? [];
    setParticipants(mergeCompetitionParticipantsEnriched(raw, joueurs, coachs));
    if (fJson.tarif?.tarif_mode) setTarifMode(fJson.tarif.tarif_mode);
    if (fJson.tarif?.montant_groupe != null) setMontantGroupe(String(fJson.tarif.montant_groupe));
    const f = fJson.facture as CompetitionBilletFacture | null;
    setFacture(f);
    setPrestataire(f?.prestataire_nom ?? "");
    setFactureMontant(f?.montant != null ? String(f.montant) : "");
    setFactureUrl(f?.facture_url ?? "");
    setFactureRef(f?.reference ?? "");
    if (bJson.billets?.[0]?.devise) setDevise(bJson.billets[0].devise);
    if (fJson.tarif?.tarif_mode === "individuel" && bJson.billets?.[0]?.montant != null) {
      setMontantUnitaire(String(bJson.billets[0].montant));
    }
  }, [competitionId, dateFin]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) {
      m.set(
        p.participant_id,
        `${p.prenom} ${p.nom}`.trim() +
        (p.participant_type === "joueur"
          ? ""
          : ` (${p.participant_type === "coach" ? "Coach" : p.poste})`)
      );
    }
    return m;
  }, [participants]);

  const totalBilletsMontant = useMemo(() => {
    if (tarifMode === "groupe" && montantGroupe) return Number(montantGroupe);
    return billets.reduce((s, b) => s + Number(b.montant ?? 0), 0);
  }, [billets, tarifMode, montantGroupe]);

  function participantName(id: string) {
    return nameMap.get(id) ?? id.slice(0, 8);
  }

  function legToPayload(leg: LegForm): CompetitionBilletLegInput | null {
    if (!leg.enabled || !leg.date_vol) return null;
    return {
      date_vol: leg.date_vol,
      heure: leg.heure || null,
      numero_vol: leg.numero_vol || null,
      compagnie: leg.compagnie || null,
      aeroport_depart: leg.aeroport_depart || null,
      aeroport_retour: leg.aeroport_retour || null,
      aeroport_depart_iata: leg.aeroport_depart_iata,
      aeroport_retour_iata: leg.aeroport_retour_iata,
      statut,
    };
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    const allerPayload = legToPayload(aller);
    const retourPayload = legToPayload(retour);
    if (!allerPayload && !retourPayload) {
      toast("Activez et renseignez au moins un vol aller ou retour", "info");
      return;
    }
    if (!applyToAll && !singleParticipantId) {
      toast("Choisissez un participant ou cochez « toute l'équipe »", "info");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/competitions/${competitionId}/billets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apply_to_all: applyToAll,
        participant_ids: applyToAll ? undefined : [singleParticipantId],
        aller: allerPayload ?? undefined,
        retour: retourPayload ?? undefined,
        tarif_mode: tarifMode,
        montant_unitaire: tarifMode === "individuel" ? Number(montantUnitaire) || null : null,
        montant_groupe: tarifMode === "groupe" ? Number(montantGroupe) || null : null,
        devise,
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast(json.error ?? "Erreur enregistrement", "error");
      return;
    }
    toast(
      applyToAll
        ? `${json.count ?? 0} billet(s) créés pour toute l'équipe`
        : "Billet(s) enregistré(s)",
      "success"
    );
    await load();
  }

  async function saveFacture(overrideUrl?: string) {
    setSavingFacture(true);
    const res = await fetch(`/api/competitions/${competitionId}/billets/facture`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prestataire_nom: prestataire || null,
        montant: Number(factureMontant) || 0,
        facture_url: (overrideUrl ?? factureUrl) || null,
        reference: factureRef || null,
        notes: null,
      }),
    });
    const json = await res.json();
    setSavingFacture(false);
    if (!res.ok) {
      toast(json.error ?? "Erreur facture", "error");
      return;
    }
    toast("Facture prestataire enregistrée", "success");
    setFacture(json.facture ?? null);
  }

  async function uploadFactureFile(file: File) {
    try {
      const url = await uploadDocument(file, `factures/billets-competition/${competitionId}`);
      setFactureUrl(url);
      toast("Facture uploadée", "success");
      await saveFacture(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur upload", "error");
    }
  }

  async function remove(id: string) {
    const res = await fetch(
      `/api/competitions/${competitionId}/billets?billet_id=${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast("Suppression impossible", "error");
      return;
    }
    await load();
  }

  function LegFields({
    title,
    leg,
    setLeg,
    isRetour,
  }: {
    title: string;
    leg: LegForm;
    setLeg: (v: LegForm) => void;
    isRetour?: boolean;
  }) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-3">
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={leg.enabled}
            onChange={(e) => setLeg({ ...leg, enabled: e.target.checked })}
          />
          {title}
        </label>
        {leg.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={leg.date_vol}
                onChange={(e) => setLeg({ ...leg, date_vol: e.target.value })}
              />
            </div>
            <div>
              <Label>Heure</Label>
              <Input
                type="time"
                value={leg.heure}
                onChange={(e) => setLeg({ ...leg, heure: e.target.value })}
              />
            </div>
            <AirportAutocomplete
              label={isRetour ? "Aéroport de départ (ville monde)" : "Aéroport de départ"}
              value={leg.aeroport_depart}
              iataCode={leg.aeroport_depart_iata}
              onChange={(ville, iata) =>
                setLeg({ ...leg, aeroport_depart: ville, aeroport_depart_iata: iata })
              }
            />
            <AirportAutocomplete
              label={isRetour ? "Aéroport d'arrivée" : "Aéroport d'arrivée (destination)"}
              value={leg.aeroport_retour}
              iataCode={leg.aeroport_retour_iata}
              onChange={(ville, iata) =>
                setLeg({ ...leg, aeroport_retour: ville, aeroport_retour_iata: iata })
              }
            />
            <div>
              <Label>N° vol</Label>
              <Input
                value={leg.numero_vol}
                onChange={(e) => setLeg({ ...leg, numero_vol: e.target.value })}
              />
            </div>
            <div>
              <Label>Compagnie</Label>
              <Input
                value={leg.compagnie}
                onChange={(e) => setLeg({ ...leg, compagnie: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 border-frmt-gold/20 bg-[#161b22] p-4">
        <div>
          <p className="text-sm font-semibold text-[#e6edf3]">Rubrique Billets avion (V2)</p>
          <p className="text-xs text-muted">
            Les billets de cette compétition sont visibles dans la rubrique centrale Billets avion.
          </p>
        </div>
        <Link href={`/v2/billets-avion?competition=${competitionId}`}>
          <Button type="button" variant="secondary" size="sm">
            <ExternalLink className="mr-1 h-4 w-4" />
            Ouvrir Billets avion
            {competitionNom ? ` — ${competitionNom}` : ""}
          </Button>
        </Link>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4 text-frmt-gold" />
          Facture prestataire (agence / compagnie)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Prestataire</Label>
            <Input
              placeholder="Agence de voyage, compagnie…"
              value={prestataire}
              onChange={(e) => setPrestataire(e.target.value)}
            />
          </div>
          <div>
            <Label>Montant facture (MAD)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={factureMontant}
              onChange={(e) => setFactureMontant(e.target.value)}
            />
          </div>
          <div>
            <Label>Référence facture</Label>
            <Input value={factureRef} onChange={(e) => setFactureRef(e.target.value)} />
          </div>
          <div>
            <Label>URL facture (PDF / image)</Label>
            <Input value={factureUrl} onChange={(e) => setFactureUrl(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={savingFacture} onClick={() => void saveFacture()}>
            {savingFacture ? "Enregistrement…" : "Enregistrer facture"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-4 w-4" />
            Uploader PDF
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFactureFile(f);
              e.target.value = "";
            }}
          />
          {factureUrl && (
            <a
              href={factureUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-frmt-gold underline-offset-2 hover:underline"
            >
              Voir facture
            </a>
          )}
        </div>
        {facture && (
          <p className="text-xs text-emerald-300">
            Facture enregistrée — {formatMontant(facture.montant)} · budget billets mis à jour
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <form className="space-y-4" onSubmit={saveTeam}>
          <h3 className="font-semibold">Réservation vols — équipe ou individuel</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            Même billet pour toute l&apos;équipe ({participants.length} participant
            {participants.length !== 1 ? "s" : ""} — joueurs et coaches)
          </label>
          {!applyToAll && (
            <div>
              <Label>Participant seul</Label>
              <Select
                value={singleParticipantId}
                onChange={(e) => setSingleParticipantId(e.target.value)}
              >
                <option value="">—</option>
                {participants.map((p) => (
                  <option key={p.participant_id} value={p.participant_id}>
                    {p.prenom} {p.nom} (
                    {p.participant_type === "joueur"
                      ? "Joueur"
                      : p.participant_type === "coach"
                        ? "Coach"
                        : p.poste})
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Statut billet</Label>
              <Select
                value={statut}
                onChange={(e) => setStatut(e.target.value as CompetitionBillet["statut"])}
              >
                <option value="en_attente">En attente</option>
                <option value="reserve">Réservé</option>
                <option value="confirme">Confirmé</option>
              </Select>
            </div>
            <div>
              <Label>Tarification</Label>
              <Select
                value={tarifMode}
                onChange={(e) => setTarifMode(e.target.value as "individuel" | "groupe")}
              >
                <option value="individuel">Montant par billet (individuel)</option>
                <option value="groupe">Montant groupe (équipe)</option>
              </Select>
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={devise} onChange={(e) => setDevise(e.target.value)}>
                <option value="MAD">MAD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>
          {tarifMode === "individuel" ? (
            <div className="max-w-xs">
              <Label>Montant par billet</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={montantUnitaire}
                onChange={(e) => setMontantUnitaire(e.target.value)}
                placeholder="Ex. 4500"
              />
            </div>
          ) : (
            <div className="max-w-xs">
              <Label>Montant total groupe (toute l&apos;équipe)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={montantGroupe}
                onChange={(e) => setMontantGroupe(e.target.value)}
                placeholder="Ex. 85000"
              />
              <p className="mt-1 text-xs text-muted">
                Réparti automatiquement sur chaque billet enregistré.
              </p>
            </div>
          )}
          <LegFields title="Vol aller" leg={aller} setLeg={setAller} />
          <LegFields title="Vol retour" leg={retour} setLeg={setRetour} isRetour />
          <Button type="submit" disabled={saving || participants.length === 0}>
            {saving ? "Enregistrement…" : "Enregistrer les billets"}
          </Button>
          {participants.length === 0 && (
            <p className="text-xs text-amber-400">
              Ajoutez des participants dans l&apos;onglet Participants avant de réserver des billets.
            </p>
          )}
        </form>
      </Card>

      <Card className="p-4 text-sm">
        <p className="text-muted">Total billets compétition</p>
        <p className="text-xl font-bold text-frmt-gold">
          {formatMontant(totalBilletsMontant, devise)}
          {tarifMode === "groupe" ? " (groupe)" : " (individuel)"}
        </p>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="v2-data-table w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Participant</th>
              <th className="p-2 text-left">Sens</th>
              <th className="p-2 text-left">Trajet</th>
              <th className="p-2 text-left">Date / Heure</th>
              <th className="p-2 text-left">Vol</th>
              <th className="p-2 text-right">Montant</th>
              <th className="p-2 text-left">Statut</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {billets.map((b) => (
              <tr key={b.id}>
                <td className="p-2">{participantName(b.participant_id)}</td>
                <td className="p-2 capitalize">{b.type}</td>
                <td className="p-2 text-xs">
                  {b.aeroport_depart ?? "—"}
                  {b.aeroport_retour ? ` → ${b.aeroport_retour}` : ""}
                </td>
                <td className="p-2">
                  {b.date_vol} {b.heure ?? ""}
                </td>
                <td className="p-2">
                  {b.compagnie ?? "—"} {b.numero_vol ? `· ${b.numero_vol}` : ""}
                </td>
                <td className="p-2 text-right font-medium">
                  {formatMontant(b.montant, b.devise ?? devise)}
                </td>
                <td className="p-2">
                  <StatusBadge statut={b.statut} />
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => void remove(b.id)}>
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
            {billets.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted">
                  Aucun billet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
