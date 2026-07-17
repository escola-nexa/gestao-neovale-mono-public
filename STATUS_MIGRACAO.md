# 🚀 Status da Migração (Supabase ➡️ NestJS)

Este documento serve para rastrearmos o andamento da migração baseada no `PLANO_MIGRACAO_API.md`. Atualize-o conforme as tarefas forem concluídas.

## 🟢 Fase 1: Infraestrutura e Setup do Banco (Concluído ✅)
- [x] Criar `docker-compose.yml` contendo os serviços `database` (PostgreSQL) e `minio` (Storage).
- [x] Subir o ambiente Docker local (com hot-reload mapeado via volumes para o backend).
- [x] Inicializar o backend em NestJS (`/backend`).
- [x] Gerar todos os módulos, controllers e services base do NestJS (`app.module.ts` atualizado).
- [x] Extrair a estrutura de tabelas do Supabase e converter para Entidades (`.entity.ts`) do TypeORM.
- [x] Configurar o banco de dados no TypeORM (`data-source.ts`) apontando para o Docker.
- [x] **Consolidação das Migrations:** Resolver o problema de sintaxe (`CREATE FUNCTION` / `RLS`) do Supabase fazendo o TypeORM gerar uma migration nativa e 100% limpa (`1781618098150-InitialSchema.ts`).
- [x] Aplicar a migration no banco local via TypeORM (182 tabelas criadas nativamente, sem RLS).
- [x] Criar e executar a rotina de Seeds (`users.seed.ts`), injetando a Organização, Usuário Admin (`admin@sigeo.com`) e Professor no banco local.

## 🟢 Fase 2: Módulos Core do Backend (Concluído ✅)
- [x] Configurar módulo de **Autenticação (`AuthModule`)** usando JWT e bcrypt.
- [x] Configurar a lógica de criptografia de senhas local para substituir a gestão nativa da tabela `auth.users` do Supabase.

## 🟢 Fase 3: Mapeamento do Frontend - Autenticação (Concluído ✅)
- [x] Trocar `supabase.auth.signInWithPassword` no frontend por uma chamada `POST /auth/login` (Axios/Fetch).
- [x] Armazenar o token JWT recebido do backend no `localStorage` ou `cookies`.
- [x] Configurar Interceptors (Axios/Fetch) no frontend para enviar o token JWT no header `Authorization: Bearer <token>` em todas as requisições autenticadas.
- [x] Adaptar o Contexto/State de Autenticação (`AuthProvider` do React) para ler o JWT em vez da sessão do Supabase.

## 🟢 Fase 4: Mapeamento do Frontend - Rotas de Negócio (Concluído ✅)
- [x] Criar no backend as rotas essenciais mapeando as tabelas principais do módulo Alunos (`GET /alunos`, `POST /alunos`, `GET /alunos/:id/enrollments`).
- [x] Substituir chamadas do SDK (`supabase.from('students')`) pelo `ApiAdapter` para listar, criar, editar e excluir alunos.
- [x] Mapear o módulo de Escolas (`GET /schools` e rotas agregadas construídas no NestJS).
- [x] Mapear o módulo de Turmas (`GET /class_groups`).
- [x] Mapear o módulo de Cursos (`GET /courses`).
- [x] **Estratégia Strangler Fig (PostgREST Local):** Subir container PostgREST local (`:3001`) apontando para o DB para emular a API do Supabase, permitindo que os +130 arquivos não migrados operem localmente sem tocar na produção.
- [x] Ajustar as interfaces (Tipagens Typescript) no frontend se a API retornar os dados com estrutura levemente diferente (Resolvido conflitos de Snake_Case vs CamelCase no módulo de Locais).
- [x] Implementar Hot-Reload para o frontend no `docker-compose.yml` (atualmente ele builda em modo produção no NGINX, ocultando atualizações em tempo de desenvolvimento).
- [x] Refatorar módulo de **Tickets** 100% abstraído para a API (`ticketsApi` + hooks), suportando arquitetura Provider-Agnostic (Supabase/NestJS).
- [x] Refatorar módulo de **Alunos** 100% abstraído para a API (`alunosApi`), removendo chamadas diretas de importação e buscas.
- [x] Refatorar módulo de **Boletins** 100% abstraído (`boletimApi`) suportando arquitetura Provider-Agnostic (Supabase/NestJS).
- [x] Refatorar módulo de **Notas** 100% abstraído (`notasApi`) suportando arquitetura Provider-Agnostic.
- [x] Refatorar módulo de **Frequência** 100% abstraído (`frequenciaApi`) suportando arquitetura Provider-Agnostic.
- [x] Refatorar módulo de **Presença de Professores** 100% abstraído (`substitutionApi` e UI limpa).
- [x] Refatorar módulo de **RH** (Configurações, Indicações, Alocações, etc.) 100% abstraído para a API (`hrApi`, `indicationLinksApi`), suportando arquitetura Provider-Agnostic.
- [x] Refatorar módulo de **Planejamento** 100% abstraído ().
- [x] Refatorar módulo de **Calendário** 100% abstraído ().
- [x] Refatorar módulo de **Chat / Comunicação** (Real-Time em Stub / Queries via API).
- [x] Refatorar módulo de **Configurações** 100% abstraído ().
- [x] Refatorar módulo de **Avaliações** (Lógica unificada em Notas/Boletins e padronizada para Provider-Agnostic).
- [x] Refatorar módulo de **Financeiro** 100% abstraído para a API (`financeiroApi`), suportando arquitetura Provider-Agnostic.
- [x] Refatorar módulo da **Dashboard Principal** 100% abstraído (`dashboardApi`).
- [x] Refatorar módulo de **B.I. (Business Intelligence)** 100% abstraído (`biApi`).
- [x] Refatorar **Hooks Globais e Estruturais** (`globalApi`, `calendarioApi`), limpando as dependências finais do SDK no Frontend.

