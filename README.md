# Centre National FRMT

Plateforme de gestion du **Centre National** — Fédération Royale Marocaine de Tennis (FRMT).

## Stack

- **Next.js 16** · React 19 · TypeScript · Tailwind CSS 4
- **Supabase** (auth, PostgreSQL, storage, RLS)
- **jsPDF** — exports PDF fédération
- Déploiement cible : **Vercel** + **GitHub**

## Démarrage local

```bash
cd C:\Users\USER\tennis-center
npm install
cp .env.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) — connexion : `/auth/login`.

## Supabase

1. Exécuter `supabase/FRMT_CENTRE_NATIONAL_COMPLET.sql` dans le SQL Editor.
2. Puis `supabase/migrations/016_production_frmt.sql` si besoin.
3. Promouvoir un admin :

```sql
update public.profiles
set role = 'admin', frmt_role = 'admin'
where email = 'votre@email.fr';
```

## Git & GitHub

```powershell
cd C:\Users\USER\tennis-center
.\scripts\setup-git-github.ps1
```

Dépôt : [github.com/fastsportmaroc-prog/centre-national-frmt](https://github.com/fastsportmaroc-prog/centre-national-frmt)

## Vercel

Variables d'environnement (Production) :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon / publishable |
| `NEXT_PUBLIC_SITE_URL` | URL Vercel (ex. `https://xxx.vercel.app`) |

```powershell
.\scripts\deploy-vercel.ps1
```

Ou : importer le repo GitHub dans [vercel.com/new](https://vercel.com/new).

## Modules

- Joueurs, groupes, classement FRMT
- Entraîneurs, infrastructures, réservations
- Stages, budget annuel, budget déplacement
- Restauration, billets, logistique
- Analytics, historique / audit, exports PDF
- Rôles : admin, direction, coach, staff

## Scripts

| Commande | Usage |
|----------|--------|
| `npm run build` | Build production |
| `npm run import:frmt-classement` | Mettre à jour le JSON classement |
| `npm run logo:install` | Logo PNG officiel |

## Licence

Usage interne FRMT — document confidentiel.
