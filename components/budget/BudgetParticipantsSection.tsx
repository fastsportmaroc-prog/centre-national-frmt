"use client";

import { useMemo, useState } from "react";
import { Label, Select } from "@/components/ui/Input";
import { BudgetParticipantPicker, type ParticipantOption } from "@/components/budget/BudgetParticipantPicker";
import { UserPlus, Users } from "lucide-react";

type Props = {
  joueurs: ParticipantOption[];
  entraineurs: ParticipantOption[];
  joueurIds: string[];
  coachIds: string[];
  onJoueursChange: (ids: string[]) => void;
  onCoachsChange: (ids: string[]) => void;
};

export function BudgetParticipantsSection({
  joueurs,
  entraineurs,
  joueurIds,
  coachIds,
  onJoueursChange,
  onCoachsChange,
}: Props) {
  const [joueurMenuKey, setJoueurMenuKey] = useState(0);
  const [coachMenuKey, setCoachMenuKey] = useState(0);

  const availableJoueurs = useMemo(
    () => joueurs.filter((j) => !joueurIds.includes(j.id)),
    [joueurs, joueurIds]
  );
  const availableCoachs = useMemo(
    () => entraineurs.filter((c) => !coachIds.includes(c.id)),
    [entraineurs, coachIds]
  );

  function addJoueur(id: string) {
    if (id && !joueurIds.includes(id)) onJoueursChange([...joueurIds, id]);
  }

  function addCoach(id: string) {
    if (id && !coachIds.includes(id)) onCoachsChange([...coachIds, id]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Ajoutez autant de joueurs et d&apos;entraîneurs que nécessaire sur le même budget — via le
        menu ou la recherche ci-dessous.
      </p>

      <div className="grid gap-3 rounded-lg border border-dashed border-frmt-green/40 bg-frmt-green/5 p-3 sm:grid-cols-2">
        <div>
          <Label className="flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" />
            Ajouter un joueur (menu)
          </Label>
          <Select
            key={joueurMenuKey}
            value=""
            onChange={(e) => {
              addJoueur(e.target.value);
              setJoueurMenuKey((k) => k + 1);
            }}
            className="mt-1"
          >
            <option value="">— Choisir un joueur —</option>
            {availableJoueurs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
                {j.subtitle ? ` — ${j.subtitle}` : ""}
              </option>
            ))}
          </Select>
          {availableJoueurs.length === 0 && joueurIds.length > 0 && (
            <p className="mt-1 text-[10px] text-muted">Tous les joueurs listés sont déjà ajoutés.</p>
          )}
        </div>
        <div>
          <Label className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Ajouter un entraîneur (menu)
          </Label>
          <Select
            key={coachMenuKey}
            value=""
            onChange={(e) => {
              addCoach(e.target.value);
              setCoachMenuKey((k) => k + 1);
            }}
            className="mt-1"
          >
            <option value="">— Choisir un entraîneur —</option>
            {availableCoachs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.subtitle ? ` — ${c.subtitle}` : ""}
              </option>
            ))}
          </Select>
          {availableCoachs.length === 0 && coachIds.length > 0 && (
            <p className="mt-1 text-[10px] text-muted">Tous les coachs listés sont déjà ajoutés.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BudgetParticipantPicker
          title="Joueurs — recherche"
          placeholder="Rechercher un joueur…"
          options={joueurs}
          selectedIds={joueurIds}
          onChange={onJoueursChange}
        />
        <BudgetParticipantPicker
          title="Entraîneurs — recherche"
          placeholder="Rechercher un entraîneur…"
          options={entraineurs}
          selectedIds={coachIds}
          onChange={onCoachsChange}
        />
      </div>
    </div>
  );
}
