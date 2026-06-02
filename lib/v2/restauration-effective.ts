import type { JourRepasStage, ParticipantMealOverride } from "@/lib/types/v2";

type ParticipantRef = { id: string; type: "joueur" | "coach" };

export function effectiveMeal(
  dayDefault: JourRepasStage | undefined,
  override: ParticipantMealOverride | undefined,
  meal: keyof Pick<JourRepasStage, "petit_dejeuner" | "dejeuner" | "diner">
): boolean {
  if (override && override[meal] !== null && override[meal] !== undefined) {
    return Boolean(override[meal]);
  }
  return Boolean(dayDefault?.[meal]);
}

export function countEffectiveMealsForDay(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: ParticipantRef[],
  date: string,
  meal: keyof Pick<JourRepasStage, "petit_dejeuner" | "dejeuner" | "diner">
): number {
  const dayDefault = jours.find((j) => j.date === date);
  if (!dayDefault?.[meal]) return 0;
  let count = 0;
  for (const p of participants) {
    const ov = overrides.find(
      (o) => o.date === date && o.participant_id === p.id && o.participant_type === p.type
    );
    if (effectiveMeal(dayDefault, ov, meal)) count++;
  }
  return count;
}

export function totalCouvertsDay(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: ParticipantRef[],
  date: string
): number {
  return (
    countEffectiveMealsForDay(jours, overrides, participants, date, "petit_dejeuner") +
    countEffectiveMealsForDay(jours, overrides, participants, date, "dejeuner") +
    countEffectiveMealsForDay(jours, overrides, participants, date, "diner")
  );
}

export function grandTotalMeal(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: ParticipantRef[],
  meal: keyof Pick<JourRepasStage, "petit_dejeuner" | "dejeuner" | "diner">
): number {
  return jours.reduce(
    (sum, j) => sum + countEffectiveMealsForDay(jours, overrides, participants, j.date, meal),
    0
  );
}

export function grandTotalAllMeals(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: ParticipantRef[]
): number {
  return (
    grandTotalMeal(jours, overrides, participants, "petit_dejeuner") +
    grandTotalMeal(jours, overrides, participants, "dejeuner") +
    grandTotalMeal(jours, overrides, participants, "diner")
  );
}
