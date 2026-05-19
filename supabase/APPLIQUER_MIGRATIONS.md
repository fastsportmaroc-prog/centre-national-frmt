# Appliquer les migrations Supabase — Centre National FRMT

Projet : `https://kcwvqwvcyiiwalyvhvxz.supabase.co`

## Prérequis

- `.env.local` configuré (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Redémarrer `npm run dev` après modification de `.env.local`

## Méthode 1 — SQL Editor (recommandée, sans CLI)

1. Ouvrir [Supabase Dashboard](https://supabase.com/dashboard/project/kcwvqwvcyiiwalyvhvxz/sql/new) → **SQL Editor** → **New query**
2. Exécuter **chaque fichier** dans `supabase/migrations/` **dans l’ordre** (un par un, ou coller le contenu de chaque fichier) :

| # | Fichier | Contenu |
|---|---------|---------|
| 1 | `001_init.sql` | Joueurs, courts, réservations de base |
| 2 | `002_auth_storage_admin.sql` | Profils, auth, storage photos, RLS |
| 3 | `003_phase1_joueurs_groupes.sql` | Groupes, joueurs/courts enrichis |
| 4 | `004_phase2_logistique_historique.sql` | Logistique, billets, historique |
| 5 | `005_passeport.sql` | Passeport, visas |
| 6 | `006_performances_maroc.sql` | Performances internationales |
| 7 | `007_hebergement_pavillons.sql` | Hébergement pavillons |
| 8 | `008_billets_aeroports.sql` | Aéroports IATA |
| 9 | `009_billets_prix_depenses.sql` | Prix billets, dépenses joueur |
| 10 | `010_restauration_prestataires.sql` | Restauration |
| 11 | `011_cne_stages_occupation.sql` | Stages CNE, occupation |
| 12 | `012_system_import_logs.sql` | Imports Excel, logs |
| 13 | `013_entraineurs_budget.sql` | Entraîneurs, budget annuel |
| 14 | `014_infrastructures_materiel_budget_deplacement.sql` | Infrastructures, matériel, budget déplacement |
| 15 | `015_stages_links_reservations_infra.sql` | Liens stages, réservations infra |

3. Si une migration échoue avec « already exists », c’est souvent normal (ré-exécution) : vérifier le message et passer à la suivante.

## Méthode 2 — Supabase CLI

```powershell
cd C:\Users\USER\tennis-center
npx supabase login
npx supabase link --project-ref kcwvqwvcyiiwalyvhvxz
npx supabase db push
```

## Après les migrations

1. **Storage** (Dashboard → Storage) : créer les buckets si besoin (`joueur-photos`, `passeport-documents`, etc. — voir commentaires dans `002` et `005`).
2. **Premier admin** : s’inscrire via `/auth/login`, puis dans SQL Editor :

```sql
update public.profiles set role = 'admin' where email = 'votre@email.com';
```

3. Vérifier **Paramètres** / **Administration** : statut **Connecté**.
4. Les listes vides au début sont normales : importer via **Import Excel CNE** ou saisir des données dans l’app.

## Vérification rapide

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Tables attendues (extrait) : `joueurs`, `courts`, `reservations`, `stages_programme`, `infrastructures`, `materiels`, `budget_deplacement`, `reservations_infrastructure`, `historique`, …
