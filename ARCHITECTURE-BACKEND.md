# Architecture Backend Wigenz (wigenz-backen)

## 1. Point d'entrée et configuration

| Élément | Fichier | Rôle |
|--------|---------|------|
| **Démarrage** | `server.js` (racine) | Charge `dotenv`, monte `src/app`, écoute sur `PORT` (défaut 3000). |
| **Application Express** | `src/app.js` | Montage des middlewares globaux, des listeners EventBus, et de toutes les routes. |
| **Base de données** | `src/db.js` | Pool PostgreSQL (pg). Défaut : `wigenz_db`, localhost:5432, user/postgres. Connexion via `src/config/db.js` (réexport). |
| **Variables d'env** | `.env` (wigenz-backen) | `DB_*`, `JWT_SECRET`, `PORT`, `EMAIL_*`, etc. |

---

## 2. Structure des dossiers (src/)

```
src/
├── app.js                    # Application Express, routes, listeners
├── db.js                     # Pool PostgreSQL
├── config/
│   └── db.js                 # Réexporte db (utilisé par les routes)
├── core/
│   ├── eventBus.js           # EventEmitter singleton (événements métier)
│   └── errors.js             # Classe AppError(message, statusCode)
├── middlewares/
│   ├── auth.js               # → auth.middleware.js
│   ├── auth.middleware.js    # JWT Bearer, décode et met req.user
│   ├── role.middleware.js    # Vérifie req.user.role ∈ allowedRoles
│   ├── error.middleware.js   # Gestionnaire d’erreurs global (500, log)
│   ├── logger.middleware.js  # Log des requêtes
│   └── driverSubscription.middleware.js  # Vérif abo actif pour DRIVER
├── routes/
│   ├── auth/                 # Inscription, login (JWT)
│   ├── clients/              # Commandes client (création, annulation), orders.routes
│   ├── orderEngine/          # Création commande, OrderRepository, statuts, annulation
│   ├── dispatch/             # Géohash, algorithme dispatch, timeout, listener ORDER_CREATED
│   ├── delivery/             # delivery.guard, photo.service, otp.service, geo.service, cancellation.service
│   ├── payment/              # Paiements, remboursements, listener ORDER_DELIVERED
│   ├── payout/               # Demandes de paiement chauffeur, CRON 10h, repository
│   ├── wallet/               # Portefeuille (débit/crédit), WalletService, WalletRepository
│   ├── Admin/                # Toutes routes admin (auth + adminOnly) : finance, operations, risk, support, audit, etc.
│   ├── drivers/              # Routes chauffeur (localisation, etc.)
│   ├── support/              # Tickets, réponses, pièces jointes, EventBus support
│   ├── notification/         # notifyClient, notifyAdmins, email, push, listeners
│   ├── audit/                # AuditService (hash chaîné), audit.listener (EventBus)
│   ├── fraud/                # fraud.listener (ORDER_CREATED)
│   ├── fintech/              # Ledger (ledger.service, snapshot), écritures chaînées
│   ├── subcriptions/         # Abonnement chauffeur, subscription.engine, guards
│   └── invoice/              # Facturation (invoice.service, controller)
├── controllers/              # Quelques controllers historiques (wallet, ticket)
├── security/                 # signature.service, monitoring.service
├── rbac/                     # rôle.service, rbac.midlleware
├── i18n/                     # Internationalisation
├── utils/                    # log-system
└── notifications/            # email.service (doublon possible avec routes/notification)
```

---

## 3. Chaîne requête : Middlewares globaux (app.js)

1. **express.json()** – Body JSON  
2. **helmet()** – En-têtes sécurité  
3. **cors()** – Origin `http://localhost:3001`, credentials  
4. **logger** – Log requêtes  
5. **rateLimit** – 100 req / 15 min  
6. **Routes** (voir §5)  
7. **driverSubscriptionMiddleware** – Vérifie abonnement actif pour les chauffeurs  
8. **404** – Route non trouvée  
9. **errorHandler** – Erreurs globales (500, log stack)  

Les listeners EventBus sont chargés au démarrage (avant les routes) :  
`audit.listener`, `notification.listener`, `dispatch.listener`, `support.listener`.

---

## 4. Authentification et autorisation

| Couche | Fichier | Comportement |
|--------|---------|--------------|
| **Auth** | `auth.middleware.js` | Header `Authorization: Bearer <token>`, JWT vérifié avec `JWT_SECRET`, `req.user = decoded` (id, role, …). |
| **Rôle** | `role.middleware.js` | `roleMiddleware(["CLIENT","DRIVER"])` → 403 si `req.user.role` non dans la liste. |
| **Admin** | `Admin/admin.middleware.js` | Après auth : 403 si `role !== "ADMIN"` et `!== "SUPER_ADMIN"`. |

