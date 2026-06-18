-- AlterTable: campos de recebimento na ordem de compra
ALTER TABLE "ordens_compra" ADD COLUMN "data_recebimento" TIMESTAMP(3),
                             ADD COLUMN "observacoes"      TEXT;

-- CreateIndex: movimentacoes por ordem de serviço
CREATE INDEX "movimentacoes_ordem_servico_id_idx" ON "movimentacoes"("ordem_servico_id");

-- CreateIndex: caminhoes por motorista
CREATE INDEX "caminhoes_motorista_id_idx" ON "caminhoes"("motorista_id");

-- CreateTable: configuração da empresa (singleton)
CREATE TABLE "configuracao_empresa" (
  "id"           TEXT NOT NULL,
  "razao_social" TEXT NOT NULL,
  "cnpj"         TEXT,
  "telefone"     TEXT,
  "email"        TEXT,
  "endereco"     TEXT,
  "logo_url"     TEXT,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "configuracao_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable: log de auditoria
CREATE TABLE "logs_auditoria" (
  "id"           TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "user_nome"    TEXT NOT NULL,
  "acao"         TEXT NOT NULL,
  "entidade"     TEXT NOT NULL,
  "entidade_id"  TEXT,
  "detalhes"     JSONB,
  "ip"           TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "logs_auditoria_user_id_idx"   ON "logs_auditoria"("user_id");
CREATE INDEX "logs_auditoria_entidade_idx"  ON "logs_auditoria"("entidade");
CREATE INDEX "logs_auditoria_created_at_idx" ON "logs_auditoria"("created_at");
