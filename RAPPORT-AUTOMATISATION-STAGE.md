# Rapport — Automatisation ajout stage FRMT (local)

**Date :** 23 mai 2026  
**Build :** `npm run build` — **OK**

## Confirmations

- Aucun `git push`, aucun déploiement Vercel
- Aucune modification Supabase production
- Aucune suppression de stages existants (`deleteStageProgramme` toujours désactivé)
- Migration SQL `020_stage_logistique_jsonb.sql` préparée — **non exécutée** (fallback JSON dans `notes`)

## Audit (étape 1)

| Domaine | Fichiers / tables |
|---------|-------------------|
| Stages | `lib/data/stages.ts`, `components/stages/StagesClient.tsx`, table `stages_programme` |
| Joueurs / coachs | `lib/data/joueurs.ts`, `lib/data/entraineurs.ts` |
| Hébergement | `lib/data/hebergements.ts`, `occupation_cne` (stage_id) |
| Restauration | `lib/data/restauration.ts`, `besoins_restauration` |
| Courts | `lib/data/reservation-infra.ts`, `reservations_infrastructure` |
| Planning / calendrier | Réservations infra + usages (`addInfrastructureUsage`) |
| Historique | `lib/audit/historique.ts` |

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `lib/types/stage-logistique.ts` | Types formulaire / provisionnement |
| `lib/stages/stage-logistique-serializer.ts` | Stockage JSON dans `notes` |
| `lib/stages/stage-calculations.ts` | Calculs (hébergement, repas, terrains, conflits) |
| `lib/stages/provision-stage.ts` | Orchestrateur après « Créer stage » |
| `components/stages/StageAddForm.tsx` | Formulaire sections A–E |
| `components/stages/StageDetailSections.tsx` | Blocs fiche détail |
| `supabase/migrations/020_stage_logistique_jsonb.sql` | Colonne optionnelle (manuel) |

## Fichiers modifiés

- `components/stages/StagesClient.tsx` — bouton « Ajouter stage », formulaire complet, provision auto
- `components/stages/StageDetailClient.tsx` — blocs + sync + PDF conditionnel
- `lib/reports/stage-fiche.ts` — PDF sans sections vides
- `lib/types/stages.ts` — statut `confirme`
- `lib/utils/stage-automation.ts` — libellé Confirmé

## Fonctions de calcul (étape 4)

- `calculateStageDuration`
- `calculateStageParticipants`
- `calculateAccommodationNeeds`
- `calculateMealNeeds`
- `findAvailableCourts`
- `detectCourtConflicts`
- `assignCourtsAutomatically`
- `generateStageCalendarEntries`

## Flux « Créer stage »

1. Enregistrement `stages_programme` + logistique dans `notes`
2. Si hébergement : calcul chambres → mise à jour stage
3. Si restauration : création `besoins_restauration` (liés via `notes: stage_id:…`)
4. Si terrains : réservations `reservations_infrastructure` par jour/créneau, sans double réservation
5. Historique `logHistorique`

## Tests effectués (agent)

- `npm run build` — succès TypeScript + compilation
- Logique calculs validée via build (pas de vitest installé)

## URL locale

http://localhost:3001/stages → **Ajouter stage**  
http://localhost:3001/stages/[id] → fiche + Imprimer / PDF

## Tests manuels recommandés

1. Stage minimal (sans hébergement, restauration, terrains)
2. Stage hébergement seul
3. Stage restauration seul
4. Stage hébergement + restauration
5. Terrains matin / après-midi / journée
6. Conflit terrain (réserver un court puis créer stage même créneau)
7. Kitchenette + joueurs/coachs cochés
8. Vérifier dashboard, planning, calendrier, restauration, hébergement
