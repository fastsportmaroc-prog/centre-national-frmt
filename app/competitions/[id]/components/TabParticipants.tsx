"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  BUDGET_MEMBRE_EXTRA_TYPES,
  competitionParticipantTypeLabel,
} from "@/lib/constants/budget-membres";
import type { CompetitionParticipantType } from "@/lib/types/competition";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import type { CompetitionParticipantEnriched } from "@/lib/types/competition";
import {
  passeportAlerteLabel,
  visaStatutLabel,
} from "@/lib/competitions/passeport-competition";
import { mergeCompetitionParticipantsEnriched } from "@/lib/competitions/merge-participants-enriched";
import {
  joueurRoleBadgeClass,
  joueurRoleLabel,
  resolveJoueurSexe,
} from "@/lib/v2/joueur-sexe-display";
import { cn } from "@/lib/utils/cn";
import {
  CompetitionPersonSearch,
  type CompetitionPersonOption,
} from "@/app/competitions/[id]/components/CompetitionPersonSearch";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function TabParticipants({
  competitionId,
  dateFin,
  visasRequis = false,
  refreshKey = 0,
  onChanged,
}: {
  competitionId: string;
  dateFin: string;
  visasRequis?: boolean;
  refreshKey?: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<CompetitionParticipantEnriched[]>([]);
  const [joueurs, setJoueurs] = useState<Awaited<ReturnType<typeof getJoueurs>>>([]);
  const [coachs, setCoachs] = useState<Awaited<ReturnType<typeof getEntraineurs>>>([]);
  const [pickKey, setPickKey] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [staffType, setStaffType] = useState<CompetitionParticipantType>("kine");
  const [staffPrenom, setStaffPrenom] = useState("");
  const [staffNom, setStaffNom] = useState("");

  const load = useCallback(async () => {
    const [res, j, c] = await Promise.all([
      fetch(`/api/competitions/${competitionId}/participants?date_fin=${encodeURIComponent(dateFin)}`),
      getJoueurs(),
      getEntraineurs(),
    ]);
    const json = await res.json();
    const raw: CompetitionParticipantEnriched[] = json.participants ?? [];
    setParticipants(
      mergeCompetitionParticipantsEnriched(raw, j, c, { dateFin, visasRequis })
    );
    setJoueurs(j);
    setCoachs(c);
  }, [competitionId, dateFin, visasRequis]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const already = useMemo(
    () => new Set(participants.map((p) => `${p.participant_type}:${p.participant_id}`)),
    [participants]
  );

  const addOptions = useMemo((): CompetitionPersonOption[] => {
    const out: CompetitionPersonOption[] = [];
    for (const j of joueurs) {
      if (already.has(`joueur:${j.id}`)) continue;
      out.push({
        key: `joueur:${j.id}`,
        participant_id: j.id,
        participant_type: "joueur",
        prenom: j.prenom,
        nom: j.nom,
        roleLabel: joueurRoleLabel(
          resolveJoueurSexe({
            sexe: j.sexe,
            categorie_age: j.categorie_age,
            categorie: j.categorie,
            nom: j.nom,
            prenom: j.prenom,
          })
        ),
        detail: [j.categorie_age, j.club].filter(Boolean).join(" · ") || null,
      });
    }
    for (const c of coachs) {
      if (already.has(`coach:${c.id}`)) continue;
      out.push({
        key: `coach:${c.id}`,
        participant_id: c.id,
        participant_type: "coach",
        prenom: c.prenom,
        nom: c.nom,
        roleLabel: "Coach",
        detail: c.specialite ?? null,
      });
    }
    return out.sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")
    );
  }, [joueurs, coachs, already]);

  const displayed = useMemo(() => {
    const q = normalize(listFilter.trim());
    if (!q) return participants;
    return participants.filter((p) => {
      const hay = normalize(
        `${p.prenom} ${p.nom} ${p.poste} ${p.fonction ?? ""} ${p.participant_type} ${
          p.participant_type === "joueur" ? joueurRoleLabel(p.sexe ?? null) : "coach"
        }`
      );
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [participants, listFilter]);

  async function addStaffMember() {
    const nom = staffNom.trim();
    if (!nom) {
      toast("Saisissez le nom du membre", "info");
      return;
    }
    const res = await fetch(`/api/competitions/${competitionId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_type: staffType,
        prenom: staffPrenom.trim() || null,
        nom,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast(`${competitionParticipantTypeLabel(staffType)} ajouté`, "success");
    setStaffPrenom("");
    setStaffNom("");
    await load();
    onChanged();
  }

  async function addSelected() {
    const opt = addOptions.find((o) => o.key === pickKey);
    if (!opt) {
      toast("Choisissez une personne dans la liste", "info");
      return;
    }
    const res = await fetch(`/api/competitions/${competitionId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: opt.participant_id,
        participant_type: opt.participant_type,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast(
      opt.participant_type === "coach"
        ? `Coach ${opt.prenom} ${opt.nom} ajouté`
        : `Joueur ${opt.prenom} ${opt.nom} ajouté`,
      "success"
    );
    setPickKey("");
    await load();
    onChanged();
  }

  async function remove(rowId: string) {
    const res = await fetch(
      `/api/competitions/${competitionId}/participants?row_id=${rowId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast("Retiré", "success");
    await load();
    onChanged();
  }

  const coachCount = participants.filter((p) => p.participant_type === "coach").length;
  const staffCount = participants.filter((p) =>
    ["kine", "federal", "autre"].includes(p.participant_type)
  ).length;
  const joueurCount = participants.filter((p) => p.participant_type === "joueur").length;
  const joueusesF = participants.filter((p) => p.participant_type === "joueur" && p.sexe === "F").length;
  const joueursM = participants.filter((p) => p.participant_type === "joueur" && p.sexe === "M").length;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted">
          {joueurCount} sportif{joueurCount !== 1 ? "s" : ""} ({joueursM} joueur
          {joueursM !== 1 ? "s" : ""}, {joueusesF} joueuse{joueusesF !== 1 ? "s" : ""}) · {coachCount}{" "}
          coach{coachCount !== 1 ? "s" : ""}
          {staffCount > 0 && (
            <>
              {" "}
              · {staffCount} autre{staffCount !== 1 ? "s" : ""} membre
              {staffCount !== 1 ? "s" : ""}
            </>
          )}
          {visasRequis ? " · Visas requis" : " · Sans suivi visa"}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <CompetitionPersonSearch
            value={pickKey}
            options={addOptions}
            onSelect={(opt) => setPickKey(opt.key)}
          />
          <Button onClick={() => void addSelected()}>Ajouter joueur / coach</Button>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-sky-500/40 bg-sky-500/5 p-3">
          <p className="mb-2 text-xs font-medium text-[var(--fg)]">
            Membre kiné, fédéral ou autre
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px]">
              <Label className="text-xs">Type</Label>
              <Select
                value={staffType}
                onChange={(e) => setStaffType(e.target.value as CompetitionParticipantType)}
                className="mt-1"
              >
                {BUDGET_MEMBRE_EXTRA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">Prénom</Label>
              <Input
                value={staffPrenom}
                onChange={(e) => setStaffPrenom(e.target.value)}
                className="mt-1"
                placeholder="Optionnel"
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Nom</Label>
              <Input
                value={staffNom}
                onChange={(e) => setStaffNom(e.target.value)}
                className="mt-1"
                placeholder="Obligatoire"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void addStaffMember()}>
              Ajouter membre
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <Input
          placeholder="Filtrer la liste (nom, prénom, coach, joueur)…"
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
        />
      </Card>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="v2-data-table w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Prénom</th>
              <th className="p-2 text-left">Nom</th>
              <th className="p-2 text-left">Rôle</th>
              <th className="p-2 text-left">Fonction / spécialité</th>
              <th className="p-2 text-left">Passeport</th>
              <th className="p-2 text-left">Visa</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {displayed.map((p) => (
              <tr key={p.id}>
                <td className="p-2">{p.prenom || "—"}</td>
                <td className="p-2 font-medium">{p.nom || "—"}</td>
                <td className="p-2">
                  {p.participant_type === "coach" ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-amber-500/30">
                      Coach
                    </span>
                  ) : ["kine", "federal", "autre"].includes(p.participant_type) ? (
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-200 ring-1 ring-sky-500/30">
                      {competitionParticipantTypeLabel(p.participant_type)}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                        joueurRoleBadgeClass(p.sexe ?? null)
                      )}
                    >
                      {joueurRoleLabel(p.sexe ?? null)}
                    </span>
                  )}
                </td>
                <td className="p-2 text-muted">
                  {p.participant_type === "coach"
                    ? p.fonction ?? "—"
                    : ["kine", "federal", "autre"].includes(p.participant_type)
                      ? p.fonction ?? p.libelle ?? "—"
                      : "—"}
                </td>
                <td className="p-2">{passeportAlerteLabel(p.passeport_alerte)}</td>
                <td className="p-2">{visaStatutLabel(p.visa_statut)}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => void remove(p.id)}>
                    Retirer
                  </Button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  Aucun participant
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
