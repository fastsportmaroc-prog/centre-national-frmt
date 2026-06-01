import { describe, expect, it } from "vitest";
import { detectConflicts, hasConflict, timeSlotsOverlap } from "./conflictDetector";

describe("conflictDetector", () => {
  it("matin et apres-midi même jour ne se chevauchent pas", () => {
    expect(timeSlotsOverlap({ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" })).toBe(
      false
    );
  });

  it("ignore les réservations du même stage", () => {
    const rows = [
      {
        id: "a",
        stage_id: "s1",
        terrain_id: "t1",
        date: "2026-06-05",
        creneau: "matin",
        heure_debut: "09:00",
        heure_fin: "13:00",
      },
      {
        id: "b",
        stage_id: "s1",
        terrain_id: "t1",
        date: "2026-06-05",
        creneau: "apres-midi",
        heure_debut: "14:00",
        heure_fin: "18:00",
      },
    ];
    expect(detectConflicts(rows)).toHaveLength(0);
  });

  it("détecte un conflit entre deux stages", () => {
    const rows = [
      {
        id: "a",
        stage_id: "s1",
        terrain_id: "t1",
        date: "2026-06-05",
        creneau: "matin",
        heure_debut: "09:00",
        heure_fin: "13:00",
      },
      {
        id: "b",
        stage_id: "s2",
        terrain_id: "t1",
        date: "2026-06-05",
        creneau: "matin",
        heure_debut: "09:00",
        heure_fin: "13:00",
      },
    ];
    expect(detectConflicts(rows)).toHaveLength(1);
    expect(
      hasConflict(
        {
          stage_id: "s3",
          terrain_id: "t1",
          date: "2026-06-05",
          creneau: "matin",
          heure_debut: "09:00",
          heure_fin: "13:00",
        },
        rows
      )
    ).toBe(true);
  });
});
