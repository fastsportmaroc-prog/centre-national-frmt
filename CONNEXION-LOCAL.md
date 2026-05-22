# Connexion locale — FRMT Centre National

## Démarrer (rien à coller)

Double-clic **`DEMARRER.bat`** ou dans PowerShell :

```powershell
cd C:\Users\USER\tennis-center
npm run demarrer
```

→ **http://localhost:3001/auth/login**

## Fichier `.env.local` (obligatoire)

```env
NEXT_PUBLIC_SUPABASE_URL=https://kcwvqwvcyiiwalyvhvxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...ou_eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Clé : Supabase Dashboard → **Settings → API** → **anon** (eyJ…) ou **publishable** (sb_publishable_…).

## Vérifier Supabase sans l’app

```powershell
npm run verify:supabase
npm run verify:supabase -- s.abderrazzaq@frmt.ma VOTRE_MOT_DE_PASSE
```

## Supabase Dashboard (une fois)

1. **Authentication → URL Configuration** : ajouter  
   `http://localhost:3001/**` et `http://localhost:3000/**`
2. **Authentication → Users** : utilisateur **Confirmé** (coche verte)
3. Ou désactiver **Confirm email** dans Providers → Email

## Login technique

- Connexion via **Server Action** (cookies gérés par Next.js + Supabase SSR)
- Plus de dépendance aux variables `NEXT_PUBLIC_*` vides côté navigateur

## Si erreur après connexion

| Message | Action |
|---------|--------|
| Email ou mot de passe incorrect | Vérifier identifiants Supabase |
| Email non confirmé | Confirmer l’utilisateur dans Supabase |
| Clé invalide | Recopier la clé API dans `.env.local`, `npm run demarrer` |
