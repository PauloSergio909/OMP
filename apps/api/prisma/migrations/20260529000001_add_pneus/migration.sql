-- CreateTable pneus e trocas_pneu
CREATE TABLE "pneus" (
  "id"               TEXT NOT NULL,
  "codigo"           TEXT NOT NULL,
  "caminhao_id"      TEXT NOT NULL,
  "posicao"          TEXT NOT NULL,
  "marca"            TEXT NOT NULL,
  "modelo"           TEXT NOT NULL,
  "numero_serie"     TEXT,
  "km_instalacao"    INTEGER NOT NULL DEFAULT 0,
  "km_vida_util"     INTEGER NOT NULL DEFAULT 80000,
  "data_instalacao"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"           TEXT NOT NULL DEFAULT 'ativo',
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pneus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pneus_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "pneus_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "pneus_caminhao_id_idx" ON "pneus"("caminhao_id");

CREATE TABLE "trocas_pneu" (
  "id"          TEXT NOT NULL,
  "pneu_id"     TEXT NOT NULL,
  "km_troca"    INTEGER NOT NULL,
  "motivo"      TEXT NOT NULL,
  "custo"       DOUBLE PRECISION,
  "observacoes" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trocas_pneu_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trocas_pneu_pneu_id_fkey" FOREIGN KEY ("pneu_id") REFERENCES "pneus"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trocas_pneu_pneu_id_idx" ON "trocas_pneu"("pneu_id");
