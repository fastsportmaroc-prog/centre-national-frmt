# Reparer la connexion du compte FRMT

## Etape A — SQL Supabase (1 minute)

1. [SQL Editor](https://supabase.com/dashboard/project/kcwvqwvcyiiwalyvhvxz/sql/new)
2. Coller le fichier `supabase/migrations/020_auth_compte_frmt.sql`
3. **Run**

## Etape B — Reparer le compte (mot de passe + profil)

1. Ouvrir `.env.local` et ajouter la cle **service_role** :

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ... (copier depuis Settings -> API -> service_role secret)
```

2. **Double-clic** `REPARER-COMPTE.bat`  
   Ou PowerShell :

```powershell
cd C:\Users\USER\tennis-center
npm run repair:compte -- s.abderrazzaq@frmt.ma VotreMotDePasse2026
```

3. Si le script affiche **Test login: OK** → passez a l'etape C.

4. Si echec avec `sb_publishable` → remplacer dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (cle anon public, PAS sb_publishable)
```

## Etape C — Lancer l'app

1. `DEMARRER.bat`
2. http://localhost:3001/auth/login
3. Email + **meme** mot de passe que l'etape B

## Ce que la reparation fait

- Confirme l'email dans Supabase Auth
- Definit le mot de passe choisi
- Cree/met a jour `public.profiles` (role admin)
- Teste la connexion avec votre `.env.local`

Aucune suppression de donnees.
