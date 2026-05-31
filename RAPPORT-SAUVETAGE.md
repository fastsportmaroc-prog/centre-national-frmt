# Rapport — Reconstruction stable FRMT (local)

**Date :** 23 mai 2026  
**Projet :** `C:\Users\USER\tennis-center`

## Confirmations

| Règle | Statut |
|--------|--------|
| Aucun `git push` | ✅ |
| Aucun déploiement Vercel | ✅ |
| Aucune modification Supabase production | ✅ |
| Aucune suppression SQL des stages via l’app | ✅ (`deleteStageProgramme` désactivé) |
| Aucun mock data ajouté | ✅ |
| Travail local uniquement | ✅ |

## Étapes exécutées

1. **Arrêt** — `taskkill /F /IM node.exe`, suppression `.next` et `node_modules/.cache`
2. **Sauvegarde** — `emergency-save/` recréé ; `git stash push -u -m "emergency-before-full-recovery"` (stash existant)
3. **Diagnostic** — stash avait remis le dépôt à HEAD (correctifs précédents annulés)
4. **Stabilisation** — correctifs réappliqués (voir ci-dessous)
5. **Build** — `npm run build` **OK**
6. **Dev** — `npm run dev:3001` → http://localhost:3001

## Fichiers modifiés (stabilisation)

| Fichier | Action |
|---------|--------|
| `lib/data/stages.ts` | Suppression SQL désactivée (`STAGE_DELETE_ENABLED = false`) |
| `components/stages/StagesClient.tsx` | Chargement stages isolé, erreurs formulaire, bouton poubelle retiré |
| `components/stages/StageDetailClient.tsx` | Sync planning/matériel désactivée (message) |
| `components/dashboard/DashboardClient.tsx` | Dashboard minimal (hero logo, KPI, CNE, alertes) |
| `components/layout/nav-items.ts` | Menu « Résultats internationaux » retiré |
| `app/(app)/performances/layout.tsx` | Performances désactivées (message) |
| `app/api/stages/count/route.ts` | Diagnostic `GET /api/stages/count` |

## Modules désactivés temporairement (non supprimés)

- Suppression de stages (UI + API data layer)
- Synchronisation auto stage (`synchroniserStage` sur fiche détail)
- Widgets dashboard : `FrmtProductionDashboard`, `PerformancesDashboardSection`
- Navigation directe vers `/performances/marocains`
- Pages performances : layout avec bandeau « désactivé »

## État build

```
npm run build → SUCCÈS (Next.js 16.2.6)
```

## État localhost

- URL : **http://localhost:3001**
- Login : middleware Supabase + `.env.local` (inchangé)
- Tests manuels recommandés : login → dashboard → stages → navigation → PDF fiche stage

## État Supabase

- Connexion via variables locales uniquement (`.env.local`)
- Aucune migration / script prod exécuté par cet agent
- Si stages « invisibles » : vérifier `http://localhost:3001/api/stages/count`  
  Si `deleted_at` renseigné en base (hors app) :
  ```sql
  UPDATE public.stages_programme
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE deleted_at IS NOT NULL;
  ```

## Erreurs restantes

- Aucune erreur bloquante au build
- Performances / scraping / sync auto : désactivés, pas retirés du code source

## Récupération stash

Pour revoir l’état avant sauvetage :
```powershell
git stash list
# stash@{0}: emergency-before-full-recovery
```

Ne pas appliquer le stash sans sauvegarde si vous souhaitez garder cette version stable.
