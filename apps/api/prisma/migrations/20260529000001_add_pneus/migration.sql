-- CreateTable pneus e trocas_pneu
CREATE TABLE "pneus" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "codigo"           VARCHAR(20) NOT NULL,
  "caminhao_id"      UUID NOT NULL,
  "posicao"          VARCHAR(30) NOT NULL,
  "marca"            VARCHAR(100) NOT NULL,
  "modelo"           VARCHAR(100) NOT NULL,
  "numero_serie"     VARCHAR(100),
  "km_instalacao"    INTEGER NOT NULL DEFAULT 0,
  "km_vida_util"     INTEGER NOT NULL DEFAULT 80000,
  "data_instalacao"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "status"           VARCHAR(20) NOT NULL DEFAULT 'ativo',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pneus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pneus_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "pneus_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "pneus_caminhao_id_idx" ON "pneus"("caminhao_id");

CREATE TABLE "trocas_pneu" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "pneu_id"     UUID NOT NULL,
  "km_troca"    INTEGER NOT NULL,
  "motivo"      VARCHAR(500) NOT NULL,
  "custo"       DECIMAL(12,2),
  "observacoes" TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "trocas_pneu_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trocas_pneu_pneu_id_fkey" FOREIGN KEY ("pneu_id") REFERENCES "pneus"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trocas_pneu_pneu_id_idx" ON "trocas_pneu"("pneu_id");
