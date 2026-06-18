-- Eventos manuais da agenda (criados pelo usuário)
CREATE TABLE "agenda_eventos" (
  "id"          TEXT         NOT NULL,
  "titulo"      TEXT         NOT NULL,
  "descricao"   TEXT,
  "data"        TIMESTAMP(3) NOT NULL,
  "tipo"        TEXT         NOT NULL DEFAULT 'lembrete',
  "cor"         TEXT         NOT NULL DEFAULT 'blue',
  "link"        TEXT,
  "usuario_id"  TEXT         NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agenda_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agenda_eventos_data_idx"       ON "agenda_eventos"("data");
CREATE INDEX "agenda_eventos_usuario_id_idx" ON "agenda_eventos"("usuario_id");
