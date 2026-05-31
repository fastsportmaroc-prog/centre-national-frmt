# Rapport — Stabilisation formulaire ajout stage

**Date :** 23 mai 2026  
**Build :** `npm run build` — **OK**  
**Dev :** `npm run dev:3001` → http://localhost:3001

## Confirmations

- Aucun push Git, aucun déploiement Vercel
- Aucune modification Supabase production
- Aucune suppression de stages existants
- Aucune migration destructive exécutée

## 1. Supabase local / fallback

| Problème | Solution |
|----------|----------|
| `Supabase indisponible — verifiez .env.local` | Si `NEXT_PUBLIC_SUPABASE_URL` + clé absents/invalides → **Mode local test** |
| Impossible de sauvegarder | CRUD stages via `localStorage` (`frmt-local-test:*`) |
| Badge | **« Mode local test »** sur `/stages` + bandeau explicatif |

Fichiers : `lib/local-test/mode.ts`, `storage.ts`, `stages-store.ts`, `provision-local.ts`, `data-access.ts`, `seed.ts`

Données locales seed : 5 courts, fitness, natation, 2 joueurs, 1 coach (pour tester le formulaire).

## 2. Double scrollbar — corrigée

- `Modal` refait : header fixe, **une seule** zone scroll (`flex-1 overflow-y-auto`), footer fixe
- Formulaire stage : `panelClassName="max-w-3xl"`, plus de `max-h-[80vh]` sur le `<form>`
- Listes joueurs/coachs : `overflow-hidden` (scroll uniquement sur le corps de la modale)

## 3. UX fenêtre « Ajouter stage »

- Boutons **Annuler** / **Créer stage** dans le footer fixe
- Messages erreur / succès dans le footer
- Validation : nom obligatoire, dates cohérentes (`validateStageForm`)
- Succès local : *« Stage sauvegardé localement »* + détail automatisation

## 4. Automatisation (Supabase ou local)

`provisionStageAfterCreate` → branche `provisionStageLocal` si mode test :

- Hébergement → besoins en localStorage
- Restauration → `besoins_restauration` local
- Terrains → `reservations` + `calendrier_stages` local
- Historique → `historique` local

## Fichiers modifiés

- `components/ui/Modal.tsx`
- `components/ui/LocalTestBadge.tsx`
- `components/stages/StagesClient.tsx`
- `components/stages/StageAddForm.tsx`
- `lib/data/stages.ts`, `infrastructures.ts`, `joueurs.ts`, `entraineurs.ts`, `materiel.ts`
- `lib/data/reservation-infra.ts`, `restauration.ts`
- `lib/audit/historique.ts`
- `lib/stages/provision-stage.ts`
- `lib/stages/validate-stage-form.ts`

## Tests agent

- `npm run build` — OK
- Logique fallback branchée sur toutes les couches data du formulaire stage

## Tests manuels

1. http://localhost:3001/stages → **Ajouter stage**
2. Sans `.env.local` valide → badge **Mode local test**, création OK
3. Avec Supabase configuré → écriture normale en base
4. Vérifier une seule scrollbar dans la popup
5. Stage avec hébergement + restauration + terrains → message succès footer
