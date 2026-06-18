# 🚛 FleetMaster Pro

**Sistema integrado de gestão de materiais, controle de estoque e manutenção de frota de caminhões.**

---

## 📋 Pré-requisitos

Antes de começar, instale na sua máquina:

| Ferramenta | Versão Mínima | Como instalar |
|-----------|---------------|---------------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org) |
| **Docker Desktop** | 24+ | [docker.com/desktop](https://www.docker.com/products/docker-desktop) |
| **VS Code** | Última | [code.visualstudio.com](https://code.visualstudio.com) |
| **Git** | 2.40+ | [git-scm.com](https://git-scm.com) |

> **Dica**: Após instalar o Node.js, verifique com `node --version` e `npm --version` no terminal.

---

## 🚀 Passo a Passo: Primeira Execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/fleetmaster.git
cd fleetmaster
```

### 2. Abra no VS Code e instale as extensões

```bash
code .
```

O VS Code vai mostrar uma notificação: **"Este projeto recomenda extensões..."** → Clique em **"Instalar Todas"**.

Se não aparecer: `Ctrl+Shift+P` → `Extensions: Show Recommended Extensions` → instale todas.

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Para **desenvolvimento local**, o `.env.example` já tem valores prontos. Só copiar.

### 4. Suba o banco de dados e Redis com Docker

```bash
docker-compose up -d postgres redis
```

Isso inicia o PostgreSQL e Redis em containers. Verifique:

```bash
docker-compose ps
# Deve mostrar postgres e redis com status "Up"
```

### 5. Instale as dependências

```bash
npm install
```

Isso instala as dependências de TODOS os workspaces (shared, api, web) de uma vez.

### 6. Configure o banco de dados

```bash
# Gera o Prisma Client e roda as migrations (cria as tabelas)
cd apps/api
npx prisma generate
npx prisma migrate dev --name init

# Popula o banco com dados de teste
npm run db:seed
```

Saída esperada:
```
✅ Admin criado: admin@fleetmaster.com.br (senha: admin123)
✅ 6 categorias criadas
✅ 4 fornecedores criados
✅ 4 funcionários criados
✅ 8 materiais com estoque criados
✅ 3 caminhões criados
🎉 Seed concluído com sucesso!
```

### 7. Inicie o sistema

Na **raiz do projeto**, abra dois terminais no VS Code (`Ctrl+`` ` para abrir, `+` para criar outro):

**Terminal 1 — API (Back-end):**
```bash
npm run dev:api
```
Saída: `🚀 FleetMaster API rodando em http://localhost:3000`

**Terminal 2 — Web (Front-end):**
```bash
npm run dev:web
```
Saída: `Local: http://localhost:5173/`

### 8. Acesse o sistema

Abra **http://localhost:5173** no navegador.

Login: `admin@fleetmaster.com.br` / `admin123`

---

## 🗂️ Estrutura do Projeto (Explicada)

```
fleetmaster/
│
├── .vscode/                    ← Configs do VS Code (vão pro Git)
│   ├── extensions.json         ← Lista de extensões recomendadas
│   └── settings.json           ← Formato ao salvar, Tailwind, ESLint
│
├── packages/
│   └── shared/                 ← TIPOS E VALIDAÇÕES COMPARTILHADOS
│       └── src/
│           ├── types/          ← Interfaces TypeScript (Material, Caminhao, OS...)
│           └── validations/    ← Schemas Zod (validação front + back)
│
├── apps/
│   ├── api/                    ← BACK-END (Fastify + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   ← MAPA DO BANCO (tabelas, colunas, relações)
│   │   │   └── seed.ts         ← Dados iniciais de teste
│   │   └── src/
│   │       ├── config/         ← Conexões (banco, Redis, env)
│   │       ├── middleware/     ← Auth guard, error handler
│   │       ├── modules/        ← MÓDULOS DE NEGÓCIO
│   │       │   ├── auth/       ← Login, registro, JWT
│   │       │   ├── estoque/    ← CRUD materiais, movimentações
│   │       │   ├── frota/      ← CRUD caminhões, KPIs
│   │       │   └── ordem-servico/ ← CRUD OS, kanban
│   │       ├── utils/          ← Logger, response helpers
│   │       ├── app.ts          ← Monta o Fastify (plugins + rotas)
│   │       └── server.ts       ← PONTO DE ENTRADA (inicia o servidor)
│   │
│   └── web/                    ← FRONT-END (React + Vite + Tailwind)
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/     ← MainLayout, Sidebar, Header
│       │   │   ├── ui/         ← KPICard, StatusBadge, DataTable
│       │   │   └── charts/     ← (futuro) componentes de gráficos
│       │   ├── pages/          ← PÁGINAS DO SISTEMA
│       │   │   ├── Dashboard/  ← Visão geral + KPIs + gráficos
│       │   │   ├── Estoque/    ← Lista materiais + barras nível
│       │   │   ├── Frota/      ← Cards de caminhões
│       │   │   ├── OrdensServico/ ← Kanban de OS
│       │   │   └── Login/      ← Tela de autenticação
│       │   ├── hooks/          ← useApi.ts (TanStack Query hooks)
│       │   ├── services/       ← api.ts (Axios com interceptors)
│       │   ├── stores/         ← auth.store.ts (Zustand)
│       │   ├── styles/         ← globals.css (Tailwind)
│       │   ├── App.tsx         ← Rotas + Layout
│       │   └── main.tsx        ← Ponto de entrada React
│       ├── index.html          ← HTML base
│       ├── vite.config.ts      ← Config do Vite (proxy, aliases)
│       └── tailwind.config.ts  ← Cores e fontes customizadas
│
├── nginx/nginx.conf            ← Proxy reverso para produção
├── docker-compose.yml          ← Orquestra todos os serviços
├── .env.example                ← Modelo de variáveis de ambiente
├── .gitignore                  ← Arquivos ignorados pelo Git
├── .prettierrc                 ← Regras de formatação
└── package.json                ← Raiz do monorepo (workspaces)
```

---

## 🛠️ Comandos Úteis

### Desenvolvimento

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia API + Web simultaneamente |
| `npm run dev:api` | Inicia só o back-end |
| `npm run dev:web` | Inicia só o front-end |
| `npm run db:studio` | Abre interface visual do banco (Prisma Studio) |
| `npm run db:seed` | Repopula o banco com dados de teste |

### Banco de Dados

| Comando | O que faz |
|---------|-----------|
| `cd apps/api && npx prisma migrate dev --name descricao` | Cria migration após alterar schema.prisma |
| `cd apps/api && npx prisma migrate reset` | Apaga tudo e recria do zero |
| `cd apps/api && npx prisma studio` | Interface visual do banco em localhost:5555 |
| `cd apps/api && npx prisma db push` | Aplica schema sem criar migration (prototipagem) |

### Docker

| Comando | O que faz |
|---------|-----------|
| `docker-compose up -d` | Sobe todos os serviços |
| `docker-compose down` | Para todos os serviços |
| `docker-compose down -v` | Para e APAGA os dados |
| `docker-compose logs -f api` | Mostra logs da API em tempo real |

### Testes e Qualidade

| Comando | O que faz |
|---------|-----------|
| `npm run lint` | Verifica erros de código |
| `npm run test` | Roda os testes |
| `npm run build` | Build de produção |

---

## 🔌 Endpoints da API

### Autenticação
```
POST /api/auth/register    → Criar conta
POST /api/auth/login       → Login (retorna JWT)
POST /api/auth/refresh     → Renovar token
```

### Estoque
```
GET  /api/estoque/materiais       → Listar materiais (paginado)
GET  /api/estoque/materiais/:id   → Detalhe do material
POST /api/estoque/materiais       → Criar material
POST /api/estoque/entrada         → Registrar entrada
POST /api/estoque/saida           → Registrar saída
GET  /api/estoque/alertas         → Materiais abaixo do mínimo
GET  /api/estoque/kpis            → KPIs do dashboard
```

### Frota
```
GET   /api/frota/caminhoes          → Listar caminhões
GET   /api/frota/caminhoes/:id      → Detalhe do caminhão
POST  /api/frota/caminhoes          → Cadastrar caminhão
PATCH /api/frota/caminhoes/:id/status → Atualizar status
GET   /api/frota/kpis               → KPIs da frota
```

### Ordens de Serviço
```
GET   /api/ordens-servico           → Listar OS
POST  /api/ordens-servico           → Criar OS
PATCH /api/ordens-servico/:id/status → Atualizar status
POST  /api/ordens-servico/:id/itens  → Adicionar item à OS
```

### Health Check
```
GET /api/health → Status da API
```

---

## 🔐 Permissões (RBAC)

| Recurso | Admin | Gerente | Mecânico | Almoxarife | Visualizador |
|---------|:-----:|:-------:|:--------:|:----------:|:------------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar Material | ✅ | ✅ | ❌ | ✅ | ❌ |
| Entrada Estoque | ✅ | ✅ | ❌ | ✅ | ❌ |
| Saída Estoque | ✅ | ✅ | ✅ | ✅ | ❌ |
| Criar Caminhão | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar OS | ✅ | ✅ | ✅ | ❌ | ❌ |
| Alterar Status OS | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🧩 Extensões VS Code (Detalhadas)

### Essenciais (instale TODAS)

1. **ESLint** — Analisa o código em tempo real. Sublinha em amarelo/vermelho erros de padrão. Corrige automaticamente ao salvar.

2. **Prettier** — Formata o código ao salvar (indentação, aspas, ponto-e-vírgula). Garante que todo o time escreve no mesmo estilo.

3. **Prisma** — Syntax highlighting para `schema.prisma`. Sem ela, o arquivo fica sem cores e sem autocomplete de tipos.

4. **Tailwind CSS IntelliSense** — Autocomplete de classes Tailwind. Digita `bg-` e mostra todas as cores. Hover mostra o CSS gerado.

5. **Docker** — Painel visual para containers. Clique direito para parar, reiniciar, ver logs.

### Produtividade

6. **Thunder Client** — Testa a API direto no VS Code sem sair. Cria requisições POST/GET, salva coleções.

7. **GitLens** — Mostra quem alterou cada linha (`blame`), histórico de um arquivo, e comparação entre commits.

8. **Error Lens** — Mostra erros INLINE no código (não só no painel Problems). Muito útil para ver erros de TypeScript imediatamente.

9. **Auto Rename Tag** — Ao renomear `<div>`, o `</div>` muda automaticamente. Essencial para JSX.

10. **DotENV** — Syntax highlighting para arquivos `.env`.

---

## 📐 Fluxo de Dados (como o sistema funciona)

```
Usuário clica "Dar entrada em 50L de óleo"
         │
         ▼
┌─────────────────────┐
│  React (Front-end)  │  1. Valida dados com Zod (front)
│  useRegistrarEntrada │  2. Envia POST /api/estoque/entrada
│  via TanStack Query  │     com token JWT no header
└─────────┬───────────┘
          │ HTTP POST
          ▼
┌─────────────────────┐
│  Fastify (Back-end) │  3. authGuard verifica JWT
│  estoque.routes.ts  │  4. roleGuard verifica permissão
│  estoque.service.ts │  5. Valida dados com Zod (back)
└─────────┬───────────┘
          │ $transaction
          ▼
┌─────────────────────┐
│  PostgreSQL (Banco) │  6. UPDATE estoque SET qtd += 50
│  via Prisma ORM     │  7. INSERT movimentacao (log)
│                     │  8. UPDATE material.precoUnitario
└─────────┬───────────┘
          │ Resposta
          ▼
┌─────────────────────┐
│  React (Front-end)  │  9. TanStack Query invalida cache
│  Dashboard atualiza │  10. KPIs e lista recarregam
│  Toast: "Sucesso!"  │  11. Toast verde aparece
└─────────────────────┘
```

---

## 🚢 Deploy em Produção

### Opção 1: VPS (DigitalOcean, Hetzner, Contabo)

```bash
# No servidor
git clone <repo>
cp .env.example .env
# Editar .env com credenciais de produção
docker-compose -f docker-compose.prod.yml up -d
```

### Opção 2: Railway / Render

1. Conecte o repositório GitHub
2. Configure as variáveis de ambiente
3. Railway detecta o Docker Compose automaticamente

---

## 📅 Roadmap

- [x] Autenticação (JWT + RBAC)
- [x] CRUD Materiais + Categorias
- [x] Controle de Estoque (entrada/saída com transações)
- [x] Alertas estoque mínimo
- [x] Dashboard com KPIs
- [x] CRUD Caminhões
- [x] Ordens de Serviço (kanban)
- [ ] Movimentação automática de estoque via OS
- [ ] Módulo Financeiro
- [ ] Relatórios PDF/Excel
- [ ] Ordens de Compra
- [ ] Notificações real-time (WebSocket)
- [ ] App mobile (React Native)
- [ ] Integração IoT/telemetria
- [ ] Machine Learning (previsão de demanda)