Typique : **auth** sur tout le routeur, puis **role** ou **adminOnly** sur des routes ou sous-chemins.

---

## 5. Routes exposées (montage dans app.js)

| Préfixe | Fichier | Rôle |
|---------|---------|------|
| **/users** | clients/client.routes | Utilisateurs (clients). |
| **/wallet** | wallet/wallet.routes | Portefeuille. |
| **/api/drivers** | drivers/drivers.routes | Chauffeurs (localisation, etc.). |
| **/admin** | Admin/admin.routes | Toutes les routes admin (auth + adminOnly). |
| **/api/auth** | auth/auth.routes | POST register, POST login. |
| **/api/payments** | payment/ (paiement.controller) | Paiements. |
| **/api/payouts** | payout/payout.controller | Payouts chauffeur. |
| **/api/orders** | orderEngine/orders.routes | Moteur commandes (côté interne/engine). |
| **/api/client-orders** | clients/orders.routes | Création commande client (POST /), annulation (PATCH /:id/cancel). |
| **/api/dispatch** | dispatch/dispath.route | Mise à jour position chauffeur (POST /location). |
| **/api/support** | support/support.routes | Tickets (création, liste, détail, réponses, pièces jointes). |

Routes **admin** (sous `/admin`) : finance (overview, payments, payouts, refund), operations (drivers, orders, driver status), risk (flagged, suspended, high risk, reset), support (tickets list, détail, resolve, status, assign, replies), orders (approve/reject), drivers (suspend/activate), payout process, fraud stats, audit/export.

---

## 6. Pattern métier : Controller → Service → Repository → DB

- **Controller** : Reçoit `req`/`res`, appelle le **Service**, renvoie JSON ou délègue à `next(err)`.  
- **Service** : Logique métier, appels EventBus, validation, orchestration. Utilise **Repository** et parfois autres services (Wallet, Ledger, etc.).  
- **Repository** : Accès données (SQL via `db` ou `config/db`). Pas d’événements.  

Exemples :  
- **Support** : `support.controller` → `support.service` → `support.repository` → `db`.  
- **Commandes** : `orders.routes` (clients) appelle `createOrder` (orderEngine/orders.service) → `OrderRepository` ; puis `eventBus.emit("ORDER_CREATED", order)`.  
- **Dispatch** : `dispatch.listener` sur `ORDER_CREATED` → `DispatchService.dispatch(order)` → `DispatchRepository` + `dispatch.algorithm` + `geohash.utils`.  

Connexion DB : la plupart des modules utilisent `require("../../config/db")` (ou `../config/db` selon profondeur) ; `config/db.js` réexporte `src/db.js` (Pool pg).

---

## 7. EventBus : émetteurs et listeners

| Événement | Émetteur | Listeners |
|-----------|----------|-----------|
| **ORDER_CREATED** | orderEngine/orders.service (après create) | audit, notification (notifyClient), dispatch (dispatch puis DISPATCH_DRIVERS_FOUND / DISPATCH_FAILED), fraud |
| **ORDER_PICKED_UP** | order.engine (changeStatus) | notification |
| **ORDER_IN_TRANSIT** | idem | notification |
| **ORDER_DELIVERY_PENDING_VERIFICATION** | idem | notification |
| **ORDER_DELIVERED** | idem | notification, payment.listener, delivery.listener |
| **DISPATCH_DRIVERS_FOUND** / **DISPATCH_FAILED** | dispatch.listener | (consommation côté client/app possible) |
| **DISPATCH_TIMEOUT** | dispatch.timeout | - |
| **WALLET_DEBITED** / **WITHDRAW_SUCCESS** / **WITHDRAW_BLOCKED** | wallet.service | audit |
| **REFUND_EXECUTED** | (payment/refund) | audit |
| **DELIVERY_APPROVED_ADMIN** / **DRIVER_SUSPENDED** / **PAYOUT_EXECUTED** | (admin, payout) | audit |
| **USER_DELETED** / **SUBSCRIPTION_*** | (admin, subscription) | audit |
| **TICKET_OPENED** / **TICKET_REPLIED** / **TICKET_RESOLVED** | support.service | audit, support.listener (notifyAdmins, notifyClient) |
| **FINANCE_EXPORT_ALERT** | admin.finance.controller | - |
| **SUBSCRIPTION_RENEWED** | subscription.engine | - |

L’EventBus est un **EventEmitter** Node (singleton dans `core/eventBus.js`). Les listeners sont chargés au démarrage dans `app.js` ; les émissions ont lieu dans les services après actions métier.

