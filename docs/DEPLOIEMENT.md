# Déploiement Tennis Center Pro

## 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** : exécutez dans l’ordre :
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_auth_storage_admin.sql`
3. **Authentication → Providers** : activez Email.
4. **Authentication → URL Configuration** : ajoutez :
   - Site URL : `https://votre-app.vercel.app`
   - Redirect URLs : `https://votre-app.vercel.app/auth/callback`
5. **Storage** : vérifiez le bucket `joueurs-photos` (public).
6. Créez un compte via l’app, puis en SQL :
   ```sql
   update public.profiles set role = 'admin' where email = 'votre@email.com';
   ```

## 2. Variables d’environnement

Copiez `.env.example` vers `.env.local` en local, ou configurez sur Vercel :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (publishable) |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site |

## 3. Vercel

1. Poussez le code sur GitHub.
2. [vercel.com/new](https://vercel.com/new) → importez le repo.
3. **Root Directory** : `tennis-center` si le repo est à la racine parente.
4. Ajoutez les variables d’environnement.
5. Déployez.

## 4. Mode démo (sans Supabase)

Sans variables Supabase valides : page `/auth/login` → **Entrer en mode démo** (données mockées, admin démo).
