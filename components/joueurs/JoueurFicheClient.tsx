"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getJoueurById } from "@/lib/data/joueurs";
import { getDepensesByJoueur, getTotalDepensesJoueur } from "@/lib/data/joueur-depenses";
import type { JoueurWithGroupe } from "@/lib/types/database";
import type { JoueurDepense } from "@/lib/types/joueur-depenses";
import { formatDate } from "@/lib/utils/dates";
import { calculerAge } from "@/lib/utils/joueur";
import { STATUTS_JOUEUR } from "@/lib/constants/joueurs";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { StageParticipantLinks } from "@/components/stages/StageParticipantLinks";

type Props = { id: string };

export function JoueurFicheClient({ id }: Props) {
  const [joueur, setJoueur] = useState<JoueurWithGroupe | null>(null);
  const [depenses, setDepenses] = useState<JoueurDepense[]>([]);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getJoueurById(id), getDepensesByJoueur(id), getTotalDepensesJoueur(id)]).then(
      ([j, d, t]) => {
        setJoueur(j);
        setDepenses(d);
        setTotalDepenses(t);
        setLoading(false);
      }
    );
  }, [id]);

  if (loading) {
    return <p className="p-6 text-muted">Chargement de la fiche…</p>;
  }

  if (!joueur) {
    return (
      <main className="p-6">
        <p className="text-red-400">Joueur introuvable.</p>
        <Link href="/joueurs" className="mt-4 inline-block text-tennis">
          Retour à la liste
        </Link>
      </main>
    );
  }

  const statut =
    STATUTS_JOUEUR.find((s) => s.value === joueur.statut)?.label ?? joueur.statut;

  return (
    <>
      <PageHeader
        title={`${joueur.prenom} ${joueur.nom}`}
        description="Fiche joueur complète"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/joueurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Retour aux joueurs
            </Button>
          </Link>
          <Link href={`/budget/previsionnels/nouveau?joueur_id=${id}&type=joueur`}>
            <Button variant="secondary" size="sm">
              Créer budget prévisionnel
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="flex flex-col items-center text-center lg:col-span-1">
            {joueur.photo_url ? (
              <Image
                src={joueur.photo_url}
                alt=""
                width={120}
                height={120}
                className="h-28 w-28 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-full bg-tennis/20 text-3xl font-bold text-tennis">
                {joueur.prenom[0]}
                {joueur.nom[0]}
              </span>
            )}
            <h2 className="mt-4 text-xl font-semibold">
              {joueur.prenom} {joueur.nom}
            </h2>
            <Badge className="mt-2">{joueur.categorie_age}</Badge>
            <p className="mt-1 text-sm text-muted">{calculerAge(joueur.date_naissance)} ans</p>
            {joueur.groupe && (
              <p
                className="mt-2 rounded-full px-3 py-1 text-sm"
                style={{
                  backgroundColor: `${joueur.groupe.couleur ?? "#c8f542"}22`,
                  color: joueur.groupe.couleur ?? "#c8f542",
                }}
              >
                {joueur.groupe.nom}
              </p>
            )}
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <h3 className="mb-3 font-semibold">Informations générales</h3>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted">Statut</dt>
                  <dd className="font-medium">{statut}</dd>
                </div>
                <div>
                  <dt className="text-muted">Sexe</dt>
                  <dd className="font-medium">{joueur.sexe}</dd>
                </div>
                <div>
                  <dt className="text-muted">Nationalité</dt>
                  <dd className="font-medium">{joueur.nationalite ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Date de naissance</dt>
                  <dd className="font-medium">{joueur.date_naissance}</dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-medium">{joueur.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Téléphone</dt>
                  <dd className="font-medium">{joueur.telephone ?? "—"}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold">Sport</h3>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted">Niveau</dt>
                  <dd className="font-medium">{joueur.niveau ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Classement</dt>
                  <dd className="font-medium">{joueur.classement ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Coach référent</dt>
                  <dd className="font-medium">{joueur.coach_referent ?? "—"}</dd>
                </div>
              </dl>
            </Card>
            <StageParticipantLinks
              kind="joueur"
              entityId={id}
              label={`${joueur.prenom} ${joueur.nom}`}
            />
            <Card>
              <h3 className="mb-3 font-semibold">Compte dépenses</h3>
              <p className="text-2xl font-bold text-frmt-red">
                {totalDepenses.toLocaleString("fr-FR")} MAD
              </p>
              <p className="mt-1 text-xs text-muted">Total enregistré (billets, etc.)</p>
              {depenses.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Aucune dépense enregistrée.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                  {depenses.map((d) => (
                    <li
                      key={d.id}
                      className="flex justify-between gap-2 rounded-md border border-border px-2 py-1.5"
                    >
                      <span>
                        <span className="font-medium">{d.libelle}</span>
                        <span className="block text-xs text-muted">
                          {formatDate(d.date_depense)} · {d.categorie}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {d.montant.toLocaleString("fr-FR")} {d.devise}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {(joueur.documents || joueur.notes) && (
              <Card>
                <h3 className="mb-3 font-semibold">Documents & notes</h3>
                {joueur.documents && (
                  <p className="text-sm text-muted">
                    <span className="text-foreground">Documents :</span> {joueur.documents}
                  </p>
                )}
                {joueur.notes && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="text-foreground">Notes :</span> {joueur.notes}
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