---

## 8. Flux métier principaux

- **Création commande**  
  `POST /api/client-orders` (clients/orders.routes) → `createOrder` (orderEngine) → `OrderRepository.create` → `eventBus.emit("ORDER_CREATED", order)` → dispatch + audit + notification + fraud.

- **Dispatch**  
  Sur `ORDER_CREATED`, `dispatch.listener` appelle `DispatchService.dispatch(order)` (géohash, drivers proches, algorithme de classement, top 5). Émet `DISPATCH_DRIVERS_FOUND` ou `DISPATCH_FAILED`.  
  Route chauffeur : `POST /api/dispatch/location` pour mise à jour position.

- **Cycle de vie commande**  
  `order.engine.js` (ou `clients/order.engine.js`) : `changeStatus(orderId, newStatus, actor)` avec transitions (ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERY_PENDING_VERIFICATION → DELIVERED). Transaction SQL + `eventBus.emit("ORDER_<STATUS>", updatedOrder)`.

- **Livraison (delivery guard)**  
  `delivery.guard` valide photo (métadonnées), GPS, signature, OTP selon règles (cas normal / GPS imprécis). Services associés : photo.service, otp.service, geo.service.

- **Paiement client / Payout chauffeur**  
  Payment après livraison ; payout avec délai (file, CRON 10h dans payout). Wallet : débit/crédit + EventBus (WALLET_DEBITED, etc.). Ledger (fintech) : écritures chaînées (previous_hash, SHA256).

- **Support**  
  Tickets (création, réponses, pièces jointes), priorité/catégorie, admin (liste, statut, assignation). EventBus : TICKET_OPENED → alerte admins ; TICKET_REPLIED / TICKET_RESOLVED → notification client.

- **Annulation**  
  `clients/annulation-delivery.js` (CancelDeliveryService) + `orderEngine/annulation-livraison.js`. Règles (avant/après déplacement, frais).

---

## 9. Sécurité et transversal

- **Auth** : JWT (Bearer), vérification à chaque route protégée.  
- **RBAC** : `roleMiddleware`, `adminOnly` ; certains controllers admin utilisent `roleMiddleware(["ADMIN","SUPER_ADMIN"])` (ex. audit/export).  
- **Abonnement chauffeur** : `driverSubscription.middleware` vérifie `subscription_status` et `subscription_end` pour les DRIVER.  
- **Rate limiting** : 100 req / 15 min (global).  
- **Helmet** : en-têtes sécurisés.  
- **CORS** : origin fixe localhost:3001.  
- **Audit** : journal des actions critiques (AuditService + hash chaîné), alimenté par les listeners EventBus.  
- **Ledger (fintech)** : registre immuable (hash SHA256, previous_hash) pour écritures financières.

---

## 10. Incohérences et points d’attention

| Élément | Détail |
|--------|--------|
| **Typo** | `dispath.route.js` (dispatch) ; `dipatch.fallback.js` ; `subscription.engine.js.js` ; `rôle.service.js` (accent) ; `rbac.midlleware.js` (midlleware). |
| **DB** | La plupart des modules utilisent `require("../../config/db")` ; quelques-uns `require("../config/db")`. `src/config/db.js` → `require("../db")`. Cohérent mais deux chemins selon l’emplacement du fichier. |
| **Doublons / legacy** | `src/controllers/ticket.controller.js` vs module support (support.controller, support.routes). `src/notifications/email.service.js` vs `src/routes/notification/email.service.js`. À clarifier (legacy vs actif). |
| **Error handler** | Corrigé : utilise désormais `err.statusCode` (ex. AppError) si présent. |
| **Dashboard repository** | `Admin/subcription-dashboard/dashboard.repository.js` utilise `require('../../../config/db')` (3 niveaux) : à vérifier selon l’emplacement réel du fichier. |

---

## 12. Résumé

- **Stack** : Node.js, Express, PostgreSQL (wigenz_db), JWT, EventEmitter (EventBus).  
- **Structure** : Modulaire par domaine sous `src/routes/`, avec core (eventBus, errors), middlewares (auth, role, admin, driverSubscription, logger, error), config (db).  
- **Flux** : Controller → Service → Repository → DB ; événements métier via EventBus pour audit, notifications, dispatch, support.  
- **Sécurité** : JWT, rôles, adminOnly, abonnement chauffeur, rate limit, helmet, CORS.  
- **Fintech / traçabilité** : Wallet, Ledger (hash chaîné), Audit (hash chaîné).

Ce document peut servir de base pour l’onboarding et l’évolution du backend Wigenz.
