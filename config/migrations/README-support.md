# Migrations Support (tickets, priorité, catégories, pièces jointes)

## 1. Installer les dépendances (dont multer)

À la **racine du projet** (dossier où se trouve `package.json`) :

```bash
npm install
```

## 2. Exécuter les migrations

### Option A : Script Node (recommandé)

À la **racine du projet** :

```bash
node wigenz-backen/scripts/run-support-migrations.js
```

Le script utilise la même connexion que l’app (`.env` ou valeurs par défaut : base `wigenz_db`, user `postgres`).

### Option B : Ligne de commande PostgreSQL

Si tu as `psql` installé, depuis la racine du projet :

```bash
set PGPASSWORD=postgres
psql -h localhost -p 5432 -U postgres -d wigenz_db -f wigenz-backen/config/migrations/20260306_support_priority_category.sql
psql -h localhost -p 5432 -U postgres -d wigenz_db -f wigenz-backen/config/migrations/20260306_support_attachments.sql
```

(Remplace `postgres` / `wigenz_db` par ton user et ta base si besoin.)

### Option C : pgAdmin (ou autre client graphique)

1. Ouvre pgAdmin et connecte-toi à ta base.
2. Ouvre le fichier `wigenz-backen/config/migrations/20260306_support_priority_category.sql`.
3. Exécute le script (bouton Play / F5).
4. Fais de même avec `20260306_support_attachments.sql`.

---

**Important :** La table `support_tickets` doit déjà exister (créée par la migration `20260306_support_tickets.sql`). Si ce n’est pas le cas, exécute d’abord ce fichier.
