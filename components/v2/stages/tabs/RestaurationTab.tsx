"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  getStageRestaurationDetailAction,
  resetParticipantMealForDayAction,
  saveJourRepasAction,
  saveParticipantMealAction,
} from "@/lib/actions/stage-logistique-participants-actions";
import type { JourRepasStage, ParticipantMealOverride } from "@/lib/types/v2";
import {
  effectiveMeal,
  grandTotalAllMeals,
  grandTotalMeal,
  totalCouvertsDay,
  countEffectiveMealsForDay,
} from "@/lib/v2/restauration-effective";
import { formatDateFr, formatDayLabel, personInitials } from "@/lib/v2/stage-logistique-ui";
import { cn } from "@/lib/utils/cn";

type MealKey = keyof Pick<JourRepasStage, "petit_dejeuner" | "dejeuner" | "diner">;

const MEALS: { key: MealKey; label: string; short: string }[] = [
  { key: "petit_dejeuner", label: "Petit-déjeuner", short: "☕ PD" },
  { key: "dejeuner", label: "Déjeuner", short: "🍽️ DJ" },
  { key: "diner", label: "Dîner", short: "🌙 DN" },
];

type Props = {
  stageId: string;
  stageDateDebut: string;
  stageDateFin: string;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  disabled?: boolean;
  legacyFooter?: React.ReactNode;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
};

