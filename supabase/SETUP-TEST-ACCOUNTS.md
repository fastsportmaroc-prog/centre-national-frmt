# Comptes de test — Supabase Studio

Exécuter d’abord dans l’ordre :
1. `fix-profiles-roles.sql`
2. `rls-by-role.sql`
3. `migration-alerts.sql`
4. `migration-historique-v2.sql`

## Créer les utilisateurs (Authentication → Users → Add user)

| Email | Mot de passe (temporaire) | Rôle dans `profiles` |
|-------|---------------------------|----------------------|
| admin@frmt.ma | (définir) | `admin` |
| coach@frmt.ma | (définir) | `entraineur` |
| direction@frmt.ma | (définir) | `direction` |

Après création, mettre à jour `profiles` (SQL ou Table Editor) :

```sql
UPDATE profiles SET role = 'admin', actif = true, prenom = 'Admin', nom = 'FRMT'
WHERE email = 'admin@frmt.ma';

UPDATE profiles SET role = 'entraineur', actif = true, prenom = 'Coach', nom = 'Test'
WHERE email = 'coach@frmt.ma';

UPDATE profiles SET role = 'direction', actif = true, prenom = 'Direction', nom = 'FRMT'
WHERE email = 'direction@frmt.ma';
```

Invitation : Paramètres → Utilisateurs (admin) nécessite `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`.

## Vérifications manuelles (localhost)

- **admin** : toutes rubriques, créer/supprimer stages, budget, utilisateurs, notifications
- **coach@frmt.ma (entraineur)** : pas Budget/Paramètres, pas bouton Supprimer
- **direction** : lecture seule, Budget + Rapports + export PDF budget, pas de boutons créer/modifier
