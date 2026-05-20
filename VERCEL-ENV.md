# Variables Vercel — Supabase

## Noms exacts (obligatoires)

| Variable | Exemple |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kcwvqwvcyiiwalyvhvxz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé **anon** ou **publishable** (Supabase → Settings → API) |
| `NEXT_PUBLIC_SITE_URL` | `https://votre-projet.vercel.app` |

Cochez **Production** et **Preview**.

## Après modification

1. **Deployments → … → Redeploy**
2. Cochez **Use existing Build Cache** = **OFF** (rebuild avec les nouvelles variables)

## Test

`https://VOTRE-URL.vercel.app/api/health`

Attendu :

```json
{
  "supabaseConfigured": true,
  "diagnostics": {
    "hasUrl": true,
    "hasAnonKey": true,
    "keyLength": 46
  }
}
```

Si `supabaseConfigured: false`, le champ `hint` indique la cause.

## Supabase Auth

- Site URL = URL Vercel
- Redirect : `https://*.vercel.app/auth/callback`
