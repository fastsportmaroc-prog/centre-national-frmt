"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { uploadDocument } from "@/lib/storage/upload-document";
import type { CompetitionDocument } from "@/lib/types/competition";

export function TabDocuments({ competitionId }: { competitionId: string }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<CompetitionDocument[]>([]);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("autre");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/competitions/${competitionId}/documents`);
    const json = await res.json();
    setDocs(json.documents ?? []);
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadDocument(file, `competitions/${competitionId}`);
      const res = await fetch(`/api/competitions/${competitionId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom || file.name,
          type,
          url,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Erreur", "error");
        return;
      }
      toast("Document ajouté", "success");
      setNom("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload impossible", "error");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(
      `/api/competitions/${competitionId}/documents?document_id=${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast("Suppression impossible", "error");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Ajouter un document</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Convocation équipe" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="convocation">Convocation</option>
              <option value="resultat">Résultats</option>
              <option value="rapport">Rapport</option>
              <option value="lettre_officielle">Lettre officielle</option>
              <option value="autre">Autre</option>
            </Select>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="rounded-md border border-border px-3 py-1.5 text-sm">
            {uploading ? "Upload…" : "Choisir un fichier"}
          </span>
          <input
            type="file"
            className="hidden"
            accept="application/pdf,image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
      </Card>

      <ul className="space-y-2">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3"
          >
            <div>
              <p className="font-medium">{d.nom}</p>
              <p className="text-xs text-muted capitalize">{d.type.replace(/_/g, " ")}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#3498db] hover:underline"
              >
                Ouvrir
              </a>
              <Button size="sm" variant="secondary" onClick={() => void remove(d.id)}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
        {docs.length === 0 && <p className="text-sm text-muted">Aucun document.</p>}
      </ul>
    </div>
  );
}
