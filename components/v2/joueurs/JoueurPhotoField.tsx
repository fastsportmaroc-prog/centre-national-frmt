"use client";

import { Label } from "@/components/ui/Input";
import { PlayerAvatar } from "@/components/v2/ui/PlayerAvatar";
import { PersonPasseportSummary } from "@/components/v2/passeports/PersonPasseportSummary";

type Props = {
  prenom: string;
  nom: string;
  categorie?: string;
  photoPreview: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  passeportNumero?: string;
  passeportExpiration?: string;
  disabled?: boolean;
  /** Libellé pour le texte d’aide à l’enregistrement photo */
  personKind?: "joueur" | "entraineur";
};

export function JoueurPhotoField({
  prenom,
  nom,
  categorie,
  photoPreview,
  onPhotoChange,
  passeportNumero = "",
  passeportExpiration = "",
  disabled,
  personKind = "joueur",
}: Props) {
  const saveHint =
    personKind === "entraineur"
      ? "l'entraîneur"
      : "le joueur";
  return (
    <div className="sm:col-span-2">
      <Label>Photo &amp; passeport</Label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3 sm:min-w-[140px]">
          <PlayerAvatar
            prenom={prenom}
            nom={nom}
            photoUrl={photoPreview}
            categorie={categorie}
            size="lg"
            onPhotoSelect={disabled ? undefined : onPhotoChange}
          />
          <p className="text-center text-[10px] text-[var(--text-secondary)]">
            Clic sur le cercle pour la photo
          </p>
          <PersonPasseportSummary
            numero={passeportNumero}
            expiration={passeportExpiration}
            variant="card"
            className="sm:max-w-[200px]"
          />
        </div>
        <p className="flex flex-1 items-center text-xs text-[var(--text-secondary)]">
          Formats : JPG, PNG, WebP. Après sélection, enregistrez {saveHint} pour valider la photo.
        </p>
      </div>
    </div>
  );
}
