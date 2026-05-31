"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  createKinesitherapieSeance,
  deleteKinesitherapieSeance,
  getKinesitherapieSeances,
} from "@/lib/data/kinesitherapie";
import { getJoueurs, getStages } from "@/lib/supabase/queries";
import type { JoueurV2, KinesitherapieSeanceV2, StageProgrammeV2 } from "@/lib/types/v2";
import { Activity } from "lucide-react";

export function KinesitherapieV2Client() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [seances, setSeances] = useState<KinesitherapieSeanceV2[]>([]);
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [joueurFilter, setJoueurFilter] = useState("");
  const [form, setForm] = useState({
    joueur_id: "",
    date_seance: new Date().toISOString().slice(0, 10),
    duree_minutes: "45",
    motif: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [s, j, st] = await Promise.all([getKinesitherapieSeances(), getJoueurs(), getStages()]);
    setSeances(s);
    setJoueurs(j);
    setStages(st);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stageFromUrl = searchParams.get("stage");
    if (stageFromUrl) setStageFilter(stageFromUrl);
  }, [searchParams]);

  const joueurMap = useMemo(() => new Map(joueurs.map((j) => [j.id, j])), [joueurs]);
  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const filtered = useMemo(() => {
    let list = seances;
    if (joueurFilter) list = list.filter((s) => s.joueur_id === joueurFilter);
    if (stageFilter) {
      const st = stageMap.get(stageFilter);
      if (st) {
        list = list.filter(
          (s) => s.date_seance >= st.date_debut && s.date_seance <= st.date_fin
        );
      }
    }
    return list;
  }, [seances, joueurFilter, stageFilter, stageMap]);

  async function addSeance(e: React.FormEvent) {
    e.preventDefault();
    if (!form.joueur_id) {
      toast("Choisissez un joueur", "warning");
      return;
    }
    const res = await createKinesitherapieSeance({
      joueur_id: form.joueur_id,
      date_seance: form.date_seance,
      duree_minutes: form.duree_minutes ? Number(form.duree_minutes) : null,
      motif: form.motif.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (res.error) {
      if (/schema cache|kinesitherapie/i.test(res.error)) {
        toast("Exécutez lib/db/migrations/kinesitherapie.sql dans Supabase.", "error");
      } else {
        toast(res.error, "error");
      }
      return;
    }
    toast("Séance enregistrée", "success");
    setForm((f) => ({ ...f, motif: "", notes: "" }));
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette séance ?")) return;
    const res = await deleteKinesitherapieSeance(id);
    if (!res.ok) {
      toast(res.error ?? "Erreur", "error");
      return;
    }
    toast("Séance supprimée", "success");
    await load();
  }

  const filteredStage = stageFilter ? stageMap.get(stageFilter) : null;

  return (
    <>
      <V2PageHeader
        title="Kinésithérapie"
        description="Séances individuelles — reliées aux stages via l’onglet Kinésithérapie de chaque stage"
      />
      <main className="space-y-4 p-4 sm:p-6">
        {filteredStage && (
          <Card className="border-frmt-green/30 bg-frmt-green/5 p-4 text-sm">
            <p>
              Filtre stage :{" "}
              <Link href={`/v2/stages/${filteredStage.id}`} className="font-medium text-frmt-green hover:underline">
                {filteredStage.stage_action}
              </Link>{" "}
              ({filteredStage.date_debut} → {filteredStage.date_fin})
            </p>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Activity className="h-4 w-4 text-frmt-green" />
            Nouvelle séance
          </h3>
          <form onSubmit={addSeance} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Joueur *</Label>
              <Select
                required
                value={form.joueur_id}
                onChange={(e) => setForm({ ...form, joueur_id: e.target.value })}
              >
                <option value="">—</option>
                {joueurs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.prenom} {j.nom}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={form.date_seance}
                onChange={(e) => setForm({ ...form, date_seance: e.target.value })}
              />
            </div>
            <div>
              <Label>Durée (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.duree_minutes}
                onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label>Motif</Label>
              <Input
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder="Prévention, rééducation…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div>
              <Button type="submit">Enregistrer la séance</Button>
            </div>
          </form>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap gap-3">
            <div>
              <Label>Filtrer par joueur</Label>
              <Select value={joueurFilter} onChange={(e) => setJoueurFilter(e.target.value)}>
                <option value="">Tous</option>
                {joueurs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.prenom} {j.nom}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Filtrer par stage (période)</Label>
              <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">Tous</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stage_action} ({s.date_debut})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Joueur</th>
                  <th className="p-2 text-left">Durée</th>
                  <th className="p-2 text-left">Motif</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const j = joueurMap.get(s.joueur_id);
                  return (
                    <tr key={s.id}>
                      <td className="p-2">{s.date_seance}</td>
                      <td className="p-2">
                        {j ? (
                          <Link href={`/v2/joueurs/${j.id}`} className="hover:text-frmt-green">
                            {j.prenom} {j.nom}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-2">{s.duree_minutes ? `${s.duree_minutes} min` : "—"}</td>
                      <td className="p-2 text-muted">{s.motif ?? "—"}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="secondary" onClick={() => void remove(s.id)}>
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted">
                      Aucune séance
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
