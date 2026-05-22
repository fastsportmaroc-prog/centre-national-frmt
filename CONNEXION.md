# Connexion FRMT — guide unique

## 1. Demarrer l'app

Double-clic **`DEMARRER.bat`** → http://localhost:3001/auth/login

## 2. Fichier `.env.local` (obligatoire)

```env
NEXT_PUBLIC_SUPABASE_URL=https://kcwvqwvcyiiwalyvhvxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # cle anon JWT, PAS sb_publishable seul
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Scripts reparation uniquement (jamais expose au navigateur)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Copier la cle **anon** `eyJ...` depuis Supabase → **Project Settings → API → anon public**.

## 3. Se connecter

- Formulaire sur `/auth/login` → **Server Action** (cookies session).
- Si « email ou mot de passe incorrect » alors que le compte existe dans Supabase :
  1. Verifier que l'utilisateur est dans **ce** projet (`kcwvqwvcyiiwalyvhvxz`).
  2. Lancer **`REPARER-COMPTE.bat`** (ou `npm run repair:compte -- email@frmt.ma MotDePasse123`).
  3. SQL Editor : executer `supabase/migrations/020_auth_compte_frmt.sql`.

## 4. Verifier

- Vert : « Serveur OK · Supabase connecte » + cle eyJ (pas warning publishable).
- Apres login : http://localhost:3001/api/auth/me → `{ "user": { ... } }`.

## 5. Ne pas faire

- Pas de `DROP` / `TRUNCATE` / delete global en base.
- Ne pas commiter `.env.local`.
