-- Support: tickets et réponses (flux dédié service client)
-- Tables: support_tickets, support_ticket_replies

-- Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL,
  order_id       INTEGER,
  subject        VARCHAR(500) NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  author_role    VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
  assigned_to    INTEGER,
  resolved_at    TIMESTAMPTZ,
  resolved_by    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS ix_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS ix_support_tickets_order_id ON support_tickets (order_id);

-- Réponses par ticket
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL,
  author_type VARCHAR(50) NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_support_ticket_replies_ticket_id ON support_ticket_replies (ticket_id);
