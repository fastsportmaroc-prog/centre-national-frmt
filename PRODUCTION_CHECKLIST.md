# Checklist production — Centre National FRMT

## Avant mise en ligne

- [ ] `npm run build` OK en local
- [ ] Migrations Supabase exécutées (`FRMT_CENTRE_NATIONAL_COMPLET.sql` + `016`)
- [ ] Compte admin : `profiles.role` + `profiles.frmt_role` = `admin`
- [ ] Variables Vercel = mêmes que `.env.local` (jamais committer `.env.local`)
- [ ] `NEXT_PUBLIC_SITE_URL` = URL Vercel finale (callbacks auth)
- [ ] Storage buckets : `joueurs-photos`, `documents`, `entraineurs-photos`
- [ ] RLS activées sur toutes les tables sensibles

## GitHub

- [ ] Repo : `fastsportmaroc-prog/centre-national-frmt`
- [ ] Branche `main` à jour
- [ ] `.env*` ignoré par git

## Vercel

- [ ] Projet lié au repo GitHub
- [ ] Build command : `npm run build`
- [ ] Node 20+
- [ ] Domaine personnalisé (optionnel)

## Sécurité

- [ ] Pas de clé `service_role` côté client
- [ ] Confirmation email Supabase en production
- [ ] Politiques RLS testées par rôle

## Fonctionnel

- [ ] Login / logout
- [ ] CRUD joueurs + upload photo
- [ ] Import classement FRMT (bouton ou POST `/api/frmt/classement`)
- [ ] Exports PDF budget / rapports
- [ ] Dashboard analytics
- [ ] Responsive mobile (sidebar + tableaux)

## Reste connu (non bloquant)

- Performances tennis : encore données locales (`performances.ts`)
- Sync API tennis : mode `TENNIS_DATA_MODE=dataset` par défaut
