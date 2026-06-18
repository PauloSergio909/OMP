# FleetMaster — Documentação Técnica do Sistema

**Versão do documento:** 1.0  
**Data:** Junho 2026  
**Classificação:** Interno — Para fins de auditoria técnica

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estrutura do Projeto (Monorepo)](#4-estrutura-do-projeto-monorepo)
5. [Back-end — API Fastify](#5-back-end--api-fastify)
   - 5.1 [Módulos e Endpoints](#51-módulos-e-endpoints)
   - 5.2 [Autenticação e Autorização (RBAC)](#52-autenticação-e-autorização-rbac)
   - 5.3 [Rate Limiting](#53-rate-limiting)
   - 5.4 [Cache (Redis)](#54-cache-redis)
   - 5.5 [Jobs Automáticos](#55-jobs-automáticos)
   - 5.6 [Log de Auditoria](#56-log-de-auditoria)
   - 5.7 [Health Check](#57-health-check)
6. [Banco de Dados — PostgreSQL + Prisma](#6-banco-de-dados--postgresql--prisma)
   - 6.1 [Modelos de Dados](#61-modelos-de-dados)
   - 6.2 [Enumerações](#62-enumerações)
   - 6.3 [Índices](#63-índices)
7. [Front-end — React + Vite](#7-front-end--react--vite)
   - 7.1 [Páginas e Funcionalidades](#71-páginas-e-funcionalidades)
   - 7.2 [Gerenciamento de Estado e Dados](#72-gerenciamento-de-estado-e-dados)
8. [Segurança](#8-segurança)
9. [Infraestrutura e Deploy](#9-infraestrutura-e-deploy)
10. [Testes Automatizados](#10-testes-automatizados)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Dependências Principais](#12-dependências-principais)
13. [Resumo Executivo](#13-resumo-executivo)

---

## 1. Visão Geral do Sistema

O **FleetMaster** é um sistema de gestão de frotas, ordens de serviço e estoque desenvolvido para uso interno da organização. Ele centraliza e automatiza o controle operacional de:

- **Frotas** — caminhões, status operacional, quilometragem, manutenções, documentos (CRLV, seguro)
- **Ordens de Serviço (OS)** — manutenções preventivas, corretivas e inspeções com fluxo kanban
- **Estoque** — materiais, movimentações (entrada/saída), fornecedores, categorias, alertas de mínimo
- **Funcionários** — motoristas, mecânicos, controle de CNH, cargos e ativação/inativação
- **Pneus** — vida útil, posição, troca e descarte por caminhão
- **Checklists** — vistorias pré e pós-viagem com itens configuráveis
- **Abastecimentos** — combustível, eficiência (km/L) por caminhão, histórico mensal
- **Equipamentos** — inventário, movimentações e revisões
- **Compras (OC)** — ordens de compra com itens e fluxo de status
- **Agenda** — eventos pessoais por usuário
- **Relatórios** — dashboards analíticos em 10 categorias com exportação PDF e CSV

O sistema opera via **interface web** (browser) e expõe uma **API REST** consumida exclusivamente pelo front-end interno.

---

## 2. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO (Browser)                        │
│               React 18 + Vite 5 + Tailwind CSS 3               │
│                     Porta 5173 (dev) / 80 (prod)                │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP/HTTPS  (proxy /api →)
┌──────────────────────────────▼──────────────────────────────────┐
│                      API REST (Fastify 4)                        │
│               TypeScript 5 — Node.js 20 LTS                    │
│                     Porta 3000                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth    │  │  Estoque │  │  Frota   │  │  15 módulos... │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Middleware: authGuard · roleGuard · auditoria · rate-limit │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────┬───────────────────────────────────────────┬─────────────┘
        │ Prisma 5 (ORM)                            │ IORedis
┌───────▼───────────┐                   ┌───────────▼───────────┐
│  PostgreSQL 16    │                   │      Redis 7          │
│  (dados primários)│                   │  (cache + JWT blocklist│
│  Porta 5432       │                   │   Porta 6379)         │
└───────────────────┘                   └───────────────────────┘
```

**Padrão arquitetural:** Monolito modular (MVC adaptado)  
**Comunicação:** REST JSON síncrono; jobs assíncronos via `setInterval`  
**Deploy local:** Docker Compose com hot-reload; produção via `docker-compose.prod.yml` + Nginx

---

## 3. Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Linguagem** | TypeScript | 5.4 |
| **Runtime** | Node.js | 20 LTS |
| **Framework API** | Fastify | 4.26 |
| **ORM** | Prisma | 5.10 |
| **Banco de dados** | PostgreSQL | 16-alpine |
| **Cache / Filas** | Redis | 7-alpine |
| **Validação (back)** | Zod | 3.22 |
| **Autenticação** | JWT (@fastify/jwt) | 8.0 |
| **Hash de senha** | bcryptjs | 2.4 |
| **Logging** | Winston | 3.11 |
| **E-mail** | Nodemailer | 6.9 |
| **Build (API)** | tsc | — |
| **Dev watch (API)** | tsx watch | 4.7 |
| **Framework UI** | React | 18.2 |
| **Build (Web)** | Vite | 5.1 |
| **CSS** | Tailwind CSS | 3.4 |
| **Roteamento** | React Router | 6.22 |
| **HTTP Client** | Axios | 1.6 |
| **Server State** | TanStack Query | 5.24 |
| **Client State** | Zustand | 4.5 |
| **Formulários** | React Hook Form + Zod | 7.50 / 3.22 |
| **Gráficos** | Recharts | 2.12 |
| **Drag & Drop** | @dnd-kit | 6.1 / 8.0 |
| **Ícones** | Lucide React | 0.344 |
| **Toasts** | react-hot-toast | 2.4 |
| **Testes** | Jest + ts-jest | 29.7 |
| **Documentação API** | Swagger UI (OpenAPI) | /api/docs |
| **Proxy reverso** | Nginx | 1.25 (prod) |

---

## 4. Estrutura do Projeto (Monorepo)

O projeto usa **npm workspaces** com a seguinte organização:

```
fleetmaster/
├── package.json              # Raiz do monorepo (scripts e workspaces)
├── docker-compose.yml        # Ambiente de desenvolvimento
├── docker-compose.prod.yml   # Ambiente de produção
├── nginx/
│   └── nginx.conf            # Configuração Nginx (produção)
├── packages/
│   └── shared/               # Tipos e schemas Zod compartilhados
│       └── src/index.ts
└── apps/
    ├── api/                  # Back-end Fastify
    │   ├── prisma/
    │   │   ├── schema.prisma # Modelos e migrations
    │   │   └── seed.ts       # Dados iniciais
    │   └── src/
    │       ├── server.ts     # Ponto de entrada
    │       ├── app.ts        # buildApp() — plugins Fastify
    │       ├── config/       # database, redis, env
    │       ├── middleware/   # authGuard, roleGuard, auditoria, error-handler
    │       ├── modules/      # 15 módulos de domínio
    │       ├── utils/        # response, logger, cache, app-error
    │       └── __tests__/    # 25 arquivos de teste Jest
    └── web/                  # Front-end React
        └── src/
            ├── main.tsx
            ├── App.tsx       # Roteamento lazy-loaded
            ├── pages/        # 19 páginas
            ├── components/   # layout, ui, charts
            ├── hooks/
            │   ├── useApi.ts           # Barrel re-export
            │   └── api/               # 13 arquivos por domínio
            │       ├── _shared.ts
            │       ├── estoque.ts
            │       ├── frota.ts
            │       ├── os.ts
            │       ├── funcionarios.ts
            │       ├── abastecimento.ts
            │       ├── compras.ts
            │       ├── equipamentos.ts
            │       ├── pneus.ts
            │       ├── checklists.ts
            │       ├── agenda.ts
            │       ├── auth.ts
            │       └── search.ts
            ├── services/     # api.ts (Axios + interceptors JWT)
            ├── stores/       # auth.store.ts (Zustand)
            └── utils/        # printDocument, exportCsv, etc.
```

### Scripts disponíveis (raiz)

| Comando | Ação |
|---------|------|
| `npm run dev` | Inicia API + Web em modo desenvolvimento simultâneo |
| `npm run build` | Compila todos os workspaces |
| `npm run test` | Executa todos os testes |
| `npm run db:migrate` | Aplica migrações do banco |
| `npm run db:seed` | Popula dados iniciais |
| `npm run db:studio` | Abre Prisma Studio (interface visual DB) |
| `npm run docker:up` | Sobe containers (PostgreSQL + Redis) |
| `npm run docker:down` | Para containers |

---

## 5. Back-end — API Fastify

### 5.1 Módulos e Endpoints

A API está organizada em **15 módulos**, cada um com suas rotas, serviços e validações Zod independentes.

---

#### AUTH — `/api/auth`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| POST | `/login` | público | Autenticação (rate limit: 5/15min) |
| POST | `/logout` | autenticado | Invalida token no Redis blocklist |
| POST | `/refresh` | público | Renova access token (rate limit: 20/15min) |
| PUT | `/profile` | autenticado | Atualizar próprio perfil |
| PUT | `/password` | autenticado | Alterar própria senha |
| GET | `/users` | admin | Listar usuários paginado |
| POST | `/users` | admin | Criar usuário |
| PATCH | `/users/:id` | admin | Editar usuário |

---

#### ESTOQUE — `/api/estoque`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/materiais` | autenticado | Listar materiais paginado + filtros |
| GET | `/materiais/:id` | autenticado | Detalhe do material |
| POST | `/materiais` | almoxarife | Criar material |
| POST | `/materiais/importar` | almoxarife | Importação em lote (até 500 itens) |
| PATCH | `/materiais/:id` | almoxarife | Editar material |
| PATCH | `/materiais/:id/localizacao` | almoxarife | Atualizar localização no armazém |
| POST | `/entrada` | almoxarife | Registrar entrada (rate limit: 30/min) |
| POST | `/saida` | mecanico | Registrar saída (rate limit: 30/min) |
| GET | `/alertas` | autenticado | Materiais abaixo do estoque mínimo |
| GET | `/kpis` | autenticado | KPIs de estoque (cache 300s) |
| GET | `/movimentacoes` | autenticado | Histórico de movimentações paginado |
| GET | `/categorias` | autenticado | Listar categorias |
| POST | `/categorias` | gerente | Criar categoria |
| PATCH | `/categorias/:id` | gerente | Editar categoria |
| GET | `/fornecedores` | autenticado | Listar fornecedores |
| POST | `/fornecedores` | gerente | Criar fornecedor |
| PATCH | `/fornecedores/:id` | gerente | Editar fornecedor |

---

#### FROTA — `/api/frota`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/caminhoes` | autenticado | Listar caminhões paginado + filtro status |
| GET | `/caminhoes/:id` | autenticado | Detalhe do caminhão |
| POST | `/caminhoes` | gerente | Criar caminhão |
| PUT | `/caminhoes/:id` | gerente | Editar caminhão |
| PATCH | `/caminhoes/:id/status` | mecanico | Atualizar status operacional |
| POST | `/caminhoes/:id/km` | mecanico | Registrar quilometragem |
| GET | `/kpis` | autenticado | KPIs da frota (cache 300s) |
| GET | `/manutencao-vencendo` | autenticado | Manutenções vencidas (cache 300s) |
| GET | `/proximos-manutencao-km` | autenticado | Próximas manutenções por KM (margem: 1000 km) |
| GET | `/documentos-vencendo` | autenticado | CRLV e seguro vencendo em 30 dias |
| GET | `/custo-por-km` | autenticado | Custo operacional por KM (cache 300s) |
| GET | `/caminhoes/:id/timeline` | autenticado | Timeline de manutenções |
| GET | `/ranking-custo` | autenticado | Top 10 caminhões mais caros (cache 300s) |

---

#### ORDENS DE SERVIÇO — `/api/ordens-servico`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar OS paginado + filtros (status, tipo, prioridade, atrasadas) |
| GET | `/:id` | autenticado | Detalhe da OS |
| POST | `/` | mecanico | Criar OS (rate limit: 20/min) |
| POST | `/:id/duplicar` | mecanico | Duplicar OS existente |
| PATCH | `/:id` | mecanico | Editar OS |
| PATCH | `/:id/status` | mecanico | Mudar status + registrar histórico |
| POST | `/:id/itens` | almoxarife | Adicionar item à OS |
| DELETE | `/:id/itens/:itemId` | mecanico | Remover item da OS |
| GET | `/kpis` | autenticado | KPIs (cache 300s) |
| GET | `/por-status` | autenticado | Contagem por status (cache 120s) |
| GET | `/tempo-medio-resolucao` | autenticado | Tempo médio por tipo (cache 300s) |
| GET | `/custo-por-caminhao` | autenticado | Custo OS por caminhão (cache 300s) |
| GET | `/por-mecanico` | autenticado | OS por responsável (cache 300s) |
| GET | `/tendencia-mensal` | autenticado | Tendência dos últimos N meses |

---

#### FUNCIONÁRIOS — `/api/funcionarios`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar paginado + filtros (cargo, ativo, alerta CNH) |
| GET | `/:id` | autenticado | Detalhe do funcionário |
| POST | `/` | gerente | Criar funcionário |
| PUT | `/:id` | gerente | Editar funcionário |
| PATCH | `/:id/status` | admin | Ativar/desativar funcionário |
| GET | `/kpis` | autenticado | KPIs de funcionários |
| GET | `/motoristas-disponiveis` | autenticado | Motoristas sem caminhão atribuído |
| GET | `/cnh-vencendo` | autenticado | CNH vencendo nos próximos 30 dias |

---

#### ABASTECIMENTO — `/api/abastecimentos`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar paginado + filtros (caminhão, motorista, combustível, período) |
| POST | `/` | mecanico | Registrar abastecimento (rate limit: 20/min) |
| PUT | `/:id` | gerente | Editar abastecimento |
| DELETE | `/:id` | gerente | Remover abastecimento |
| GET | `/kpis` | autenticado | KPIs (cache 300s, por caminhão opcional) |
| GET | `/historico-mensal` | autenticado | Consumo últimos N meses (cache 300s) |
| GET | `/consumo-por-caminhao` | autenticado | Litros/mês por caminhão (cache 300s) |
| GET | `/ranking-eficiencia` | autenticado | Caminhões mais eficientes km/L (cache 300s) |
| GET | `/eficiencia/:caminhaoId` | autenticado | KM/L de caminhão específico (cache 300s) |

---

#### EQUIPAMENTOS — `/api/equipamentos`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar paginado + filtros (tipo, status, revisão vencendo) |
| GET | `/:id` | autenticado | Detalhe do equipamento |
| POST | `/` | almoxarife | Criar equipamento |
| PUT | `/:id` | almoxarife | Editar equipamento |
| POST | `/:id/movimentacoes` | mecanico | Registrar movimentação |
| GET | `/kpis` | autenticado | KPIs (cache 300s) |
| GET | `/revisoes-vencendo` | autenticado | Revisões próximas (cache 300s) |

---

#### PNEUS — `/api/pneus`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/caminhao/:caminhaoId` | autenticado | Pneus de um caminhão |
| GET | `/caminhao/:caminhaoId/kpis` | autenticado | KPIs pneus + KM atual |
| GET | `/:id` | autenticado | Detalhe do pneu |
| POST | `/` | mecanico | Criar pneu |
| POST | `/:id/troca` | mecanico | Registrar troca (rate limit: 10/min) |
| GET | `/kpis` | autenticado | KPIs globais de pneus (cache 300s) |
| GET | `/alertas` | autenticado | Pneus com ≥80% vida útil (cache 300s) |

---

#### CHECKLISTS — `/api/checklists`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/itens-padrao` | autenticado | Itens padrão por tipo (pré/pós viagem) |
| GET | `/caminhao/:caminhaoId` | autenticado | Histórico de checklists por caminhão |
| GET | `/:id` | autenticado | Detalhe do checklist |
| POST | `/` | autenticado | Criar checklist de vistoria |

---

#### AGENDA — `/api/agenda`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar eventos do mês |
| POST | `/` | autenticado | Criar evento |
| PUT | `/:id` | autenticado | Editar evento |
| DELETE | `/:id` | autenticado | Remover evento |

---

#### COMPRAS — `/api/compras`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/` | autenticado | Listar OC paginado + filtros (status, atrasada) |
| GET | `/:id` | autenticado | Detalhe da OC |
| POST | `/` | almoxarife | Criar OC |
| PUT | `/:id` | gerente | Editar OC |
| PATCH | `/:id/status` | gerente | Mudar status da OC |
| POST | `/:id/itens` | almoxarife | Adicionar item à OC |
| DELETE | `/:id/itens/:itemId` | almoxarife | Remover item da OC |
| GET | `/kpis` | autenticado | KPIs de compras (cache 300s) |

---

#### CONFIGURAÇÕES — `/api/configuracoes`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/empresa` | autenticado | Dados da empresa |
| PUT | `/empresa` | gerente | Atualizar dados da empresa |
| GET | `/auditoria` | gerente | Logs de auditoria paginado |

---

#### BUSCA GLOBAL — `/api/search`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/?q=termo` | autenticado | Busca em caminhões, OS, materiais, funcionários, equipamentos, fornecedores (máx. 5 por tipo) |

---

#### ADMIN — `/api/admin`

| Método | Rota | Role mínimo | Descrição |
|--------|------|-------------|-----------|
| GET | `/stats` | admin | Contagem de registros + info infraestrutura (cache 60s) |
| DELETE | `/cache` | admin | Limpar todas as chaves de cache Redis |

---

#### HEALTH CHECK — `/api/health`

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| GET | `/health` | nenhuma | Status API, DB, Redis, uptime e memória |

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-09T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "redis": "ok"
  },
  "memory": {
    "heapUsedMB": 85,
    "heapTotalMB": 140,
    "rssMB": 210
  }
}
```

**Status HTTP:** `200 OK` ou `503 Service Unavailable` (se DB/Redis indisponível)

---

#### DOCUMENTAÇÃO SWAGGER — `/api/docs`

Interface interativa OpenAPI disponível em modo desenvolvimento para exploração de todos os endpoints.

---

### 5.2 Autenticação e Autorização (RBAC)

#### Fluxo de Autenticação

```
[Login] → POST /api/auth/login
        ← { accessToken (15min), refreshToken (7d) }

[Requisição autenticada] → Header: Authorization: Bearer <accessToken>
                         ← authGuard: verifica assinatura JWT + blocklist Redis

[Renovar token] → POST /api/auth/refresh (body: { refreshToken })
                ← { accessToken (novo) }

[Logout] → POST /api/auth/logout
         → Insere accessToken atual na blocklist Redis (até expiração)
```

#### Papéis (Roles)

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema, incluindo gestão de usuários e limpeza de cache |
| `gerente` | Gestão operacional completa (criar/editar caminhões, OS, compras, etc.) |
| `mecanico` | Criar/alterar OS, registrar KM e abastecimento, criar pneus e checklists |
| `almoxarife` | Controle de estoque (entrada/saída), criação de materiais, compras |
| `visualizador` | Somente leitura em todos os módulos |

#### Matriz de Permissões

| Funcionalidade | Admin | Gerente | Mecânico | Almoxarife | Visualizador |
|----------------|:-----:|:-------:|:--------:|:----------:|:------------:|
| Criar/editar caminhão | ✓ | ✓ | — | — | — |
| Criar/alterar OS | ✓ | ✓ | ✓ | — | — |
| Alterar status OS | ✓ | ✓ | ✓ | — | — |
| Registrar KM | ✓ | ✓ | ✓ | — | — |
| Registrar abastecimento | ✓ | ✓ | ✓ | ✓ | — |
| Criar pneu / registrar troca | ✓ | ✓ | ✓ | — | — |
| Criar checklist | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar/editar material | ✓ | ✓ | — | ✓ | — |
| Entrada de estoque | ✓ | ✓ | — | ✓ | — |
| Saída de estoque | ✓ | ✓ | ✓ | ✓ | — |
| Importar materiais | ✓ | ✓ | — | ✓ | — |
| Criar/editar fornecedor | ✓ | ✓ | — | — | — |
| Criar/editar categoria | ✓ | ✓ | — | — | — |
| Criar/editar funcionário | ✓ | ✓ | — | — | — |
| Ativar/desativar funcionário | ✓ | — | — | — | — |
| Criar/editar compra | ✓ | ✓ | — | ✓ | — |
| Alterar status compra | ✓ | ✓ | — | — | — |
| Criar/editar equipamento | ✓ | ✓ | — | ✓ | — |
| Movimentar equipamento | ✓ | ✓ | ✓ | ✓ | — |
| Editar dados da empresa | ✓ | ✓ | — | — | — |
| Ver logs de auditoria | ✓ | ✓ | — | — | — |
| Gestão de usuários | ✓ | — | — | — | — |
| Stats de sistema / limpar cache | ✓ | — | — | — | — |

---

### 5.3 Rate Limiting

Proteção contra abuso e ataques de força bruta:

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `POST /auth/login` | 5 requisições | 15 minutos |
| `POST /auth/refresh` | 20 requisições | 15 minutos |
| `POST /estoque/entrada` | 30 requisições | 1 minuto |
| `POST /estoque/saida` | 30 requisições | 1 minuto |
| `POST /ordens-servico` | 20 requisições | 1 minuto |
| `POST /abastecimentos` | 20 requisições | 1 minuto |
| `POST /pneus/:id/troca` | 10 requisições | 1 minuto |
| **Global** | **100 requisições** | **1 minuto** |

---

### 5.4 Cache (Redis)

O Redis é **opcional** (o sistema funciona sem ele, apenas sem cache).

**TTLs configurados:**

| Tipo de dado | TTL |
|-------------|-----|
| KPIs analíticos (frota, OS, estoque, etc.) | 300 segundos (5 min) |
| Listas dinâmicas (por status, alertas) | 120 segundos (2 min) |
| Admin stats | 60 segundos |

**Invalidação por operação:**

| Operação | Chaves invalidadas no Redis |
|----------|----------------------------|
| Criar/editar material | `estoque:kpis` |
| Entrada/saída estoque | `estoque:kpis` |
| Criar/editar caminhão | `frota:kpis`, `frota:proximos-manutencao-km:*` |
| Registrar KM | `frota:*`, `pneus:*`, `abastecimento:eficiencia:*` |
| Criar/alterar OS | `os:kpis`, `os:por-status`, `os:por-mecanico` |
| Mudar status OS | `os:*`, `frota:*` (se OS preventiva) |
| Novo abastecimento | `abastecimento:*`, `frota:custo-por-km`, `frota:ranking-custo` |
| Criar equipamento | `equipamentos:kpis`, `equipamentos:revisoes-vencendo` |
| Criar pneu | `pneus:kpis`, `pneus:alertas` |
| Logout | Insere token na blocklist (expira junto com o JWT) |
| Limpar cache (admin) | Todos os padrões: `frota:*`, `os:*`, `estoque:*`, `abastecimento:*`, `equipamentos:*`, `pneus:*`, `compras:*`, `admin:*` |

---

### 5.5 Jobs Automáticos

Dois jobs em background são iniciados junto com o servidor:

#### alertas.job.ts

**Frequência:** Configurável via `ALERTAS_INTERVALO_HORAS` (padrão: 24h)

Coleta automaticamente os seguintes alertas e os envia por e-mail (se `ALERTAS_EMAIL_DEST` estiver configurado):

| Tipo de alerta | Critério |
|----------------|---------|
| CNH vencendo | CNH com vencimento nos próximos 30 dias |
| Manutenção vencendo | Data de manutenção ≤ 30 dias, caminhão operacional |
| Estoque abaixo do mínimo | `quantidade_atual < estoque_minimo` |
| Documentos vencendo | CRLV ou seguro vencendo nos próximos 30 dias |
| Pneus próximos do limite | ≥ 80% da vida útil (km atual vs km vida útil) |
| Ordens de compra atrasadas | Status pendente/aprovada com `dataEntrega < now` |
| Manutenção por KM urgente | `proxima_manutencao_km - km_atual ≤ 1000 km` |

**E-mail urgente** é enviado quando há itens críticos (vencidos, >95% vida útil, OC atrasadas).

#### relatorio.job.ts

Estrutura para relatórios periódicos automáticos (pendente de configuração).

---

### 5.6 Log de Auditoria

Todas as ações sensíveis são registradas no modelo `LogAuditoria` do banco de dados:

**Campos registrados:**
- `userId` — Quem executou
- `userNome` — Nome do usuário
- `acao` — Descrição da ação (ex: "Registrou KM")
- `entidade` — Módulo afetado (ex: "caminhao")
- `entidadeId` — ID do registro afetado
- `ip` — Endereço IP do cliente
- `createdAt` — Timestamp da ação

A auditoria executa de forma **assíncrona** (`setImmediate`) para não impactar o tempo de resposta da API. Os logs são consultáveis via `GET /api/configuracoes/auditoria` por admin/gerente.

---

### 5.7 Health Check

O endpoint `GET /api/health` verifica ativamente o estado de todos os serviços e retorna `503` em caso de falha crítica. Pode ser usado por load balancers e sistemas de monitoramento externos.

---

## 6. Banco de Dados — PostgreSQL + Prisma

### 6.1 Modelos de Dados

O schema Prisma define **24 entidades** com suas relações:

| Modelo | Descrição | Relações principais |
|--------|-----------|---------------------|
| `ConfiguracaoEmpresa` | Razão social, CNPJ, logo da organização | — |
| `LogAuditoria` | Registro imutável de ações do sistema | `userId` (indexado) |
| `User` | Usuários do sistema com role e senha hash bcrypt | `Funcionario` (1:1 opcional) |
| `Funcionario` | Motoristas e mecânicos (CPF, CNH, cargo, telefone) | `User`, `Caminhao`, `OrdemServico`, `Abastecimento`, `Equipamento`, `ChecklistVistoria` |
| `Categoria` | Categorias de materiais de estoque | `Material` (1:N) |
| `Fornecedor` | Fornecedores/distribuidores (CNPJ, avaliação) | `Material`, `OrdemCompra` |
| `Material` | Itens de estoque (código, nome, unidade, min/máx) | `Categoria`, `Fornecedor`, `Estoque`, `Movimentacao`, `ItemOS`, `ItemCompra` |
| `Estoque` | Quantidade atual por material (único por materialId) | `Material` (1:1) |
| `Movimentacao` | Histórico de entradas e saídas de estoque | `Material`, `User`, `OrdemServico` (opcional) |
| `Caminhao` | Veículos da frota (placa, chassi, KM, status, próxima manutenção) | `Funcionario` (motorista), `OrdemServico`, `Abastecimento`, `KmRegistro`, `Pneu`, `ChecklistVistoria` |
| `Pneu` | Pneus por caminhão (posição, marca, modelo, vida útil em km) | `Caminhao`, `TrocaPneu` |
| `TrocaPneu` | Registro histórico de trocas de pneu | `Pneu` |
| `ChecklistVistoria` | Vistoria pré/pós viagem (aprovado, observações) | `Caminhao`, `Funcionario`, `ItemChecklist` |
| `ItemChecklist` | Itens individuais do checklist (cascade delete) | `ChecklistVistoria` |
| `KmRegistro` | Histórico de quilometragem por caminhão | `Caminhao` |
| `OrdemServico` | Manutenção/reparo (tipo, status, prioridade, custo) | `Caminhao`, `Funcionario` (responsável), `ItemOS`, `HistoricoOS`, `Movimentacao` |
| `HistoricoOS` | Trilha de mudanças de status das OS | `OrdemServico` |
| `ItemOS` | Materiais e custos vinculados a uma OS | `OrdemServico`, `Material` (opcional) |
| `AgendaEvento` | Eventos pessoais por usuário | `User` |
| `Abastecimento` | Registros de combustível (litros, preço, tipo) | `Caminhao`, `Funcionario` (motorista) |
| `OrdemCompra` | Ordens de compra com status e prazo | `Fornecedor`, `ItemCompra` |
| `ItemCompra` | Itens de uma ordem de compra | `OrdemCompra`, `Material` |
| `Equipamento` | Ferramentas e equipamentos (código, tipo, revisão) | `Funcionario` (responsável, opcional), `MovimentacaoEquipamento` |
| `MovimentacaoEquipamento` | Transferências e alocações de equipamentos | `Equipamento`, `Funcionario` |

### 6.2 Enumerações

| Modelo | Campo | Valores |
|--------|-------|---------|
| `User` | `role` | `visualizador`, `almoxarife`, `mecanico`, `gerente`, `admin` |
| `Caminhao` | `status` | `operacional`, `manutencao`, `parado` |
| `OrdemServico` | `status` | `agendada`, `em_andamento`, `concluida`, `cancelada` |
| `OrdemServico` | `prioridade` | `baixa`, `media`, `alta`, `urgente` |
| `OrdemServico` | `tipo` | `preventiva`, `corretiva`, `inspecao` |
| `OrdemCompra` | `status` | `pendente`, `aprovada`, `entregue`, `recebida`, `cancelada` |
| `Movimentacao` | `tipo` | `entrada`, `saida` |
| `Pneu` | `status` | `ativo`, `descartado` |
| `Equipamento` | `status` | `disponivel`, `em_uso`, `descartado` |
| `ChecklistVistoria` | `tipo` | `pre_viagem`, `pos_viagem` |

### 6.3 Índices

Índices de banco de dados para otimizar as consultas mais frequentes:

| Modelo | Campo(s) indexado(s) |
|--------|---------------------|
| `LogAuditoria` | `userId`, `entidade`, `createdAt` |
| `Material` | `nome`, `categoriaId` |
| `Movimentacao` | `materialId`, `createdAt`, `ordemServicoId` |
| `Caminhao` | `status`, `motoristaId` |
| `Pneu` | `caminhaoId` |
| `TrocaPneu` | `pneuId` |
| `ChecklistVistoria` | `caminhaoId`, `motoristaId`, `createdAt` |
| `KmRegistro` | `caminhaoId`, `data` |
| `OrdemServico` | `status`, `caminhaoId`, `responsavelId`, `dataAbertura` |
| `Abastecimento` | `(caminhaoId, data)`, `motoristaId` |
| `OrdemCompra` | `status`, `fornecedorId` |
| `Equipamento` | `status`, `tipo`, `responsavelId` |

---

## 7. Front-end — React + Vite

### 7.1 Páginas e Funcionalidades

O front-end é uma **SPA (Single Page Application)** com code-splitting. Todas as páginas são carregadas de forma lazy (sob demanda) para melhorar o tempo de carregamento inicial.

| Página | Rota | Funcionalidades principais |
|--------|------|---------------------------|
| **Login** | `/login` | Autenticação com token JWT |
| **Dashboard** | `/` | KPIs gerais, alertas, visão do motorista |
| **Estoque** | `/estoque` | Lista de materiais, alertas de mínimo, gráficos, importação |
| **Material Detalhe** | `/estoque/:id` | Detalhe + histórico de movimentações |
| **Frota** | `/frota` | Cards de caminhões por status |
| **Caminhão Detalhe** | `/frota/:id` | Timeline, pneus, checklists, KM, OS vinculadas |
| **Ordens de Serviço** | `/ordens-servico` | Kanban drag-and-drop por status |
| **OS Detalhe** | `/ordens-servico/:id` | Itens, histórico, custo, impressão |
| **Funcionários** | `/funcionarios` | Lista com alertas de CNH |
| **Funcionário Detalhe** | `/funcionarios/:id` | Ficha completa, impressão PDF |
| **Abastecimento** | `/abastecimentos` | Histórico + KPIs eficiência |
| **Equipamentos** | `/equipamentos` | Lista com alertas de revisão |
| **Equipamento Detalhe** | `/equipamentos/:id` | Movimentações, responsável |
| **Compras** | `/compras` | Lista de OC com status |
| **Compra Detalhe** | `/compras/:id` | Itens, impressão PDF |
| **Relatórios** | `/relatorios` | 10 abas analíticas com exportação PDF e CSV |
| **Agenda** | `/agenda` | Calendário de eventos com exportação CSV |
| **Configurações** | `/configuracoes` | Dados da empresa, usuários, logs de auditoria |

#### Abas de Relatórios

| Aba | Conteúdo |
|-----|---------|
| Resumo Geral | KPIs consolidados de todos os módulos |
| Combustível | Consumo, eficiência, ranking por caminhão |
| Manutenção | OS por tipo/status, tempo médio resolução, custos |
| Ordens de Serviço | Tendência mensal, OS por mecânico, custo por caminhão |
| Funcionários | Distribuição por cargo, alertas CNH |
| Compras | KPIs ordens de compra, gastos por período |
| Estoque | Movimentações, itens em alerta, giro |
| Frota | Custo por KM, ranking mais caros, documentos |
| Equipamentos | Distribuição por tipo/status, revisões |
| Pneus | Vida útil média, alertas, trocas recentes |

Cada aba possui botão de **exportação PDF** (gera HTML → impressão) e **exportação CSV** de forma independente.

### 7.2 Gerenciamento de Estado e Dados

#### TanStack Query (Server State)

Todas as chamadas à API são gerenciadas via TanStack Query:

- **Cache automático** por chave de query
- **Revalidação** automática ao focar a janela
- **Invalidação** após mutações (ex: criar OS invalida a lista de OS)
- **Loading e error states** padronizados

Os hooks estão organizados por domínio em `apps/web/src/hooks/api/`:

```
_shared.ts        → PaginatedResponse<T>, FornecedorDropdownItem
estoque.ts        → useMateriais, useEstoqueKPIs, useRegistrarEntrada, ...
frota.ts          → useCaminhoes, useFrotaKPIs, useCaminhaoDetalhe, ...
os.ts             → useOrdensServico, useCriarOS, useAtualizarStatusOS, ...
funcionarios.ts   → useFuncionarios, useCriarFuncionario, ...
abastecimento.ts  → useAbastecimentos, useRegistrarAbastecimento, ...
compras.ts        → useCompras, useCriarCompra, ...
equipamentos.ts   → useEquipamentos, useCriarEquipamento, ...
pneus.ts          → usePneusCaminhao, useCriarPneu, useRegistrarTrocaPneu, ...
checklists.ts     → useChecklistsCaminhao, useCriarChecklist, ...
agenda.ts         → useAgendaMes, useCriarEventoAgenda, ...
auth.ts           → useUsuarios, useAtualizarPerfil, useAdminStats, ...
search.ts         → useSearch
```

#### Zustand (Client State)

Gerencia o estado de autenticação (`auth.store.ts`):
- Dados do usuário logado (id, nome, email, role)
- Tokens (accessToken, refreshToken)
- Ações: login, logout, updateProfile

#### Axios (HTTP Client)

Configurado com interceptors automáticos:
- **Request:** Injeta `Authorization: Bearer <token>` em toda requisição
- **Response 401:** Tenta renovar o token via `/auth/refresh` automaticamente; se falhar, redireciona para login

---

## 8. Segurança

### Medidas implementadas

| Área | Medida |
|------|--------|
| **Senhas** | Hash bcrypt (salt automático) |
| **Tokens** | JWT com curta duração (15 min access, 7 dias refresh) |
| **Logout** | Token inserido em blocklist Redis até expiração |
| **Headers HTTP** | @fastify/helmet (HSTS, X-Frame-Options, CSP, etc.) |
| **CORS** | Apenas origens configuradas (localhost em dev, ALLOWED_ORIGIN em prod) |
| **Rate Limiting** | Proteção em endpoints críticos de auth e escrita |
| **Autorização** | RBAC por middleware em todas as rotas protegidas |
| **Validação** | Zod em front e back para todos os inputs |
| **SQL Injection** | Prisma ORM (queries parametrizadas — sem SQL raw em inputs do usuário) |
| **XSS** | Sanitização via função `esc()` nos geradores de HTML para impressão |
| **Auditoria** | Log de todas as ações sensíveis com IP e timestamp |
| **Secrets** | Variáveis de ambiente (não commitadas; validadas com Zod no startup) |
| **HTTPS** | Nginx com TLS em produção (certificado configurável) |

---

## 9. Infraestrutura e Deploy

### Desenvolvimento (Docker Compose)

```yaml
Serviços:
  postgres:   postgres:16-alpine   porta 5432   volume persistente
  redis:      redis:7-alpine       porta 6379   volume persistente
  api:        build local          porta 3000   hot-reload (tsx watch)
  web:        build local          porta 5173   hot-reload (Vite HMR)
```

**PostgreSQL health check:** Executado a cada 5 segundos, 5 tentativas antes de falha.  
**Dependências:** `api` aguarda `postgres` estar saudável antes de iniciar.

### Produção (docker-compose.prod.yml + Nginx)

- `npm run build` compila TypeScript (API) e gera bundle Vite (Web)
- Nginx serve o bundle estático do front-end na porta 80/443
- Nginx atua como proxy reverso: `/api/*` → `http://api:3000`
- Variáveis sensíveis (JWT_SECRET, DATABASE_URL) devem ser definidas via secrets do ambiente de produção (não hardcoded)

### Requisitos de sistema

| Componente | Mínimo recomendado |
|-----------|-------------------|
| Node.js | 20 LTS |
| PostgreSQL | 16 |
| Redis | 7 (opcional) |
| RAM | 1 GB (dev) / 2 GB (prod) |
| Disco | 10 GB (logs + dados) |

---

## 10. Testes Automatizados

O projeto possui **25 arquivos de teste** utilizando **Jest 29 + ts-jest**, cobrindo a camada de serviços da API.

| Arquivo | Módulo coberto |
|---------|---------------|
| `auth.service.test.ts` | Login, refresh, permissões |
| `estoque.service.test.ts` | CRUD materiais, entrada/saída |
| `estoque.service.criar.test.ts` | Criação de material |
| `estoque.service.saida.test.ts` | Validação de saída de estoque |
| `estoque.service.atualizar.test.ts` | Atualização de material |
| `estoque.service.localizacao.test.ts` | Localização no armazém |
| `os.service.test.ts` | CRUD de OS, transições de status |
| `os.service.ext.test.ts` | Duplicar OS e extensões |
| `os.service.mecanico.test.ts` | Permissões do mecânico |
| `os.service.analytic.test.ts` | KPIs e tempo de resolução |
| `frota.service.test.ts` | CRUD de caminhões |
| `frota.service.analytic.test.ts` | KPIs, manutenção, ranking |
| `abastecimento.service.test.ts` | Registro de combustível |
| `pneus.service.test.ts` | Pneus, troca, KPIs |
| `checklists.service.test.ts` | Vistoria pré/pós viagem |
| `equipamentos.service.test.ts` | CRUD de equipamentos |
| `funcionarios.service.test.ts` | CRUD de funcionários |
| `compras.service.test.ts` | Ordens de compra |
| `compras-transicao.test.ts` | Máquina de estado da OC |
| `agenda.service.test.ts` | Eventos de agenda |
| `alertas.job.test.ts` | Job de alertas (30 dias, CNH, estoque, etc.) |
| `relatorio.job.test.ts` | Job de relatórios periódicos |
| `configuracoes.service.test.ts` | Dados da empresa, auditoria |
| `response.test.ts` | Formatadores de resposta HTTP |
| `validations.test.ts` | Schemas de validação Zod |

**Executar testes:**
```bash
npm run test                    # Todos os workspaces
npm run test --workspace=apps/api   # Apenas API
```

---

## 11. Variáveis de Ambiente

**Arquivo de referência:** `apps/api/.env.example`

| Variável | Obrigatória | Padrão | Descrição |
|----------|:-----------:|--------|-----------|
| `NODE_ENV` | ✓ | `development` | Ambiente (`development`/`production`) |
| `PORT` | ✓ | `3000` | Porta do servidor Fastify |
| `DATABASE_URL` | ✓ | — | Connection string PostgreSQL |
| `JWT_SECRET` | ✓ | — | Chave de assinatura dos access tokens |
| `JWT_REFRESH_SECRET` | — | — | Chave dos refresh tokens (usa JWT_SECRET se ausente) |
| `JWT_EXPIRES_IN` | — | `15m` | Duração do access token |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Duração do refresh token |
| `REDIS_URL` | — | — | Connection string Redis (desativa cache se ausente) |
| `SMTP_HOST` | — | — | Host do servidor SMTP para alertas |
| `SMTP_PORT` | — | `587` | Porta SMTP |
| `SMTP_USER` | — | — | Usuário SMTP |
| `SMTP_PASS` | — | — | Senha SMTP |
| `SMTP_FROM` | — | — | Remetente dos e-mails de alerta |
| `ALERTAS_EMAIL_DEST` | — | — | Destinatário dos e-mails de alerta |
| `ALERTAS_INTERVALO_HORAS` | — | `24` | Frequência do job de alertas (horas) |
| `VITE_API_URL` *(web)* | — | `http://localhost:3000/api` | URL base da API para o front-end |

> **Atenção:** `JWT_SECRET` deve ser uma string aleatória longa (mínimo 32 caracteres) e **nunca deve ser compartilhada ou versionada no repositório**.

---

## 12. Dependências Principais

### Back-end (`apps/api`)

| Pacote | Versão | Finalidade |
|--------|--------|-----------|
| `fastify` | 4.26 | Framework HTTP principal |
| `@prisma/client` | 5.10 | ORM — cliente do banco de dados |
| `prisma` | 5.10 | ORM — CLI de migrations |
| `@fastify/jwt` | 8.0 | Autenticação JWT |
| `@fastify/cors` | 9.0 | Política de origens cruzadas |
| `@fastify/helmet` | 11.0 | Headers de segurança HTTP |
| `@fastify/rate-limit` | 9.0 | Limitação de taxa |
| `@fastify/swagger` | 8.0 | Documentação OpenAPI |
| `@fastify/swagger-ui` | 3.0 | Interface Swagger |
| `ioredis` | 5.3 | Cliente Redis |
| `bcryptjs` | 2.4 | Hash de senhas |
| `zod` | 3.22 | Validação de schemas |
| `winston` | 3.11 | Logging estruturado |
| `nodemailer` | 6.9 | Envio de e-mails |
| `jest` | 29.7 | Framework de testes |
| `ts-jest` | 29.1 | Suporte TypeScript no Jest |
| `tsx` | 4.7 | Execução TypeScript em dev |

### Front-end (`apps/web`)

| Pacote | Versão | Finalidade |
|--------|--------|-----------|
| `react` + `react-dom` | 18.2 | Framework UI |
| `vite` | 5.1 | Build e dev server |
| `tailwindcss` | 3.4 | Estilização utilitária |
| `react-router-dom` | 6.22 | Roteamento SPA |
| `@tanstack/react-query` | 5.24 | Server state e cache |
| `axios` | 1.6 | HTTP client com interceptors |
| `zustand` | 4.5 | Estado global do cliente |
| `react-hook-form` | 7.50 | Formulários com validação |
| `zod` | 3.22 | Validação de schemas |
| `@hookform/resolvers` | 3.3 | Integração RHF + Zod |
| `recharts` | 2.12 | Gráficos |
| `@dnd-kit/core` | 6.1 | Drag-and-drop (kanban) |
| `lucide-react` | 0.344 | Biblioteca de ícones |
| `react-hot-toast` | 2.4 | Notificações toast |

---

## 13. Resumo Executivo

| Aspecto | Detalhe |
|---------|---------|
| **Sistema** | FleetMaster — Gestão de Frotas, OS e Estoque |
| **Tipo** | Aplicação web interna (SPA + API REST) |
| **Arquitetura** | Monolito modular — Monorepo npm workspaces |
| **Back-end** | Fastify 4 + Prisma 5 + Node.js 20 + TypeScript 5 |
| **Front-end** | React 18 + Vite 5 + Tailwind CSS 3 + TypeScript 5 |
| **Banco de dados** | PostgreSQL 16 (24 modelos, relações 1:N e N:N) |
| **Cache** | Redis 7 (opcional, TTL 120–300s por tipo) |
| **Autenticação** | JWT access token (15min) + refresh token (7 dias) + blocklist Redis |
| **Autorização** | RBAC com 5 roles: admin, gerente, mecanico, almoxarife, visualizador |
| **Endpoints API** | 80+ rotas RESTful distribuídas em 15 módulos |
| **Módulos** | Frota, OS, Estoque, Funcionários, Abastecimento, Equipamentos, Pneus, Checklists, Compras, Agenda, Relatórios, Configurações, Admin, Auth, Search |
| **Páginas Web** | 19 páginas lazy-loaded com code splitting |
| **Relatórios** | 10 categorias com exportação PDF e CSV por aba |
| **Jobs automáticos** | Alertas a cada 24h (7 tipos) + relatório periódico |
| **Auditoria** | Log completo de ações (userId, ação, entidade, IP, timestamp) |
| **Segurança** | bcrypt, helmet, CORS, rate limit, RBAC, XSS escaping, Zod validation |
| **Testes** | 25 arquivos Jest cobrindo todos os serviços da API |
| **Deploy dev** | Docker Compose (PostgreSQL + Redis + API + Web com hot-reload) |
| **Deploy prod** | Docker Compose + Nginx (TLS, proxy reverso) |
| **Documentação API** | Swagger UI em `/api/docs` |
| **Health check** | `GET /api/health` — verifica DB + Redis + memória |

---

*Documento gerado para fins de auditoria técnica interna — FleetMaster v1.0 — OMP*
