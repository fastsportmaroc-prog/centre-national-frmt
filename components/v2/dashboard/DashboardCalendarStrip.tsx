"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { getJoueursByStage, getEntraineursByStage } from "@/lib/supabase/queries";
import type { CompetitionDashboardCard } from "@/lib/competitions/dashboard-summary";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2, StageProgrammeV2 } from "@/lib/types/v2";
import type { DashboardCalendarEvent } from "@/lib/v2/dashboard-direction-data";
import type { DashboardPeriod } from "@/lib/v2/dashboard-period";
import { formatDateLong } from "@/lib/v2/reservations-utils";

type Props = {
  period: DashboardPeriod;
  events: DashboardCalendarEvent[];
  stages: StageProgrammeV2[];
  programmation: ProgrammationEvenementEnriched[];
  competitions: CompetitionDashboardCard[];
  coaches: EntraineurV2[];
};

const KIND_STYLE: Record<DashboardCalendarEvent["kind"], { dot: string; label: string }> = {
  stage: { dot: "bg-[var(--color-green)]", label: "Stage" },
  competition: { dot: "bg-[var(--color-amber)]", label: "Compétition" },
  programmation: { dot: "bg-[var(--color-purple,#a78bfa)]", label: "Programmation" },
};

const PROG_TYPE_LABEL: Record<string, string> = {
  tournoi_itf: "Tournoi ITF",
  tournoi_atp_wta: "Tournoi ATP/WTA",
  coupe_davis: "Coupe Davis",
  bjk_cup: "BJK Cup",
  stage_national: "Stage national",
  stage_etranger: "Stage étranger",
  competition_nationale: "Compétition nationale",
  blessure: "Blessure",
  repos: "Repos",
};

const MAX_CALENDAR_DAYS = 42;

type CompetitionParticipant = {
  prenom: string;
  nom: string;
  poste: string;
  participant_type: string;
};

type DetailState =
  | {
      kind: "stage";
      stage: StageProgrammeV2;
      joueurs: string[];
      coachs: string[];
      loading: boolean;
    }
  | {
      kind: "competition";
      card: CompetitionDashboardCard;
      participants: CompetitionParticipant[];
      loading: boolean;
    }
  | { kind: "programmation"; event: ProgrammationEvenementEnriched };

function entityId(event: DashboardCalendarEvent): string {
  const idx = event.id.indexOf("-");
  return idx >= 0 ? event.id.slice(idx + 1) : event.id;
}

function EventButton({
  event,
  onOpen,
}: {
  event: DashboardCalendarEvent;
  onOpen: (e: DashboardCalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      title={event.titre}
      onClick={() => onOpen(event)}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[9px] hover:bg-[var(--bg-hover)]"
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_STYLE[event.kind].dot)} />
      <span className="truncate text-[var(--text-primary)]">{event.titre}</span>
    </button>
  );
}

