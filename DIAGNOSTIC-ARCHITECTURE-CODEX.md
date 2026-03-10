# Diagnostic d’architecture backend (synthèse Codex + Cursor)

Ce document intègre les résultats de l’analyse Codex (cartographie + risques) et les recoupe avec `ARCHITECTURE-BACKEND.md`.

---

## Après le test, analyse toute l’architecture backend : Codex a fait, voilà ce qu’il a trouvé

**Corrections P0 réalisées** (points traités) :

- ~~Document diagnostic Codex + corrections P0~~
- ~~Auth register : verrouiller role (CLIENT par défaut)~~
- ~~Error middleware : utiliser AppError.statusCode~~
- ~~emailService.send manquant → ajouter send()~~
- ~~driverSubscription : appliquer sur routes drivers/dispatch~~

*(La barre indique que chaque point a été corrigé dans le code.)*

---

## 1. Vue d’ensemble (alignement Codex / Cursor)

- **Backend** : monolithe Node/Express modulaire par domaine, PostgreSQL (wigenz_db), EventBus (EventEmitter).
- **Entrée** : `server.js` → `src/app.js` ; DB via `src/db.js` / `src/config/db.js`.
- **Structure cible** : routes → controller → service → repository.
- **État réel** : hybride — certains modules suivent le pattern (payment, payout, support, orderEngine), d’autres sont legacy/stub ou non montés (users/drivers controllers, JWT.js, ticket.routes, etc.).

---

## 2. Risques critiques (P0) — statut

| Risque | Fichiers | Correction appliquée |
|--------|----------|----------------------|
| **Escalade de privilège à l’inscription** : `role` accepté depuis le body | auth.service.js, auth.repository.js | **Oui** : en register, le rôle est forcé à `CLIENT` (plus d’usage de `data.role`). |
| **Contrôleurs stub users/drivers** : réponses factices, logique contournée | client.controller.js, driver.controller.js, client.routes, drivers.routes | **Documenté** : stubs confirmés ; à brancher sur client.service/repository et driver.service/repository. Rôles en minuscules (`admin`, `driver`) dans ces routes → à aligner avec le reste (ADMIN, DRIVER) si JWT émet en majuscules. |
| **Gestion d’erreur globale** : tout renvoyé en 500 | error.middleware.js | **Oui** : utilisation de `err.statusCode` (ex. AppError) si présent, sinon 500. |
| **Guard abonnement chauffeur** : monté après les routes → jamais exécuté | app.js, driverSubscription.middleware.js | **Oui** : middleware appliqué dans les routers `drivers.routes` et `dispath.route` (après auth), et retiré du montage global après les routes dans app.js. |
| **Notification** : `emailService.send` inexistant → crash au runtime | notification.service.js, email.service.js | **Oui** : ajout de `send(to, subject, message)` dans email.service.js (délègue à sendAlert). |

---

## 3. Risques importants (P1) — à traiter

| Risque | Détail | Action suggérée |
|--------|--------|------------------|
| **Cycle de vie commande** | Incohérence CREATED vs transitions (ACCEPTED → PICKED_UP → …) | Vérifier orders.repository (statut initial) et order.engine.js (transitions) ; aligner avec la machine d’états attendue. |
| **Audit** | Champs payload (actorId / targetType) vs repository (userId / entityType) | Aligner audit.listener et audit.repository pour que les champs soient cohérents et les logs complets. |
| **Legacy / non monté** | auth.controller (réexport), JWT.js, payment.listener, fraud.listener, subcriptions/*, ticket.routes, etc. | Inventorier les fichiers morts ; soit les supprimer, soit les brancher et unifier les conventions. |
| **Dépendances non déclarées** | joi, ngeohash, node-cron, pdfkit, winston utilisés mais absents de package.json | Vérifier avec `rg "require\('joi'\)"` etc. ; ajouter au package.json à la racine du projet (wigenz). |

---

## 4. Résumé des corrections P0 appliquées

1. **Auth (register)** : dans `auth.service.js`, `AuthRepository.create` reçoit désormais `role: 'CLIENT'` fixe (plus de `data.role`).
2. **Error middleware** : dans `error.middleware.js`, `res.status(err.statusCode || 500)` et message adapté si `AppError`.
3. **Email** : dans `email.service.js`, méthode `send(to, subject, message)` ajoutée (appel à `sendAlert(to, subject, message)`).
4. **Driver subscription** : `driverSubscriptionMiddleware` est appliqué dans les routes chauffeur (`drivers.routes.js` et `dispath.route.js`) après auth ; retiré du montage global après toutes les routes dans `app.js`.

---

## 5. Priorités recommandées

- **Immédiat** : déjà fait — verrouillage register, error handler, email.send, wiring guard abonnement.
- **Court terme** : brancher users/drivers sur les vrais services ; aligner rôles (casse) ; états commande + audit.
- **Structurel** : nettoyer le legacy, déclarer toutes les dépendances, unifier naming et listeners.

---

## 6. Référence croisée

- **Architecture détaillée** : `ARCHITECTURE-BACKEND.md`.
- **Résumé métier** : `resume-global-wigenz.rtf` / `.doc`.
