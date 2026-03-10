-- Priorité et catégorie pour les tickets support
-- priority: LOW, MEDIUM, HIGH
-- category: LIVRAISON, PAIEMENT, LITIGE, AUTRE

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'AUTRE';

CREATE INDEX IF NOT EXISTS ix_support_tickets_priority ON support_tickets (priority);
CREATE INDEX IF NOT EXISTS ix_support_tickets_category ON support_tickets (category);
