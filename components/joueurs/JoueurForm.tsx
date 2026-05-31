"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { NIVEAUX, STATUTS_JOUEUR } from "@/lib/constants/joueurs";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import {
  MOROCCO_COUNTRY_CODE,
  MOROCCO_FEDERATION,
  MOROCCO_NATIONALITY,
} from "@/lib/tennis/morocco-filter";
import type { Groupe, JoueurInput } from "@/lib/types/database";
import { categorieDepuisNaissance } from "@/lib/utils/joueur";
import { Upload } from "lucide-react";
import Image from "next/image";

type Props = {
  form: JoueurInput;
  setForm: (f: JoueurInput) => void;
  groupes: Groupe[];
  photoPreview: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  error: string | null;
};

export function JoueurForm({
  form,
  setForm,
  groupes,
  photoPreview,
  onPhotoChange,
  onSubmit,
  onCancel,
  submitLabel,
  error,
}: Props) {
  const [manualCategorie, setManualCategorie] = useState(false);

  function onNaissanceChange(date: string) {
    setForm({
      ...form,
      date_naissance: date,
      categorie_age:
        !manualCategorie && date ? categorieDepuisNaissance(date) : form.categorie_age,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="prenom">Prénom *</Label>
          <Input
            id="prenom"
            required
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="naissance">Date de naissance *</Label>
          <Input
            id="naissance"
            type="date"
            required
            value={form.date_naissance}
            onChange={(e) => onNaissanceChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="categorie">Catégorie d&apos;âge</Label>
          <CategorySelect
            value={form.categorie_age}
            onChange={(categorie_age) =>
              setForm({ ...form, categorie_age: categorie_age as JoueurInput["categorie_age"] })
            }
            disabled={!manualCategorie}
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={manualCategorie}
              onChange={(e) => {
                const enabled = e.target.checked;
                setManualCategorie(enabled);
                if (!enabled && form.date_naissance) {
                  setForm({
                    ...form,
                    categorie_age: categorieDepuisNaissance(form.date_naissance),
                  });
                }
              }}
            />
            Modifier manuellement la catégorie
          </label>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sexe">Sexe</Label>
          <Select
            id="sexe"
            value={form.sexe}
            onChange={(e) => setForm({ ...form, sexe: e.target.value as JoueurInput["sexe"] })}
          >
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="Autre">Autre</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="statut">Statut</Label>
          <Select
            id="statut"
            value={form.statut}
            onChange={(e) =>
              setForm({ ...form, statut: e.target.value as JoueurInput["statut"] })
            }
          >
            {STATUTS_JOUEUR.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            value={form.telephone ?? ""}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="club">Club</Label>
        <Input
          id="club"
          placeholder="Club du joueur"
          value={form.club ?? ""}
          onChange={(e) => setForm({ ...form, club: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="niveau">Niveau</Label>
          <Select
            id="niveau"
            value={form.niveau ?? ""}
            onChange={(e) => setForm({ ...form, niveau: e.target.value })}
          >
            <option value="">—</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="classement">Classement (optionnel)</Label>
          <Input
            id="classement"
            placeholder="Laisser vide si non classé"
            value={form.classement ?? ""}
            onChange={(e) => setForm({ ...form, classement: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="groupe">Groupe</Label>
          <Select
            id="groupe"
            value={form.groupe_id ?? ""}
            onChange={(e) =>
              setForm({ ...form, groupe_id: e.target.value || null })
            }
          >
            <option value="">— Aucun —</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="coach">Coach référent</Label>
          <Input
            id="coach"
            value={form.coach_referent ?? ""}
            onChange={(e) => setForm({ ...form, coach_referent: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nationalite">Nationalité</Label>
          <Input
            id="nationalite"
            value={form.nationalite ?? ""}
            onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="country_code">Code pays (ISO)</Label>
          <Input
            id="country_code"
            placeholder={MOROCCO_COUNTRY_CODE}
            value={form.country_code ?? ""}
            onChange={(e) => setForm({ ...form, country_code: e.target.value || null })}
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_frmt_tracked ?? false}
          onChange={(e) => {
            const tracked = e.target.checked;
            setForm(
              tracked
                ? {
                    ...form,
                    is_frmt_tracked: true,
                    is_marocain: true,
                    nationalite: MOROCCO_NATIONALITY,
                    country_code: MOROCCO_COUNTRY_CODE,
                    federation: MOROCCO_FEDERATION,
                  }
                : { ...form, is_frmt_tracked: false }
            );
          }}
          className="rounded border-border"
        />
        Suivi performances internationales FRMT (Maroc / MAR uniquement)
      </label>
      <div>
        <Label htmlFor="documents">Documents</Label>
        <Textarea
          id="documents"
          rows={2}
          placeholder="Certificats, autorisations…"
          value={form.documents ?? ""}
          onChange={(e) => setForm({ ...form, documents: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div>
        <Label>Photo</Label>
        <div className="mt-1 flex items-center gap-3">
          {photoPreview && (
            <Image
              src={photoPreview}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
              unoptimized
            />
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-elevated">
            <Upload className="h-4 w-4" />
            Choisir une image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPhotoChange}
            />
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
