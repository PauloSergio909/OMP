-- CreateTable: funcionarios
CREATE TABLE "funcionarios" (
  "id"            TEXT NOT NULL,
  "nome"          TEXT NOT NULL,
  "cpf"           TEXT NOT NULL,
  "cargo"         TEXT NOT NULL,
  "cnh_categoria" TEXT,
  "cnh_validade"  TIMESTAMP(3),
  "telefone"      TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "ativo"         BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "funcionarios_cpf_key" UNIQUE ("cpf")
);

-- CreateTable: users
CREATE TABLE "users" (
  "id"             TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "senha_hash"     TEXT NOT NULL,
  "nome"           TEXT NOT NULL,
  "role"           TEXT NOT NULL DEFAULT 'visualizador',
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "funcionario_id" TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email"),
  CONSTRAINT "users_funcionario_id_key" UNIQUE ("funcionario_id"),
  CONSTRAINT "users_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: categorias
CREATE TABLE "categorias" (
  "id"        TEXT NOT NULL,
  "nome"      TEXT NOT NULL,
  "descricao" TEXT,
  CONSTRAINT "categorias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categorias_nome_key" UNIQUE ("nome")
);

-- CreateTable: fornecedores
CREATE TABLE "fornecedores" (
  "id"           TEXT NOT NULL,
  "razao_social" TEXT NOT NULL,
  "cnpj"         TEXT NOT NULL,
  "telefone"     TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "endereco"     TEXT,
  "avaliacao"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ativo"        BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fornecedores_cnpj_key" UNIQUE ("cnpj")
);

-- CreateTable: materiais
CREATE TABLE "materiais" (
  "id"             TEXT NOT NULL,
  "codigo"         TEXT NOT NULL,
  "nome"           TEXT NOT NULL,
  "categoria_id"   TEXT NOT NULL,
  "unidade_medida" TEXT NOT NULL,
  "preco_unitario" DOUBLE PRECISION NOT NULL,
  "estoque_minimo" INTEGER NOT NULL,
  "estoque_maximo" INTEGER NOT NULL,
  "fornecedor_id"  TEXT NOT NULL,
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "materiais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "materiais_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "materiais_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "materiais_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "materiais_nome_idx" ON "materiais"("nome");
CREATE INDEX "materiais_categoria_id_idx" ON "materiais"("categoria_id");

-- CreateTable: estoques
CREATE TABLE "estoques" (
  "id"                 TEXT NOT NULL,
  "material_id"        TEXT NOT NULL,
  "quantidade"         INTEGER NOT NULL DEFAULT 0,
  "localizacao"        TEXT,
  "ultima_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estoques_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "estoques_material_id_key" UNIQUE ("material_id"),
  CONSTRAINT "estoques_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: caminhoes (sem vencimento_crlv, vencimento_seguro, numero_seguro, proxima_manutencao_km — adicionados por migrations posteriores)
CREATE TABLE "caminhoes" (
  "id"                 TEXT NOT NULL,
  "codigo"             TEXT NOT NULL,
  "placa"              TEXT NOT NULL,
  "chassi"             TEXT NOT NULL,
  "modelo"             TEXT NOT NULL,
  "fabricante"         TEXT NOT NULL,
  "ano_fabricacao"     INTEGER NOT NULL,
  "km_atual"           INTEGER NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'operacional',
  "motorista_id"       TEXT,
  "proxima_manutencao" TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "caminhoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caminhoes_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "caminhoes_placa_key" UNIQUE ("placa"),
  CONSTRAINT "caminhoes_chassi_key" UNIQUE ("chassi"),
  CONSTRAINT "caminhoes_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "caminhoes_status_idx" ON "caminhoes"("status");

-- CreateTable: ordens_servico
CREATE TABLE "ordens_servico" (
  "id"             TEXT NOT NULL,
  "codigo"         TEXT NOT NULL,
  "caminhao_id"    TEXT NOT NULL,
  "tipo"           TEXT NOT NULL,
  "descricao"      TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'agendada',
  "prioridade"     TEXT NOT NULL DEFAULT 'media',
  "responsavel_id" TEXT NOT NULL,
  "data_abertura"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_previsao"  TIMESTAMP(3) NOT NULL,
  "data_conclusao" TIMESTAMP(3),
  "custo_total"    DOUBLE PRECISION,
  "observacoes"    TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ordens_servico_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "ordens_servico_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ordens_servico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");
CREATE INDEX "ordens_servico_caminhao_id_idx" ON "ordens_servico"("caminhao_id");
CREATE INDEX "ordens_servico_responsavel_id_idx" ON "ordens_servico"("responsavel_id");
CREATE INDEX "ordens_servico_data_abertura_idx" ON "ordens_servico"("data_abertura");

-- CreateTable: itens_os
CREATE TABLE "itens_os" (
  "id"               TEXT NOT NULL,
  "ordem_servico_id" TEXT NOT NULL,
  "material_id"      TEXT,
  "quantidade"       INTEGER NOT NULL,
  "preco_unitario"   DOUBLE PRECISION NOT NULL,
  "tipo"             TEXT NOT NULL,
  "descricao"        TEXT,
  CONSTRAINT "itens_os_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "itens_os_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "itens_os_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "itens_os_ordem_servico_id_idx" ON "itens_os"("ordem_servico_id");
CREATE INDEX "itens_os_material_id_idx" ON "itens_os"("material_id");

-- CreateTable: abastecimentos
CREATE TABLE "abastecimentos" (
  "id"           TEXT NOT NULL,
  "caminhao_id"  TEXT NOT NULL,
  "motorista_id" TEXT NOT NULL,
  "litros"       DOUBLE PRECISION NOT NULL,
  "preco_litro"  DOUBLE PRECISION NOT NULL,
  "km_atual"     INTEGER NOT NULL,
  "combustivel"  TEXT NOT NULL,
  "posto"        TEXT NOT NULL,
  "data"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "abastecimentos_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "abastecimentos_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "abastecimentos_caminhao_id_data_idx" ON "abastecimentos"("caminhao_id", "data");
CREATE INDEX "abastecimentos_motorista_id_idx" ON "abastecimentos"("motorista_id");

-- CreateTable: ordens_compra (sem data_recebimento e observacoes — adicionados pela migration 20260507000000)
CREATE TABLE "ordens_compra" (
  "id"            TEXT NOT NULL,
  "codigo"        TEXT NOT NULL,
  "fornecedor_id" TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'pendente',
  "valor_total"   DOUBLE PRECISION NOT NULL,
  "data_pedido"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_entrega"  TIMESTAMP(3),
  CONSTRAINT "ordens_compra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ordens_compra_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "ordens_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ordens_compra_status_idx" ON "ordens_compra"("status");
CREATE INDEX "ordens_compra_fornecedor_id_idx" ON "ordens_compra"("fornecedor_id");

-- CreateTable: itens_compra
CREATE TABLE "itens_compra" (
  "id"              TEXT NOT NULL,
  "ordem_compra_id" TEXT NOT NULL,
  "material_id"     TEXT NOT NULL,
  "quantidade"      INTEGER NOT NULL,
  "preco_unitario"  DOUBLE PRECISION NOT NULL,
  CONSTRAINT "itens_compra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "itens_compra_ordem_compra_id_fkey" FOREIGN KEY ("ordem_compra_id") REFERENCES "ordens_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "itens_compra_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "itens_compra_ordem_compra_id_idx" ON "itens_compra"("ordem_compra_id");
CREATE INDEX "itens_compra_material_id_idx" ON "itens_compra"("material_id");

-- CreateTable: movimentacoes
-- Nota: movimentacoes_ordem_servico_id_idx e caminhoes_motorista_id_idx são criados pela migration 20260507000000
CREATE TABLE "movimentacoes" (
  "id"               TEXT NOT NULL,
  "material_id"      TEXT NOT NULL,
  "tipo"             TEXT NOT NULL,
  "quantidade"       INTEGER NOT NULL,
  "preco_unitario"   DOUBLE PRECISION NOT NULL,
  "motivo"           TEXT NOT NULL,
  "ordem_servico_id" TEXT,
  "usuario_id"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movimentacoes_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "movimentacoes_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "movimentacoes_material_id_idx" ON "movimentacoes"("material_id");
CREATE INDEX "movimentacoes_created_at_idx" ON "movimentacoes"("created_at");

-- CreateTable: equipamentos
CREATE TABLE "equipamentos" (
  "id"              TEXT NOT NULL,
  "codigo"          TEXT NOT NULL,
  "nome"            TEXT NOT NULL,
  "tipo"            TEXT NOT NULL,
  "descricao"       TEXT,
  "numero_serie"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'disponivel',
  "responsavel_id"  TEXT,
  "localizacao"     TEXT,
  "data_aquisicao"  TIMESTAMP(3),
  "valor_aquisicao" DOUBLE PRECISION,
  "fabricante"      TEXT,
  "modelo"          TEXT,
  "proxima_revisao" TIMESTAMP(3),
  "observacoes"     TEXT,
  "ativo"           BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipamentos_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "equipamentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "equipamentos_status_idx" ON "equipamentos"("status");
CREATE INDEX "equipamentos_tipo_idx" ON "equipamentos"("tipo");
CREATE INDEX "equipamentos_responsavel_id_idx" ON "equipamentos"("responsavel_id");

-- CreateTable: movimentacoes_equipamento
CREATE TABLE "movimentacoes_equipamento" (
  "id"             TEXT NOT NULL,
  "equipamento_id" TEXT NOT NULL,
  "tipo"           TEXT NOT NULL,
  "responsavel_id" TEXT NOT NULL,
  "destino"        TEXT,
  "observacoes"    TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimentacoes_equipamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movimentacoes_equipamento_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "movimentacoes_equipamento_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "movimentacoes_equipamento_equipamento_id_idx" ON "movimentacoes_equipamento"("equipamento_id");
CREATE INDEX "movimentacoes_equipamento_responsavel_id_idx" ON "movimentacoes_equipamento"("responsavel_id");

-- CreateTable: km_registros
CREATE TABLE "km_registros" (
  "id"          TEXT NOT NULL,
  "caminhao_id" TEXT NOT NULL,
  "km"          INTEGER NOT NULL,
  "data"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "km_registros_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "km_registros_caminhao_id_fkey" FOREIGN KEY ("caminhao_id") REFERENCES "caminhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "km_registros_caminhao_id_data_idx" ON "km_registros"("caminhao_id", "data");
