-- Histórico de transições de status das Ordens de Serviço
CREATE TABLE "historico_os" (
  "id"               TEXT         NOT NULL,
  "ordem_servico_id" TEXT         NOT NULL,
  "status_anterior"  TEXT,
  "status_novo"      TEXT         NOT NULL,
  "usuario_id"       TEXT         NOT NULL,
  "usuario_nome"     TEXT         NOT NULL,
  "observacao"       TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "historico_os_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "historico_os_ordem_servico_id_idx" ON "historico_os"("ordem_servico_id");

ALTER TABLE "historico_os"
  ADD CONSTRAINT "historico_os_ordem_servico_id_fkey"
  FOREIGN KEY ("ordem_servico_id")
  REFERENCES "ordens_servico"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