export function RestaurationTab({
  stageId,
  stageDateDebut,
  stageDateFin,
  active,
  onActiveChange,
  disabled,
  legacyFooter,
  toast,
}: Props) {
  const [jours, setJours] = useState<JourRepasStage[]>([]);
  const [overrides, setOverrides] = useState<ParticipantMealOverride[]>([]);
  const [participants, setParticipants] = useState<
    Array<{ id: string; type: "joueur" | "coach"; nom: string; prenom: string }>
  >([]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getStageRestaurationDetailAction(stageId);
    if (data) {
      setJours(data.jours);
      setOverrides(data.overrides);
      setParticipants(data.participants);
      if (!activeDay && data.jours[0]) setActiveDay(data.jours[0].date);
    }
    setLoading(false);
  }, [stageId]);

  useEffect(() => {
    if (active) void load();
    else setLoading(false);
  }, [active, load]);

  const participantRefs = useMemo(
    () => participants.map((p) => ({ id: p.id, type: p.type })),
    [participants]
  );

  function getOverride(pid: string, ptype: "joueur" | "coach", date: string) {
    return overrides.find(
      (o) => o.participant_id === pid && o.participant_type === ptype && o.date === date
    );
  }

  function overrideCount(date: string): number {
    return overrides.filter((o) => o.date === date).length;
  }

  async function persistJour(jour: JourRepasStage) {
    const res = await saveJourRepasAction(stageId, jour);
    if (!res.ok) toast(res.error ?? "Erreur jour", "error");
  }

  function updateJour(date: string, patch: Partial<JourRepasStage>) {
    setJours((list) => {
      const next = list.map((j) => (j.date === date ? { ...j, ...patch } : j));
      const updated = next.find((j) => j.date === date);
      if (updated) void persistJour(updated);
      return next;
    });
  }

  function setAllMeals(date: string, value: boolean) {
    updateJour(date, { petit_dejeuner: value, dejeuner: value, diner: value });
  }

  function setPreset(date: string, preset: "diner_only" | "no_breakfast") {
    if (preset === "diner_only") {
      updateJour(date, { petit_dejeuner: false, dejeuner: false, diner: true });
    } else {
      updateJour(date, { petit_dejeuner: false, dejeuner: true, diner: true });
    }
  }

  async function toggleParticipantMeal(
    pid: string,
    ptype: "joueur" | "coach",
    date: string,
    meal: MealKey
  ) {
    const dayDefault = jours.find((j) => j.date === date);
    const ov = getOverride(pid, ptype, date);
    const current = effectiveMeal(dayDefault, ov, meal);
    const defaultVal = Boolean(dayDefault?.[meal]);
    const isOverridden = ov && ov[meal] !== null && ov[meal] !== undefined;

    let nextVal: boolean | null;
    if (!isOverridden) {
      nextVal = !current;
    } else if (ov![meal] === defaultVal) {
      nextVal = !current;
    } else {
      nextVal = null;
    }

    if (nextVal === null) {
      const res = await resetParticipantMealForDayAction(stageId, pid, ptype, date);
      if (res.ok) {
        setOverrides((list) =>
          list.filter(
            (o) =>
              !(o.participant_id === pid && o.participant_type === ptype && o.date === date)
          )
        );
      }
      return;
    }

    const row: ParticipantMealOverride = {
      participant_id: pid,
      participant_type: ptype,
      date,
      petit_dejeuner: ov?.petit_dejeuner ?? null,
      dejeuner: ov?.dejeuner ?? null,
      diner: ov?.diner ?? null,
      [meal]: nextVal,
    };

    const res = await saveParticipantMealAction(stageId, row);
    if (res.ok) {
      setOverrides((list) => {
        const filtered = list.filter(
          (o) =>
            !(o.participant_id === pid && o.participant_type === ptype && o.date === date)
        );
        const allNull =
          (meal === "petit_dejeuner" ? nextVal : row.petit_dejeuner) === null &&
          (meal === "dejeuner" ? nextVal : row.dejeuner) === null &&
          (meal === "diner" ? nextVal : row.diner) === null;
        if (allNull) return filtered;
        return [...filtered, row];
      });
    } else toast(res.error ?? "Erreur", "error");
  }

  async function bulkSetDay(date: string, meals: Partial<Record<MealKey, boolean>>) {
    for (const p of participants) {
      const row: ParticipantMealOverride = {
        participant_id: p.id,
        participant_type: p.type,
        date,
        petit_dejeuner: meals.petit_dejeuner ?? null,
        dejeuner: meals.dejeuner ?? null,
        diner: meals.diner ?? null,
      };
      await saveParticipantMealAction(stageId, row);
    }
    await load();
  }

  async function resetDayOverrides(date: string) {
    for (const p of participants) {
      await resetParticipantMealForDayAction(stageId, p.id, p.type, date);
    }
    await load();
    toast("Défauts du jour rétablis", "success");
  }

  function setAllDays(patch: Partial<JourRepasStage>) {
    setJours((list) => {
      const next = list.map((j) => ({ ...j, ...patch }));
      next.forEach((j) => void persistJour(j));
      return next;
    });
  }

  const dayDefault = jours.find((j) => j.date === activeDay);

  return (
    <div className="space-y-4 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          disabled={disabled}
          onChange={(e) => onActiveChange(e.target.checked)}
        />
        Restauration active pour ce stage
      </label>

      {!active && <p className="text-[var(--text-muted)]">Restauration non configurée</p>}

      {active && loading && (
        <p className="text-[var(--text-muted)]">Chargement configuration repas…</p>
      )}

      {active && !loading && (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            Période stage : {formatDateFr(stageDateDebut)} → {formatDateFr(stageDateFin)} ·{" "}
            <strong>{grandTotalAllMeals(jours, overrides, participantRefs)}</strong> couverts au total
          </p>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {jours.map((jour) => (
              <div
                key={jour.date}
                role="button"
                tabIndex={0}
                onClick={() => setActiveDay(jour.date)}
                onKeyDown={(e) => e.key === "Enter" && setActiveDay(jour.date)}
                className={cn(
                  "min-w-[140px] shrink-0 cursor-pointer rounded-lg border p-2 transition",
                  activeDay === jour.date
                    ? "border-frmt-green bg-frmt-green/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)]/40"
                )}
              >
                <div className="mb-2 text-center text-xs font-semibold">
                  {formatDayLabel(jour.date)}
                </div>
                <div className="flex justify-center gap-1">
                  {MEALS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      disabled={disabled}
                      title={m.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateJour(jour.date, { [m.key]: !jour[m.key] });
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        jour[m.key]
                          ? "bg-frmt-green/25 text-frmt-green"
                          : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                      )}
                    >
                      {m.short}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  <button
                    type="button"
                    className="text-[9px] underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAllMeals(jour.date, true);
                    }}
                  >
                    Tout
                  </button>
                  <button
                    type="button"
                    className="text-[9px] underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAllMeals(jour.date, false);
                    }}
                  >
                    Aucun
                  </button>
                  <button
                    type="button"
                    className="text-[9px] underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreset(jour.date, "diner_only");
                    }}
                  >
                    Dîner
                  </button>
                </div>
                {overrideCount(jour.date) > 0 && (
                  <div className="mt-1 text-center text-[9px] text-amber-500">
                    {overrideCount(jour.date)} modif.
                  </div>
                )}
              </div>
            ))}
          </div>

          {!disabled && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setAllDays({ petit_dejeuner: true, dejeuner: true, diner: true })
                }
              >
                Tous les repas — tous les jours
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setAllDays({ petit_dejeuner: false, dejeuner: true, diner: true })
                }
              >
                Sans petit-déj. (tous les jours)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setAllDays({ petit_dejeuner: false, dejeuner: false, diner: true })
                }
              >
                Dîner seul (tous les jours)
              </Button>
            </div>
          )}

          {activeDay && dayDefault && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Modifications — {formatDateFr(activeDay)}</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  Défaut :{" "}
                  {[
                    dayDefault.petit_dejeuner && "PD",
                    dayDefault.dejeuner && "DJ",
                    dayDefault.diner && "DN",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "aucun repas"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="text-[var(--text-muted)]">
                    <tr>
                      <th className="py-1">Participant</th>
                      <th className="py-1">Type</th>
                      {MEALS.map((m) => (
                        <th key={m.key} className="py-1">
                          {m.short}
                        </th>
                      ))}
                      <th className="py-1">Repas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const ov = getOverride(p.id, p.type, activeDay);
                      let mealCount = 0;
                      for (const m of MEALS) {
                        if (effectiveMeal(dayDefault, ov, m.key)) mealCount++;
                      }
                      return (
                        <tr key={`${p.type}-${p.id}`} className="border-t border-[var(--border)]/50">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-frmt-green/15 text-[10px] font-bold">
                                {personInitials(p.nom, p.prenom)}
                              </span>
                              <span>
                                {p.nom} {p.prenom}
                              </span>
                            </div>
                          </td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px]",
                                p.type === "coach"
                                  ? "bg-violet-500/15 text-violet-300"
                                  : "bg-sky-500/15 text-sky-300"
                              )}
                            >
                              {p.type === "coach" ? "Coach" : "Joueur"}
                            </span>
                          </td>
                          {MEALS.map((m) => {
                            const eff = effectiveMeal(dayDefault, ov, m.key);
                            const isOv =
                              ov && ov[m.key] !== null && ov[m.key] !== undefined;
                            return (
                              <td key={m.key} className="py-2">
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    void toggleParticipantMeal(p.id, p.type, activeDay, m.key)
                                  }
                                  className={cn(
                                    "relative h-8 w-8 rounded border text-sm",
                                    eff
                                      ? "border-frmt-green/50 bg-frmt-green/20 text-frmt-green"
                                      : "border-[var(--border)] text-[var(--text-muted)]",
                                    isOv && "ring-1 ring-amber-500/50"
                                  )}
                                  title={isOv ? "Modifié (cliquer pour défaut)" : "Défaut du jour"}
                                >
                                  {eff ? "✓" : "✗"}
                                  {isOv && (
                                    <span className="absolute -right-0.5 -top-0.5 text-[8px] text-amber-500">
                                      ●
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-2">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px]",
                                mealCount > 0
                                  ? "bg-frmt-green/15 text-frmt-green"
                                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                              )}
                            >
                              {mealCount} repas
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!disabled && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void bulkSetDay(activeDay, {
                        petit_dejeuner: true,
                        dejeuner: true,
                        diner: true,
                      })
                    }
                  >
                    Tous les repas pour tous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void bulkSetDay(activeDay, {
                        petit_dejeuner: false,
                        dejeuner: false,
                        diner: true,
                      })
                    }
                  >
                    Dîner seul pour tous
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void resetDayOverrides(activeDay)}>
                    ↺ Remettre les défauts
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-[var(--border)] p-3">
            <h3 className="mb-2 font-semibold">Récapitulatif — total couverts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[var(--text-muted)]">
                  <tr>
                    <th className="py-1 text-left">Date</th>
                    <th className="py-1">☕ PD</th>
                    <th className="py-1">🍽️ DJ</th>
                    <th className="py-1">🌙 DN</th>
                    <th className="py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {jours.map((jour) => (
                    <tr key={jour.date} className="border-t border-[var(--border)]/50">
                      <td className="py-1">{formatDateFr(jour.date)}</td>
                      <td className="py-1 text-center">
                        {jour.petit_dejeuner
                          ? countEffectiveMealsForDay(
                              jours,
                              overrides,
                              participantRefs,
                              jour.date,
                              "petit_dejeuner"
                            )
                          : 0}
                      </td>
                      <td className="py-1 text-center">
                        {jour.dejeuner
                          ? countEffectiveMealsForDay(
                              jours,
                              overrides,
                              participantRefs,
                              jour.date,
                              "dejeuner"
                            )
                          : 0}
                      </td>
                      <td className="py-1 text-center">
                        {jour.diner
                          ? countEffectiveMealsForDay(
                              jours,
                              overrides,
                              participantRefs,
                              jour.date,
                              "diner"
                            )
                          : 0}
                      </td>
                      <td className="py-1 text-center font-medium">
                        {totalCouvertsDay(jours, overrides, participantRefs, jour.date)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--border)] font-semibold">
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-center">
                      {grandTotalMeal(jours, overrides, participantRefs, "petit_dejeuner")}
                    </td>
                    <td className="py-2 text-center">
                      {grandTotalMeal(jours, overrides, participantRefs, "dejeuner")}
                    </td>
                    <td className="py-2 text-center">
                      {grandTotalMeal(jours, overrides, participantRefs, "diner")}
                    </td>
                    <td className="py-2 text-center">
                      {grandTotalAllMeals(jours, overrides, participantRefs)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {legacyFooter}
        </>
      )}
    </div>
  );
}
