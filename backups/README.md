# Sauvegardes & snapshots — Centre National FRMT

Ce dossier sert au **rollback** et à la traçabilité avant les grosses modifications.

## Créer un snapshot

```bash
npm run backup:snapshot
```

Génère une copie horodatée dans `backups/snapshots/YYYYMMDD-HHMMSS/` des dossiers :

- `app/`, `components/`, `lib/`, `data/`, `supabase/migrations/`

## Restaurer manuellement

1. Choisir le dossier snapshot souhaité
2. Copier les fichiers vers la racine du projet (en conservant une copie de l'état actuel si besoin)
3. Relancer `npm run dev`

## Bonnes pratiques

- Snapshot **avant** import Excel massif ou refonte module
- Documenter dans `CHANGELOG.md`
- Ne pas versionner les gros fichiers binaires Excel dans git (utiliser `data/excel/` localement)
