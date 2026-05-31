"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getStagesForCoach, getStagesForJoueur, unlinkCoachFromStage, unlinkJoueurFromStage } from "@/lib/data/stage-relations";
import { getStageById } from "@/lib/data/stages";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDate } from "@/lib/utils/dates";
import { Trash2 } from "lucide-react";

type Props =
  | { kind: "joueur"; entityId: string; label: string }
  | { kind: "coach"; entityId: string; label: string };

export function StageParticipantLinks({ kind, entityId, label }: Props) {
  const [stages, setStages] = useState<StageProgramme[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const links =
        kind === "joueur"
          ? await getStagesForJoueur(entityId)
          : await getStagesForCoach(entityId);
      const details = (
        await Promise.all(links.map((l) => getStageById(l.stage_id)))
      ).filter((s): s is StageProgramme => s !== null);
      setStages(details);
    } catch {
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [kind, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(stageId: string, stageLabel: string) {
    if (!confirm(`Retirer ${label} du stage « ${stageLabel} » ?`)) return;
    if (kind === "joueur") {
      await unlinkJoueurFromStage(stageId, entityId);
    } else {
      await unlinkCoachFromStage(stageId, entityId);
    }
    await load();
  }

  if (loading) return null;
  if (stages.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Stages associés</h3>
      <ul className="space-y-2 text-sm">
        {stages.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/stages/${s.id}`} className="font-medium hover:underline">
                {s.stage_action}
              </Link>
              <span className="text-muted">
                {formatDate(s.date_debut)} → {formatDate(s.date_fin)}
              </span>
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleRemove(s.id, s.stage_action)}
              title="Retirer du stage"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
              Retirer
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