export function DashboardCalendarStrip({
  period,
  events,
  stages,
  programmation,
  competitions,
  coaches,
}: Props) {
  const [detail, setDetail] = useState<DetailState | null>(null);

  const openEvent = useCallback(
    async (event: DashboardCalendarEvent) => {
      const id = entityId(event);

      if (event.kind === "stage") {
        const stage = stages.find((s) => s.id === id);
        if (!stage) return;
        setDetail({ kind: "stage", stage, joueurs: [], coachs: [], loading: true });
        const [j, c] = await Promise.all([getJoueursByStage(id), getEntraineursByStage(id)]);
        setDetail({
          kind: "stage",
          stage,
          joueurs: j.map((x) => `${x.prenom} ${x.nom}`),
          coachs: c.map((x) => `${x.prenom} ${x.nom}`),
          loading: false,
        });
        return;
      }

      if (event.kind === "competition") {
        const card = competitions.find((c) => c.id === id);
        if (!card) return;
        setDetail({ kind: "competition", card, participants: [], loading: true });
        try {
          const res = await fetch(
            `/api/competitions/${id}/participants?date_fin=${encodeURIComponent(card.date_fin.slice(0, 10))}`,
            { cache: "no-store" }
          );
          const json = (await res.json()) as {
            participants?: CompetitionParticipant[];
          };
          setDetail({
            kind: "competition",
            card,
            participants: json.participants ?? [],
            loading: false,
          });
        } catch {
          setDetail({ kind: "competition", card, participants: [], loading: false });
        }
        return;
      }

      const prog = programmation.find((e) => e.id === id);
      if (prog) setDetail({ kind: "programmation", event: prog });
    },
    [stages, competitions, programmation]
  );

  function coachLabelFromColumn(columnId: string | null | undefined): string | null {
    if (!columnId?.startsWith("coach-")) return null;
    const coachId = columnId.slice("coach-".length);
    const c = coaches.find((x) => x.id === coachId);
    return c ? `${c.prenom} ${c.nom}` : null;
  }

  const start = parseISO(`${period.start}T00:00:00`);
  const end = parseISO(`${period.end}T00:00:00`);
  const days = eachDayOfInterval({ start, end });
  const today = new Date().toISOString().slice(0, 10);

  const modalTitle =
    detail?.kind === "stage"
      ? detail.stage.stage_action
      : detail?.kind === "competition"
        ? detail.card.nom
        : detail?.kind === "programmation"
          ? detail.event.nom || "Événement"
          : "";

  return (
    <>
      {days.length > MAX_CALENDAR_DAYS ? (
        <div className="v2-kpi-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="dashboard-section-label">Calendrier</h2>
            <span className="text-[11px] text-[var(--text-muted)]">
              {events.length} événement{events.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-3 text-[11px] text-[var(--text-muted)]">
            Période trop longue pour la grille — liste chronologique :
          </p>
          <ul className="space-y-1.5">
            {events.slice(0, 30).map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => void openEvent(e)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-hover)]"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", KIND_STYLE[e.kind].dot)} />
                  <span className="text-[var(--text-muted)]">
                    {format(parseISO(`${e.date_debut}T00:00:00`), "dd/MM", { locale: fr })}
                  </span>
                  <span className="truncate text-[var(--text-primary)]">{e.titre}</span>
                  {e.categorie && (
                    <span className="ml-auto shrink-0 text-[10px] text-[var(--text-muted)]">
                      {e.categorie}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="v2-kpi-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="dashboard-section-label">Calendrier</h2>
            <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
              {Object.values(KIND_STYLE).map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const dayEvents = events.filter((e) => e.date_debut <= iso && e.date_fin >= iso);
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-[68px] rounded-lg border p-1.5",
                    isToday
                      ? "border-[var(--frmt-green,#16a34a)] bg-[var(--bg-inset)]"
                      : "border-[var(--border-main)] bg-[var(--bg-card)]"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium capitalize text-[var(--text-muted)]">
                      {format(day, "EEE dd", { locale: fr })}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-semibold text-[var(--frmt-green,#16a34a)]">
                        auj.
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <EventButton key={e.id} event={e} onOpen={(ev) => void openEvent(ev)} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1 text-[9px] text-[var(--text-muted)]">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={modalTitle}>
        {detail?.kind === "stage" && (
          <div className="space-y-3 text-sm">
            <p>
              <CalendarDays className="mr-1 inline h-4 w-4" />
              {formatDateLong(detail.stage.date_debut)} → {formatDateLong(detail.stage.date_fin)}
            </p>
            <p>
              {detail.stage.categorie ?? "—"} · {detail.stage.statut} · {detail.stage.lieu ?? "—"}
            </p>
            {detail.loading ? (
              <p className="text-[var(--text-muted)]">Chargement des participants…</p>
            ) : (
              <>
                <p>
                  <strong>Joueurs ({detail.joueurs.length}) :</strong>{" "}
                  {detail.joueurs.join(", ") || "—"}
                </p>
                <p>
                  <strong>Entraîneurs ({detail.coachs.length}) :</strong>{" "}
                  {detail.coachs.join(", ") || "—"}
                </p>
              </>
            )}
            <Link
              href={`/v2/stages/${detail.stage.id}`}
              className="inline-flex text-frmt-green hover:underline"
            >
              Voir la fiche stage →
            </Link>
          </div>
        )}

        {detail?.kind === "competition" && (
          <div className="space-y-3 text-sm">
            <p>
              <CalendarDays className="mr-1 inline h-4 w-4" />
              {formatDateLong(detail.card.date_debut)} → {formatDateLong(detail.card.date_fin)}
            </p>
            <p>
              {detail.card.categorie} · {detail.card.lieu ?? "—"} · {detail.card.statut_affichage}
            </p>
            <p>
              <strong>Participants ({detail.card.nb_participants})</strong>
              {detail.card.visas_requis && (
                <span className="ml-2 text-[var(--text-muted)]">
                  · Visas : {detail.card.visas_obtenus} obtenus, {detail.card.visas_a_prevoir} à
                  prévoir
                </span>
              )}
            </p>
            {detail.loading ? (
              <p className="text-[var(--text-muted)]">Chargement des participants…</p>
            ) : detail.participants.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--border-main)] p-2 text-[12px]">
                {detail.participants.map((p, i) => (
                  <li key={`${p.nom}-${i}`}>
                    {p.prenom} {p.nom}
                    <span className="ml-1 text-[var(--text-muted)]">({p.poste || p.participant_type})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--text-muted)]">Liste des participants non disponible.</p>
            )}
            <Link
              href={`/competitions/${detail.card.id}`}
              className="inline-flex text-frmt-green hover:underline"
            >
              Voir la fiche compétition →
            </Link>
          </div>
        )}

        {detail?.kind === "programmation" && (
          <div className="space-y-3 text-sm">
            <p>
              <CalendarDays className="mr-1 inline h-4 w-4" />
              {formatDateLong(detail.event.date_debut)} → {formatDateLong(detail.event.date_fin)}
            </p>
            <p>
              <strong>Type :</strong> {PROG_TYPE_LABEL[detail.event.type] ?? detail.event.type}
              {detail.event.statut && (
                <span className="ml-2 text-[var(--text-muted)]">· {detail.event.statut}</span>
              )}
            </p>
            {(detail.event.joueur_prenom || detail.event.joueur_nom) && (
              <p>
                <strong>Joueur :</strong> {detail.event.joueur_prenom} {detail.event.joueur_nom}
                {detail.event.joueur_categorie && (
                  <span className="text-[var(--text-muted)]"> ({detail.event.joueur_categorie})</span>
                )}
              </p>
            )}
            {coachLabelFromColumn(detail.event.cne_column_id) && (
              <p>
                <strong>Coach :</strong> {coachLabelFromColumn(detail.event.cne_column_id)}
              </p>
            )}
            {(detail.event.pays || detail.event.ville) && (
              <p>
                <strong>Lieu :</strong>{" "}
                {[detail.event.ville, detail.event.pays].filter(Boolean).join(", ") || "—"}
              </p>
            )}
            {detail.event.surface && (
              <p>
                <strong>Surface :</strong> {detail.event.surface}
              </p>
            )}
            {detail.event.categorie_tournoi && (
              <p>
                <strong>Catégorie tournoi :</strong> {detail.event.categorie_tournoi}
              </p>
            )}
            {detail.event.notes_coach && (
              <p>
                <strong>Notes :</strong> {detail.event.notes_coach}
              </p>
            )}
            <Link
              href="/v2/programmation-joueurs"
              className="inline-flex text-frmt-green hover:underline"
            >
              Ouvrir la programmation →
            </Link>
          </div>
        )}
      </Modal>
    </>
  );
}