## 🟢 Fase 5: Substituição do Storage (Concluído ✅)
- [x] Configurar o cliente AWS S3 no frontend. (Emulado via NestJS com MinIO Client)
- [x] Substituir `supabase.storage.from('bucket')` por chamadas ao MinIO / Backend (via ApiAdapter.storage).

## 🟢 Fase 6: Carga de Dados de Produção (Concluído ✅)
- [x] Criar script de extração (`extract-and-seed.js`) para ler dados do Supabase e gerar INSERTS para o banco local.
- [x] Obter credenciais de acesso com privilégios (Admin Login de Coordenação) para contornar o RLS do Supabase.
- [x] Rodar os `INSERT` das tabelas de domínio (`organizations`, `states`, `cities`, `schools`, `profiles`) no banco local.
- [x] Migrar arquivos e mídias do Storage (Script `backend/migrate-storage.js` executado com sucesso e todos os 15 buckets migrados para o MinIO local com mapeamento de underscores).

## 🟢 Fase 7: Desenvolvimento de Rotas no NestJS e Testes (Concluído ✅)
- [x] Implementar e testar Endpoints CRUD Módulo Alunos (`/alunos` -> `/students`).
- [x] Implementar e testar Endpoints Módulo Tickets (`/tickets`).
- [x] Implementar e testar Endpoints Módulo Escolas e Turmas (`/schools`, `/class-groups`).
- [x] Implementar e testar Endpoints Módulo Calendário e Planejamento.
- [x] Implementar e testar Endpoints Módulo de Avaliações (Boletins e Notas).
- [x] Implementar e testar Endpoints Módulo de Frequência e Presença.
- [x] Implementar e testar Endpoints Módulo de RH (Alocações, Indicações, Substituições).
- [x] Implementar e testar Endpoints Módulo Financeiro.
- [x] Implementar e testar Endpoints Módulo Dashboard e B.I.
- [x] Mapeamento e testes E2E com frontend apontado 100% para `VITE_API_PROVIDER=nestjs`.

## 🟢 Fase 8: QA e Correção de Bugs (Concluído ✅)
- [x] Validar mapeamento de payloads de autenticação (`ApiAdapter`) garantindo correspondência de perfis (Admin, Coordenador, Professor).
- [x] Refatorar consultas legadas do Supabase em `supabaseApi.ts` que quebravam no PostgREST/NestJS (remoção de `schools(*)`, `courses(*)`, etc.).
- [x] Reconstruir *mocks* e implementações limpas de APIs esvaziadas durante a migração (`dashboardApi`, `pendenciasApi`, `professorsApi`, `orientacoesApi`).
- [x] Corrigir ganchos de busca (ex: `useStudentDuplicates`) que chamavam diretamente funções RPC (`.rpc()`) do Supabase para direcionar ao `nestApi`.
- [x] Homologação E2E final em todos os módulos (Início, Cadastros e Rotina Pedagógica) garantindo zero erros 400 ou 500 no console.
