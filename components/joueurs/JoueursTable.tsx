"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { sexeJoueurLabel, STATUTS_JOUEUR } from "@/lib/constants/joueurs";
import type { Joueur, JoueurWithGroupe } from "@/lib/types/database";
import { calculerAge } from "@/lib/utils/joueur";
import { Eye, Pencil, Trash2 } from "lucide-react";

function statutLabel(statut: Joueur["statut"]) {
  return STATUTS_JOUEUR.find((s) => s.value === statut)?.label ?? statut;
}

function statutVariant(statut: Joueur["statut"]) {
  if (statut === "actif") return "success" as const;
  if (statut === "blesse") return "warning" as const;
  if (statut === "suspendu") return "danger" as const;
  return "muted" as const;
}

function sexeBadgeVariant(sexe: Joueur["sexe"]) {
  if (sexe === "M") return "default" as const;
  if (sexe === "F") return "success" as const;
  return "muted" as const;
}

type Props = {
  joueurs: JoueurWithGroupe[];
  loading?: boolean;
  showSexeColumn?: boolean;
  onEdit: (j: Joueur) => void;
  onDelete: (id: string) => void;
};

export function JoueursTable({
  joueurs,
  loading,
  showSexeColumn = true,
  onEdit,
  onDelete,
}: Props) {
  const colSpan = showSexeColumn ? 8 : 7;

  return (
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="border-b border-border bg-surface-elevated text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Joueur</th>
          {showSexeColumn && <th className="px-4 py-3 font-medium">Sexe</th>}
          <th className="px-4 py-3 font-medium">Âge</th>
          <th className="px-4 py-3 font-medium">Catégorie</th>
          <th className="px-4 py-3 font-medium">Groupe</th>
          <th className="px-4 py-3 font-medium">Niveau</th>
          <th className="px-4 py-3 font-medium">Statut</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
              Chargement…
            </td>
          </tr>
        ) : joueurs.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
              Aucun joueur dans cette section
            </td>
          </tr>
        ) : (
          joueurs.map((j) => (
            <tr key={j.id} className="border-b border-border/50 hover:bg-surface-elevated/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {j.photo_url ? (
                    <Image
                      src={j.photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tennis/20 text-sm font-semibold text-tennis">
                      {j.prenom[0]}
                      {j.nom[0]}
                    </span>
                  )}
                  <div>
                    <p className="font-medium">
                      {j.prenom} {j.nom}
                      {j.is_frmt_tracked && (
                        <span className="ml-2 inline-flex align-middle">
                          <Badge variant="default">FRMT</Badge>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{j.classement ?? j.email ?? "—"}</p>
                  </div>
                </div>
              </td>
              {showSexeColumn && (
                <td className="px-4 py-3">
                  <Badge variant={sexeBadgeVariant(j.sexe)}>{sexeJoueurLabel(j.sexe)}</Badge>
                </td>
              )}
              <td className="px-4 py-3">{calculerAge(j.date_naissance)} ans</td>
              <td className="px-4 py-3">
                <Badge>{j.categorie_age}</Badge>
              </td>
              <td className="px-4 py-3">
                {j.groupe ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${j.groupe.couleur ?? "#c8f542"}22`,
                      color: j.groupe.couleur ?? "#c8f542",
                    }}
                  >
                    {j.groupe.nom}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">{j.niveau ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge variant={statutVariant(j.statut)}>{statutLabel(j.statut)}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Link href={`/joueurs/${j.id}`}>
                    <Button variant="ghost" size="sm" aria-label="Fiche">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(j)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}