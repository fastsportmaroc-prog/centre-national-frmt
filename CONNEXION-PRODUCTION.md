# Connexion en production (Vercel + Supabase)

## Problème identifié

1. **Build Vercel en échec** : sur GitHub, `lib/supabase/middleware.ts` et `server.ts` n’avaient pas encore le type `CookieToSet` (erreur TypeScript stricte). Le correctif est sur votre PC — il faut **pousser** avec `scripts/PUBLIER-MAINTENANT.ps1`.

2. **Connexion impossible** même si le site s’affiche : variables Supabase absentes sur Vercel → page login affiche « Connexion indisponible ».

## Une commande pour tout publier

Double-cliquez `scripts\PUBLIER-MAINTENANT.bat` ou dans PowerShell :

```powershell
cd C:\Users\USER\tennis-center
.\scripts\PUBLIER-MAINTENANT.ps1
```

## Variables Vercel (obligatoires)

Projet : **centre-national-frmt** (gardez un seul projet Vercel, supprimez le doublon `centre-national-frmt-v2` si possible).

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kcwvqwvcyiiwalyvhvxz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copier depuis `.env.local`) |
| `NEXT_PUBLIC_SITE_URL` | `https://VOTRE-URL.vercel.app` (après 1er deploy) |

Puis **Redeploy**.

## Supabase (Authentication)

Dashboard → **Authentication** → **URL Configuration** :

- **Site URL** : `https://VOTRE-URL.vercel.app`
- **Redirect URLs** :
  - `https://VOTRE-URL.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback`

## Vérifier que tout est OK

Ouvrez : `https://VOTRE-URL.vercel.app/api/health`

Réponse attendue :

```json
{ "ok": true, "supabaseConfigured": true, "vercel": true }
```

Si `supabaseConfigured` est `false`, les variables Vercel manquent ou sont incorrectes.

## Se connecter

1. `https://VOTRE-URL.vercel.app/auth/login`
2. Email + mot de passe d’un utilisateur créé dans Supabase → **Authentication** → **Users**
3. Si « Email not confirmed » : confirmer l’email ou désactiver la confirmation email dans Supabase.

## En local (immédiat)

```powershell
cd C:\Users\USER\tennis-center
npm run dev
```

Puis : http://localhost:3000/auth/login
