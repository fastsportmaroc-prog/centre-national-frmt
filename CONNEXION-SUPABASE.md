# Connexion Supabase — guide rapide

## Si vous avez créé l'utilisateur dans le dashboard Supabase

1. **Authentication → Users** → cliquez sur l'utilisateur
2. Cochez **Auto Confirm User** (ou confirmez l'email manuellement)
3. Le mot de passe doit être celui défini à la création (sensible à la casse)

## Migration obligatoire (une fois)

Dans **Supabase → SQL Editor**, exécutez le fichier :

`supabase/migrations/017_auth_ensure_profile.sql`

Cela crée la fonction `ensure_my_profile()` pour les comptes sans ligne `profiles`.

## Donner les droits admin à votre compte

Après première connexion réussie, dans SQL Editor :

```sql
update public.profiles
set role = 'admin', frmt_role = 'admin'
where email = 'VOTRE_EMAIL@frmt.ma';
```

(Remplacez l'email — ne supprime aucune donnée.)

## Email non confirmé

**Authentication → Providers → Email** → désactivez **Confirm email** pour les tests, ou confirmez l'utilisateur dans **Users**.

## URL locales (Supabase → Authentication → URL Configuration)

- Site URL : `http://localhost:3000`
- Redirect URLs : `http://localhost:3000/**`

## Clé API dans `.env.local`

Utilisez la clé **anon** ou **publishable** du projet (Settings → API).

```
NEXT_PUBLIC_SUPABASE_URL=https://kcwvqwvcyiiwalyvhvxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_ici
```

Puis redémarrez : `npm run dev`
