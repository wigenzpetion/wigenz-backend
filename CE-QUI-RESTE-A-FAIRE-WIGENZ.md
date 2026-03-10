# Ce qui reste à faire pour que Wigenz soit complet

Document de synthèse : **reste à faire** côté backend et cohérence globale, pour considérer Wigenz comme complet (hors évolution B2B).

---

## 1. Priorité haute (fonctionnel / sécurité)

### 1.1 Contrôleurs users et drivers (stubs)

- **État** : `client.controller.js` et `driver.controller.js` renvoient des réponses factices (tableaux vides, "Not implemented", messages fixes).
- **À faire** : Brancher ces contrôleurs sur les vrais services et repositories :
  - **Users** : utiliser `client.service.js` et `client.repository.js` pour GET/PUT profile, liste utilisateurs (admin), suspendre, supprimer, changer rôle.
  - **Drivers** : utiliser `driver.service.js` et `driver.repository.js` pour profil chauffeur, liste (admin), approbation, suspension, mise à jour profil.
- **Raison** : Sans ça, les routes `/users` et `/api/drivers` ne sont pas exploitables en production.

### 1.2 Alignement des rôles (casse)

- **État** : Les routes `client.routes.js` et `drivers.routes.js` utilisent `role(['admin'])`, `role(['driver'])` en **minuscules**, alors que le JWT et le reste du backend (admin.middleware, etc.) utilisent **ADMIN**, **DRIVER**, **CLIENT** en majuscules.
- **À faire** : Utiliser partout les mêmes valeurs (recommandé : **majuscules** côté backend) dans `roleMiddleware` et dans les tokens, pour éviter des 403 inattendus.
- **Raison** : Cohérence et fiabilité de l’autorisation sur toutes les routes.

---

## 2. Priorité moyenne (cohérence métier et traçabilité)

### 2.1 Cycle de vie des commandes

- **État** : Possible incohérence entre le statut initial de la commande (ex. CREATED ou autre) et les transitions attendues (ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERY_PENDING_VERIFICATION → DELIVERED).
- **À faire** : Vérifier dans `orders.repository.js` le statut créé à l’insertion ; vérifier dans `order.engine.js` (et éventuellement `clients/order.engine.js`) que toutes les transitions sont définies et que le premier état après création (ex. SEARCHING_DRIVER / ACCEPTED) est aligné avec le dispatch et les écrans.
- **Raison** : Éviter des commandes bloquées ou des statuts incohérents dans l’app et les notifications.

### 2.2 Audit (payloads et champs)

- **État** : Les listeners audit utilisent des noms de champs (ex. actorId, targetType) qui peuvent ne pas correspondre exactement à ce qu’attend `audit.repository.js` (ex. userId, entityType).
- **À faire** : Aligner `audit.listener.js` et `audit.repository.js` sur les mêmes noms de champs pour que toutes les actions (dont support, wallet, payout, etc.) soient bien enregistrées et exploitables (export, logs).
- **Raison** : Traçabilité complète et fiable pour la conformité et le support.

### 2.3 Dépendances non déclarées

- **État** : Des modules sont utilisés dans le code (ex. joi, ngeohash, node-cron, pdfkit, winston) mais peuvent être absents du `package.json` à la racine du projet.
- **À faire** : Vérifier avec une recherche (ex. `rg "require\('joi'\)"` et équivalents) et ajouter toutes les dépendances réellement utilisées dans le `package.json` du projet (racine wigenz).
- **Raison** : Installations et déploiements reproductibles (npm install suffisant), pas de crash en prod à cause d’un module manquant.

---

## 3. Priorité structurelle (nettoyage et maintenabilité)

### 3.1 Fichiers legacy / non montés / doublons

- **État** : Plusieurs fichiers sont partiels, non montés ou en doublon : ex. `JWT.js`, `ticket.routes.js`, `src/controllers/ticket.controller.js` vs module support, `auth.controller.js` (réexport), `src/notifications/email.service.js` vs `src/routes/notification/email.service.js`, listeners payment/fraud/subcriptions à clarifier.
- **À faire** : Inventorier les fichiers morts (jamais require’d ou montés) ; soit les supprimer, soit les brancher correctement ; unifier (ex. un seul email.service, un seul flux tickets via support).
- **Raison** : Réduire la confusion, éviter les mauvaises modifications et simplifier l’onboarding.

### 3.2 Typos et noms de fichiers

- **État** : Noms incohérents : `dispath.route.js`, `dipatch.fallback.js`, `subscription.engine.js.js`, `rbac.midlleware.js`, `rôle.service.js` (accent).
- **À faire** : Renommer (ex. dispath → dispatch, midlleware → middleware) et mettre à jour tous les `require()` qui pointent vers ces fichiers.
- **Raison** : Professionnalisme et évitement d’erreurs à l’import.

### 3.3 Dashboard repository (chemin config)

- **État** : `Admin/subcription-dashboard/dashboard.repository.js` utilise `require('../../../config/db')` ; à vérifier selon l’emplacement réel du fichier.
- **À faire** : Vérifier que le chemin résout bien vers `src/config/db.js` (ou `src/db.js`) ; corriger si besoin.
- **Raison** : Éviter des erreurs au chargement du module admin.

---

## 4. Hors périmètre actuel (annoncé pour plus tard)

### 4.1 Version ENTREPRISE (B2B)

- **État** : Annoncée comme prévue pour le futur dans le résumé global Wigenz.
- **À faire** : Lors d’une phase dédiée : comptes entreprise, règles métier B2B, éventuellement facturation / contrats.
- **Raison** : Ne pas surcharger le périmètre actuel B2C (client, chauffeur, plateforme).

---

## 5. Récapitulatif par ordre recommandé

| Ordre | Tâche | Impact |
|-------|--------|--------|
| 1 | Brancher users/drivers sur les vrais services (enlever les stubs) | Fonctionnel |
| 2 | Aligner rôles (majuscules partout côté backend) | Sécurité / cohérence |
| 3 | Vérifier cycle de vie commandes (statut initial + transitions) | Métier |
| 4 | Aligner audit (payloads / champs listener vs repository) | Traçabilité |
| 5 | Déclarer toutes les dépendances dans package.json | Déploiement |
| 6 | Nettoyer legacy (fichiers morts, doublons) | Maintenabilité |
| 7 | Corriger typos et noms de fichiers | Maintenabilité |

---

## 6. Références

- **Détail des risques et corrections** : `DIAGNOSTIC-ARCHITECTURE-CODEX.md`
- **Ce qui a été implémenté** : `RAPPORT-IMPLEMENTATION-SESSION.md`
- **Architecture backend** : `ARCHITECTURE-BACKEND.md`
- **Résumé métier** : `resume-global-wigenz.rtf`

---

*Document généré pour lister ce qui reste à faire pour que Wigenz soit considéré comme complet (backend, cohérence, maintenabilité), hors évolution B2B.*
