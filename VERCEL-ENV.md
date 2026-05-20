# Variables Vercel (Production + Preview)

Copier depuis `.env.local` :

| Nom | Exemple |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kcwvqwvcyiiwalyvhvxz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé depuis Supabase → Settings → API |
| `NEXT_PUBLIC_SITE_URL` | `https://votre-projet.vercel.app` |

Après ajout : **Deployments → Redeploy**.

Supabase → Authentication → URL Configuration :
- Site URL = URL Vercel
- Redirect : `https://*.vercel.app/auth/callback`

Test : `https://votre-url.vercel.app/api/health` → `"supabaseConfigured": true`
