

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ─── USUÁRIO ADMIN ─────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleetmaster.com.br' },
    update: {},
    create: {
      email: 'admin@fleetmaster.com.br',
      nome: 'Administrador',
      senhaHash: adminHash,
      role: 'admin',
    },
  });
  console.log(`✅ Admin criado: ${admin.email} (senha: admin123)`);

  // ─── CATEGORIAS ────────────────────────────────────────────
  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { nome: 'Óleos e Lubrificantes' }, update: {}, create: { nome: 'Óleos e Lubrificantes', descricao: 'Óleos de motor, câmbio, diferencial, fluidos' } }),
    prisma.categoria.upsert({ where: { nome: 'Filtros' }, update: {}, create: { nome: 'Filtros', descricao: 'Filtros de ar, óleo, combustível, cabine' } }),
    prisma.categoria.upsert({ where: { nome: 'Pneus' }, update: {}, create: { nome: 'Pneus', descricao: 'Pneus novos e recapados' } }),
    prisma.categoria.upsert({ where: { nome: 'Freios' }, update: {}, create: { nome: 'Freios', descricao: 'Pastilhas, lonas, discos, tambores' } }),
    prisma.categoria.upsert({ where: { nome: 'Elétrica' }, update: {}, create: { nome: 'Elétrica', descricao: 'Baterias, alternadores, motores de partida' } }),
    prisma.categoria.upsert({ where: { nome: 'Outros' }, update: {}, create: { nome: 'Outros', descricao: 'Correias, mangueiras, parafusos, etc.' } }),
  ]);
  console.log(`✅ ${categorias.length} categorias criadas`);

  // ─── FORNECEDORES ──────────────────────────────────────────
  const fornecedores = await Promise.all([
    prisma.fornecedor.create({ data: { razaoSocial: 'Petronas Lubrificantes', cnpj: '00.000.000/0001-01', telefone: '(11) 3000-0001', email: 'vendas@petronas.com', avaliacao: 4.5 } }),
    prisma.fornecedor.create({ data: { razaoSocial: 'Mann Filter Brasil', cnpj: '00.000.000/0002-02', telefone: '(11) 3000-0002', email: 'vendas@mannfilter.com', avaliacao: 4.8 } }),
    prisma.fornecedor.create({ data: { razaoSocial: 'Bridgestone do Brasil', cnpj: '00.000.000/0003-03', telefone: '(11) 3000-0003', email: 'vendas@bridgestone.com', avaliacao: 4.2 } }),
    prisma.fornecedor.create({ data: { razaoSocial: 'Frasle S.A.', cnpj: '00.000.000/0004-04', telefone: '(54) 3000-0004', email: 'vendas@frasle.com', avaliacao: 4.6 } }),
  ]);
  console.log(`✅ ${fornecedores.length} fornecedores criados`);

  // ─── FUNCIONÁRIOS ──────────────────────────────────────────
  // IMPORTANTE: cargo sempre em minúsculas para compatibilidade com filtros da API
  const funcionarios = await Promise.all([
    prisma.funcionario.create({ data: { nome: 'Carlos Silva', cpf: '111.111.111-01', cargo: 'motorista', cnhCategoria: 'E', cnhValidade: new Date('2027-06-15'), telefone: '(11) 99999-0001', email: 'carlos@fleet.com' } }),
    prisma.funcionario.create({ data: { nome: 'João Santos', cpf: '222.222.222-02', cargo: 'motorista', cnhCategoria: 'E', cnhValidade: new Date('2026-11-20'), telefone: '(11) 99999-0002', email: 'joao@fleet.com' } }),
    prisma.funcionario.create({ data: { nome: 'Pedro Mecânico', cpf: '333.333.333-03', cargo: 'mecanico', telefone: '(11) 99999-0003', email: 'pedro@fleet.com' } }),
    prisma.funcionario.create({ data: { nome: 'Ana Almoxarife', cpf: '444.444.444-04', cargo: 'almoxarife', telefone: '(11) 99999-0004', email: 'ana@fleet.com' } }),
    prisma.funcionario.create({ data: { nome: 'Ricardo Gerente', cpf: '555.555.555-05', cargo: 'gerente', telefone: '(11) 99999-0005', email: 'ricardo@fleet.com' } }),
  ]);
  console.log(`✅ ${funcionarios.length} funcionários criados`);

  // ─── MATERIAIS + ESTOQUE ───────────────────────────────────
  const materiaisData = [
    { codigo: 'MAT-001', nome: 'Óleo Motor 15W-40 (Litro)', catIdx: 0, fornIdx: 0, unidade: 'litro', preco: 18.5, min: 200, max: 800, qtd: 280 },
    { codigo: 'MAT-002', nome: 'Filtro de Ar P/N 6841', catIdx: 1, fornIdx: 1, unidade: 'unidade', preco: 89.9, min: 30, max: 100, qtd: 45 },
    { codigo: 'MAT-003', nome: 'Pneu 295/80 R22.5', catIdx: 2, fornIdx: 2, unidade: 'unidade', preco: 1850.0, min: 12, max: 40, qtd: 8 },
    { codigo: 'MAT-004', nome: 'Pastilha de Freio Dianteira (Jogo)', catIdx: 3, fornIdx: 3, unidade: 'jogo', preco: 320.0, min: 10, max: 50, qtd: 18 },
    { codigo: 'MAT-005', nome: 'Óleo Câmbio 75W-90 (Litro)', catIdx: 0, fornIdx: 0, unidade: 'litro', preco: 42.0, min: 80, max: 300, qtd: 60 },
    { codigo: 'MAT-006', nome: 'Filtro de Combustível', catIdx: 1, fornIdx: 1, unidade: 'unidade', preco: 65.0, min: 25, max: 80, qtd: 52 },
    { codigo: 'MAT-007', nome: 'Correia do Alternador', catIdx: 5, fornIdx: 3, unidade: 'unidade', preco: 125.0, min: 8, max: 20, qtd: 5 },
    { codigo: 'MAT-008', nome: 'Fluido de Arrefecimento (Litro)', catIdx: 0, fornIdx: 0, unidade: 'litro', preco: 12.5, min: 100, max: 400, qtd: 150 },
  ];

  const materiais: any[] = [];
  for (const m of materiaisData) {
    const material = await prisma.material.create({
      data: {
        codigo: m.codigo,
        nome: m.nome,
        categoriaId: categorias[m.catIdx].id,
        fornecedorId: fornecedores[m.fornIdx].id,
        unidadeMedida: m.unidade,
        precoUnitario: m.preco,
        estoqueMinimo: m.min,
        estoqueMaximo: m.max,
      },
    });
    await prisma.estoque.create({ data: { materialId: material.id, quantidade: m.qtd } });
    materiais.push(material);
  }
  console.log(`✅ ${materiaisData.length} materiais com estoque criados`);

  // ─── CAMINHÕES ─────────────────────────────────────────────
  const caminhoesData = [
    { codigo: 'CAM-001', placa: 'ABC1D23', chassi: '9BWZZZ377VT004251', modelo: 'Volvo FH 540', fabricante: 'Volvo', ano: 2022, km: 185420, status: 'operacional', motIdx: 0 },
    { codigo: 'CAM-002', placa: 'DEF4E56', chassi: '9BWZZZ377VT004252', modelo: 'Scania R450', fabricante: 'Scania', ano: 2021, km: 220180, status: 'manutencao', motIdx: 1 },
    { codigo: 'CAM-003', placa: 'GHI7F89', chassi: '9BWZZZ377VT004253', modelo: 'Mercedes Actros', fabricante: 'Mercedes-Benz', ano: 2023, km: 95600, status: 'operacional', motIdx: null },
  ];

  const caminhoes: any[] = [];
  for (const c of caminhoesData) {
    const caminhao = await prisma.caminhao.create({
      data: {
        codigo: c.codigo,
        placa: c.placa,
        chassi: c.chassi,
        modelo: c.modelo,
        fabricante: c.fabricante,
        anoFabricacao: c.ano,
        kmAtual: c.km,
        status: c.status,
        motoristaId: c.motIdx !== null ? funcionarios[c.motIdx].id : null,
        proximaManutencao: new Date('2026-05-15'),
      },
    });
    caminhoes.push(caminhao);
  }
  console.log(`✅ ${caminhoes.length} caminhões criados`);

  // ─── ORDENS DE SERVIÇO ─────────────────────────────────────
  const osData = [
    {
      codigo: 'OS-2026-001',
      caminhaoIdx: 0,
      tipo: 'preventiva',
      descricao: 'Troca de óleo motor 15W-40 e filtros (ar, óleo, combustível). Verificação geral do sistema de freios.',
      status: 'concluida',
      prioridade: 'media',
      dataPrevisao: new Date('2026-03-20'),
      dataConclusao: new Date('2026-03-20'),
      custoTotal: 850.0,
      observacoes: 'Executado conforme programação. Óleo trocado, filtros substituídos.',
    },
    {
      codigo: 'OS-2026-002',
      caminhaoIdx: 1,
      tipo: 'corretiva',
      descricao: 'Substituição de pastilhas de freio dianteiras e traseiras. Ruído identificado pelo motorista.',
      status: 'em_andamento',
      prioridade: 'alta',
      dataPrevisao: new Date('2026-04-30'),
      dataConclusao: null,
      custoTotal: null,
      observacoes: 'Aguardando chegada do jogo de pastilhas traseiras.',
    },
    {
      codigo: 'OS-2026-003',
      caminhaoIdx: 2,
      tipo: 'preventiva',
      descricao: 'Revisão de 90.000 km: troca de óleo, filtros, correias e verificação completa.',
      status: 'agendada',
      prioridade: 'media',
      dataPrevisao: new Date('2026-05-10'),
      dataConclusao: null,
      custoTotal: null,
      observacoes: null,
    },
    {
      codigo: 'OS-2026-004',
      caminhaoIdx: 0,
      tipo: 'corretiva',
      descricao: 'Substituição de correia do alternador. Tensão abaixo do especificado.',
      status: 'aguardando_peca',
      prioridade: 'critica',
      dataPrevisao: new Date('2026-04-28'),
      dataConclusao: null,
      custoTotal: null,
      observacoes: 'Peça solicitada ao almoxarifado.',
    },
  ];

  const ordensServico: { id: string; codigo: string; status: string }[] = [];
  for (const os of osData) {
    const criada = await prisma.ordemServico.create({
      data: {
        codigo: os.codigo,
        caminhaoId: caminhoes[os.caminhaoIdx].id,
        tipo: os.tipo,
        descricao: os.descricao,
        status: os.status,
        prioridade: os.prioridade,
        responsavelId: funcionarios[2].id, // Pedro Mecânico
        dataPrevisao: os.dataPrevisao,
        dataConclusao: os.dataConclusao ?? undefined,
        custoTotal: os.custoTotal ?? undefined,
        observacoes: os.observacoes ?? undefined,
      },
    });
    ordensServico.push({ id: criada.id, codigo: criada.codigo, status: criada.status });
  }
  console.log(`✅ ${osData.length} ordens de serviço criadas`);

  // ─── HISTÓRICO DE OS ───────────────────────────────────────
  // Simula as transições de status para cada OS, partindo sempre de 'agendada'
  const transicoesExemplo: Record<string, { statusAnterior: string | null; statusNovo: string; obs?: string }[]> = {
    'OS-2026-001': [
      { statusAnterior: null, statusNovo: 'agendada', obs: 'OS criada' },
      { statusAnterior: 'agendada', statusNovo: 'em_andamento', obs: 'Início dos serviços de troca de óleo' },
      { statusAnterior: 'em_andamento', statusNovo: 'concluida', obs: 'Troca de óleo e filtros realizada com sucesso' },
    ],
    'OS-2026-002': [
      { statusAnterior: null, statusNovo: 'agendada', obs: 'OS criada' },
      { statusAnterior: 'agendada', statusNovo: 'em_andamento', obs: 'Regulagem iniciada' },
    ],
    'OS-2026-003': [
      { statusAnterior: null, statusNovo: 'agendada', obs: 'OS criada' },
    ],
    'OS-2026-004': [
      { statusAnterior: null, statusNovo: 'agendada', obs: 'OS criada' },
      { statusAnterior: 'agendada', statusNovo: 'em_andamento', obs: 'Inspeção realizada — correia danificada identificada' },
      { statusAnterior: 'em_andamento', statusNovo: 'aguardando_peca', obs: 'Correia do alternador solicitada ao almoxarifado' },
    ],
  };

  let totalHistorico = 0;
  for (const os of ordensServico) {
    const transicoes = transicoesExemplo[os.codigo] ?? [{ statusAnterior: null, statusNovo: os.status, obs: 'OS criada' }];
    for (const t of transicoes) {
      await prisma.historicoOS.create({
        data: {
          ordemServicoId: os.id,
          statusAnterior: t.statusAnterior,
          statusNovo: t.statusNovo,
          usuarioId: admin.id,
          usuarioNome: 'Administrador',
          observacao: t.obs ?? null,
        },
      });
      totalHistorico++;
    }
  }
  console.log(`✅ ${totalHistorico} entradas de histórico de OS criadas`);

  // ─── ABASTECIMENTOS ────────────────────────────────────────
  const abastecimentosData = [
    { caminhaoIdx: 0, motoristaIdx: 0, litros: 182.5, precoLitro: 6.89, km: 185420, combustivel: 'diesel_s10', posto: 'Posto OMP — Matriz' },
    { caminhaoIdx: 0, motoristaIdx: 0, litros: 195.0, precoLitro: 6.85, km: 184800, combustivel: 'diesel_s10', posto: 'BR Distribuidora — Rod. Anhanguera km 45' },
    { caminhaoIdx: 1, motoristaIdx: 1, litros: 210.0, precoLitro: 6.92, km: 220180, combustivel: 'diesel', posto: 'Posto OMP — Matriz' },
    { caminhaoIdx: 1, motoristaIdx: 1, litros: 175.5, precoLitro: 6.88, km: 219600, combustivel: 'diesel', posto: 'Ipiranga — Rod. Castelo Branco km 78' },
    { caminhaoIdx: 2, motoristaIdx: 0, litros: 120.0, precoLitro: 6.89, km: 95600, combustivel: 'diesel_s10', posto: 'Posto OMP — Matriz' },
  ];

  for (const ab of abastecimentosData) {
    await prisma.abastecimento.create({
      data: {
        caminhaoId: caminhoes[ab.caminhaoIdx].id,
        motoristaId: funcionarios[ab.motoristaIdx].id,
        litros: ab.litros,
        precoLitro: ab.precoLitro,
        kmAtual: ab.km,
        combustivel: ab.combustivel,
        posto: ab.posto,
      },
    });
  }
  console.log(`✅ ${abastecimentosData.length} abastecimentos criados`);

  // ─── EQUIPAMENTOS ──────────────────────────────────────────
  const equipamentosData = [
    { codigo: 'EQP-001', nome: 'Guindaste Hidráulico 10T', tipo: 'equipamento', fabricante: 'Manitowoc', modelo: 'Grove RT890E', status: 'disponivel', valor: 380000.0, localizacao: 'Pátio A — Galpão 1', numeroSerie: 'GH-10T-2023-001' },
    { codigo: 'EQP-002', nome: 'Compressor de Ar Industrial 200L', tipo: 'equipamento', fabricante: 'Schulz', modelo: 'MSV 20/200', status: 'em_uso', valor: 8500.0, localizacao: 'Oficina Mecânica', numeroSerie: 'CAI-200-2022-002', respIdx: 2 },
    { codigo: 'EQP-003', nome: 'Elevador Hidráulico 4T', tipo: 'equipamento', fabricante: 'Bovenau', modelo: 'Premium 4T', status: 'disponivel', valor: 15000.0, localizacao: 'Oficina Mecânica', numeroSerie: 'EH-4T-2021-003' },
    { codigo: 'FER-001', nome: 'Jogo de Chaves Combinadas 26 peças', tipo: 'ferramenta', fabricante: 'Gedore', modelo: 'Kombiring', status: 'disponivel', valor: 1200.0, localizacao: 'Almoxarifado — Prateleira B2', numeroSerie: null },
    { codigo: 'FER-002', nome: 'Torquímetro Digital 20–200 N·m', tipo: 'ferramenta', fabricante: 'Tramontina', modelo: 'PRO', status: 'em_uso', valor: 850.0, localizacao: 'Oficina Mecânica', numeroSerie: 'TRQ-200-2023-001', respIdx: 2 },
    { codigo: 'FER-003', nome: 'Multímetro Digital TRMS', tipo: 'ferramenta', fabricante: 'Fluke', modelo: '117', status: 'disponivel', valor: 1650.0, localizacao: 'Almoxarifado — Prateleira B3', numeroSerie: 'FLK-117-2022-005' },
    { codigo: 'VAP-001', nome: 'Furgão de Apoio Mecânico', tipo: 'veiculo_apoio', fabricante: 'Mercedes-Benz', modelo: 'Sprinter 313 CDI', status: 'disponivel', valor: 145000.0, localizacao: 'Pátio B — Vaga 05', numeroSerie: '9BM910382M1234567' },
  ];

  for (const eq of equipamentosData) {
    await prisma.equipamento.create({
      data: {
        codigo: eq.codigo,
        nome: eq.nome,
        tipo: eq.tipo,
        fabricante: eq.fabricante,
        modelo: eq.modelo,
        status: eq.status,
        valorAquisicao: eq.valor,
        localizacao: eq.localizacao,
        numeroSerie: eq.numeroSerie ?? undefined,
        dataAquisicao: new Date('2023-01-15'),
        proximaRevisao: new Date('2026-07-01'),
        responsavelId: (eq as any).respIdx !== undefined ? funcionarios[(eq as any).respIdx].id : undefined,
      },
    });
  }
  console.log(`✅ ${equipamentosData.length} equipamentos/ferramentas criados`);

  // ─── KM REGISTROS ──────────────────────────────────────────
  // Histórico de KM para o gráfico de evolução no detalhe do caminhão
  const kmRegistros = [
    { caminhaoIdx: 0, km: 183000, data: new Date('2026-03-01') },
    { caminhaoIdx: 0, km: 184200, data: new Date('2026-03-15') },
    { caminhaoIdx: 0, km: 185420, data: new Date('2026-04-01') },
    { caminhaoIdx: 1, km: 218500, data: new Date('2026-03-01') },
    { caminhaoIdx: 1, km: 219400, data: new Date('2026-03-20') },
    { caminhaoIdx: 1, km: 220180, data: new Date('2026-04-10') },
  ];

  for (const reg of kmRegistros) {
    await prisma.kmRegistro.create({
      data: {
        caminhaoId: caminhoes[reg.caminhaoIdx].id,
        km: reg.km,
        data: reg.data,
      },
    });
  }
  console.log(`✅ ${kmRegistros.length} registros de KM criados`);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   Login: admin@fleetmaster.com.br / admin123');
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
