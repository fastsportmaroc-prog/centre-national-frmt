# Changelog — Centre National FRMT

Toutes les évolutions notables du projet sont documentées ici (format inspiré de Keep a Changelog).

## [1.2.0] — 2026-05-17

### Ajouté

- Infrastructure versioning (`lib/version.ts`), snapshots (`npm run backup:snapshot`)
- Permissions FRMT par rôle (admin, directeur, entraîneur, logisticien, joueur)
- Historique des imports Excel CNE et logs système
- Insights automatiques (alertes occupation, conflits stages, logistique)
- Design premium : animations Framer Motion, skeletons, cartes améliorées
- Module Stages CNE + Occupation + import Excel + impression calendrier
- Module Restauration (événements, prestataires, factures)
- Billets avion : wizard 2 étapes, accord avec prix, dépenses joueur

### Conservé

- Tous les modules existants (joueurs, courts, hébergement, performances MAR, etc.)
- Mode mock + Supabase
- Historique d'audit (`historique`)

## [1.1.0] — 2026-05 (session précédente)

- Performances internationales joueurs marocains (ATP/WTA/ITF)
- Hébergement 3 pavillons × 5 chambres
- Billets d'avion aéroports IATA

## [1.0.0] — Initial

- Application Next.js 16, dashboard, joueurs, réservations, logistique de base
