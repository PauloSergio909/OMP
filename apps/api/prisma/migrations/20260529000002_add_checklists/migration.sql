-- CreateTable checklists_vistoria e itens_checklist
CREATE TABLE "checklists_vistoria" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "caminhao_id"  UUID NOT NULL,
  "motorista_id" UUID NOT NULL,
  "km_atual"     INTEGER NOT NULL,
  "tipo"         VARCHAR(20) NOT NULL DEFAULT 'pre_viagem',
  "aprovado"     BOOLEAN NOT NULL DEFAULT false,
  "observacoes"  TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "checklists_vistoria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklists_vistoria_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "checklists_vistoria_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "checklists_vistoria_caminhao_id_idx" ON "checklists_vistoria"("caminhao_id");
CREATE INDEX "checklists_vistoria_motorista_id_idx" ON "checklists_vistoria"("motorista_id");
CREATE INDEX "checklists_vistoria_created_at_idx" ON "checklists_vistoria"("created_at");

CREATE TABLE "itens_checklist" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "checklist_id" UUID NOT NULL,
  "item"         VARCHAR(200) NOT NULL,
  "ok"           BOOLEAN NOT NULL DEFAULT true,
  "observacoes"  TEXT,
  CONSTRAINT "itens_checklist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "itens_checklist_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists_vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "itens_checklist_checklist_id_idx" ON "itens_checklist"("checklist_id");
