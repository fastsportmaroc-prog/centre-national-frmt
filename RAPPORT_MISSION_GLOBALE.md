# Rapport — Mission globale FRMT Centre National

**Date :** 19 mai 2026  
**Projet :** `C:\Users\USER\tennis-center`

## Où on en est (résumé)

| Zone | Statut |
|------|--------|
| Design logo → placeholder | ✅ Fait |
| Joueurs FRMT top 5 (2005–2015) + intégration Supabase | ✅ Fait (JSON ~79 joueurs) |
| RLS entraîneurs (018) | ✅ Migration prête |
| Soft delete + audit (019) | ⚠️ Migration prête — **à exécuter dans Supabase** |
| Archivage joueurs / entraîneurs / groupes (code) | ✅ Branché |
| PDF / Imprimer (joueurs liste) | ✅ Branché |
| Tous les modules audités un par un | ❌ Partiel |
| `npm run build` validé ici | ❌ Shell agent sans sortie — **à lancer chez vous** |
| `git commit` + `push main` | ❌ Non fait par l’agent |

## Fichiers modifiés (session récente)

- `lib/data/joueurs.ts` — soft delete + filtre `deleted_at`
- `lib/data/entraineurs.ts` — idem
- `lib/data/groupes.ts` — idem
- `lib/data/soft-delete.ts` — archivage sans `DELETE` SQL
- `lib/audit/audit-logs.ts` — double écriture audit + historique
- `lib/export/frmt-document.ts` — PDF sans logo, placeholder officiel
- `lib/export/module-export-client.ts` — export liste modules
- `components/joueurs/JoueursClient.tsx` — recherche, PDF, archivage confirmé
- `components/shared/*` — ModuleToolbar, ConfirmArchiveDialog, EmptyState
- `components/brand/*` — LogoPlaceholder
- `supabase/migrations/019_soft_delete_audit_logs.sql`
- `supabase/APPLIQUER_MIGRATIONS.md`

## Modules améliorés

- **Joueurs** : classement FRMT, intégration API, archivage, recherche, PDF
- **Entraîneurs** : RLS 018, création corrigée, soft delete data layer
- **Groupes** : soft delete data layer
- **Design global** : marque texte + zone logo à intégrer
- **Budget / Matériel / Dashboard** : travail antérieur (seeds, PDF budget) — voir commits précédents

## À faire chez vous (5 min)

```powershell
cd C:\Users\USER\tennis-center

# 1. Migration Supabase SQL Editor
#    → 019_soft_delete_audit_logs.sql

# 2. Build
npm run build

# 3. Git (si OK)
git add .
git commit -m "Global professional FRMT app upgrade"
git push origin main
```

## Prochaines vérifications

1. Supabase : exécuter **019** puis tester archivage d’un joueur
2. Joueurs → **Intégrer classement FRMT** → vérifier groupes U12/U14/U16/U18
3. Entraîneurs : ajouter un coach (après 018)
4. Brancher PDF + `ConfirmArchiveDialog` sur : entraîneurs, groupes, matériel, infrastructures, réservations
5. Scraper WB27 : optionnel ; JSON local en secours

## Bugs connus

- Scrape Playwright : souvent **0 joueur** (site WB27) — utiliser `data/frmt/classement-top5.json`
- Port 3000 occupé : `npm run kill-port` ou `npm run dev:3001`
