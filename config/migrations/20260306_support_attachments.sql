-- Pièces jointes pour tickets support (ticket ou réponse)
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  reply_id    INTEGER REFERENCES support_ticket_replies (id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  uploaded_by INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_support_ticket_attachments_ticket_id ON support_ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS ix_support_ticket_attachments_reply_id ON support_ticket_attachments (reply_id);
