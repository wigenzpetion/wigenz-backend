# Vérification des rôles — Backend Wigenz

## Rôles identifiés dans le code

Le projet utilise un **RBAC** (Role-Based Access Control) via `role.middleware.js`. Les rôles sont stockés dans `req.user.role` (issu du JWT après authentification).

| Rôle | Table / Entité | Utilisation | Accès |
|------|----------------|-------------|-------|
| **admin** | `users` | Administrateur complet | Tout le module admin, gestion users/drivers, suspend, delete, dashboard |
| **support** | `users` | Support client | Lecture users/drivers, tickets (si monté) |
| **driver** | `drivers` | Chauffeur | Profil chauffeur, abonnement, retrait wallet (avec guards) |
| **user** | `users` | Utilisateur standard | Implicite — profil via `/users/profile/me` (aucune restriction de rôle) |

---

## Détail par module

### 1. Admin (`/admin`)
- **Rôle requis :** `admin` uniquement
- **Fichier :** `admin.routes.js` → `router.use(role(['admin']))`
- **Actions :** dashboard, getAllUsers, deleteUser, suspendDriver
- **Sous-module dashboard abonnements :** `role(['admin'])`

### 2. Users (`/users`)
| Route | Rôles autorisés |
|-------|-----------------|
| `GET /` | admin |
| `GET /:id` | admin, support |
| `GET /profile/me` | * (tous utilisateurs authentifiés) |
| `PUT /profile/me` | * (tous utilisateurs authentifiés) |
| `PUT /:id/role` | admin |
| `PUT /:id/suspend` | admin |
| `DELETE /:id` | admin |

### 3. Drivers (`/api/drivers`)
| Route | Rôles autorisés |
|-------|-----------------|
| `GET /` | admin |
| `GET /:id` | admin, support |
| `GET /profile/me` | driver |
| `PUT /:id/approve` | admin |
| `PUT /profile/me` | driver |
| `PUT /:id/suspend` | admin |

### 4. Wallet (`/wallet`)
| Route | Rôles |
|-------|-------|
| `POST /debit` | Aucune (pas d'auth) |
| `POST /withdraw` | Tous authentifiés — guards spécifiques pour `driver` |

**Remarque :** `wallet` n’est **pas un rôle**. C’est un module. Les retraits appliquent `withdrawalGuard` qui ne fait des contrôles d’abonnement que pour les `driver`.

### 5. Autres (non montés dans app.js)
- **ticket.routes.js** : `role(['admin','support'])`
- **delivery.routes.js** : `role(['driver'])`

---

## Rôles utilisés dans le code (références)

| Chaîne | Fichiers |
|--------|----------|
| `admin` | admin.routes, user.routes, drivers.routes, dashboard.routes, auth.controller (fake user) |
| `support` | user.routes, drivers.routes, ticket.routes |
| `driver` | drivers.routes, delivery.routes, withdrawalGuard, driverSubscription, subcription.service (actorRole) |

---

## Structure des données

- **Table `users`** : `id`, `email`, `role` (admin, support, user, etc.)
- **Table `drivers`** : entité séparée — un chauffeur a un `req.user.role === 'driver'` (lien users ↔ drivers à confirmer selon le schéma DB)
- **admin_logs** : `admin_id`, `action`, `target_id`

---

## Points à clarifier

1. **Rôle `user`** : jamais utilisé dans `role([...])`. Les routes `/users/profile/me` sont accessibles à tout utilisateur authentifié. À décider : faut-il restreindre à `role(['user'])` pour exclure admin/support/driver ?
2. **Table users vs drivers** : les chauffeurs sont-ils des lignes dans `users` avec `role='driver'` ou dans une table `drivers` séparée ? Le repository admin interroge les deux tables.
3. **POST /wallet/debit** : pas d’auth — probablement réservé à un appel interne/admin. À sécuriser si exposé.
4. **Rôles autorisés pour updateUserRole** : `user.controllers.updateUserRole` ne valide pas les rôles autorisés. Risque d’assigner n’importe quel rôle.

---

## Synthèse — Liste des rôles

```
admin   → Accès complet administration
support → Lecture users/drivers, tickets
driver  → Chauffeur (profil, abonnement, retrait wallet)
user    → Utilisateur standard (implicite, profil personnel)
```

**Note :** Aucune constante centralisée (ex. `ROLES.js`) n’existe. Les rôles sont en dur dans les middlewares. Une centralisation serait utile pour éviter les typos et faciliter l’évolution.
