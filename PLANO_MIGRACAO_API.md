# Plano de Execução: Migração Supabase para API NestJS (Monorepo)

Este documento detalha o planejamento arquitetural e prático para a substituição completa do Supabase por um backend proprietário em NestJS, utilizando PostgreSQL, TypeORM e Docker, garantindo retrocompatibilidade com o frontend atual.

---

## 1. Relatório de Viabilidade e Arquitetura

### A. Substituição do Supabase RLS (Row Level Security)
No Supabase, o RLS atua diretamente no banco de dados baseado no JWT. No NestJS, traremos essa responsabilidade para a **camada de aplicação**, garantindo flexibilidade e segurança:
1. **Autenticação:** Usaremos `@nestjs/jwt` e Passport. O JWT gerado terá o mesmo formato de payload que o frontend espera (contendo o `sub` como ID do usuário).
2. **Injeção de Contexto:** Um `JwtAuthGuard` global interceptará todas as requisições protegidas, validará o token e injetará o objeto `user` no objeto `Request` do Express/Fastify.
3. **Isolamento de Dados (Tenant/User Isolation):** Em vez de RLS no banco, os `Services` receberão o ID do usuário autenticado e aplicarão filtros obrigatórios no TypeORM (ex: `.andWhere('entity.user_id = :userId', { userId })`). Para tabelas multi-tenant (ex: academias), o isolamento será pelo `tenant_id`.
4. **Tradução de Contratos de API (Snake_Case vs CamelCase):** O SDK do Supabase retorna as colunas cruas (`snake_case`). O NestJS, ao serializar classes do TypeORM, retorna as propriedades mapeadas em `camelCase`. Durante a transição do Frontend, as interfaces e lógicas de mapping precisarão usar fallback (ex: `c.state_id || c.stateId`) até a conversão total.

### B. Armazenamento de Arquivos (MinIO vs Local)
**Decisão:** **Adotar o MinIO**.
* **Justificativa:** O frontend atual provavelmente utiliza a API S3-compatível do Supabase Storage (`supabase.storage.from()`). Utilizar o MinIO em um container Docker fornece uma API 100% compatível com o Amazon S3. Isso permite que, no frontend, precisemos apenas trocar a URL e o cliente (usando o SDK do AWS S3 para JS) sem mudar a lógica de buckets e uploads. Salvar no disco local exigiria reescrever toda a lógica de upload e servidão de arquivos estáticos no frontend e no backend.

### C. Desempenho e Cache (Redis)
**Decisão:** **Postergar o uso do Redis na Fase 1**.
* **Justificativa:** Para a transição inicial, adicionar o Redis aumenta a complexidade da infraestrutura. O PostgreSQL dá conta do recado para a maioria das queries da aplicação. A menos que existam websockets pesados (Realtime) ou processamento de background (como conversão de vídeos de atletas que demoram muito), a API REST NestJS padrão será suficiente. Caso precisemos de rate-limiting simples, o módulo `@nestjs/throttler` em memória resolverá na fase 1.

### D. Estratégia de Migração de Dados de Produção
Para migrar o banco de dados de produção do Supabase para o nosso novo banco limpo estruturado pelo NestJS/TypeORM, utilizaremos o modelo de **Data-Only Dump**.
1. **Extração (Supabase):** Será gerado um dump contendo exclusivamente os dados (`INSERT INTO`), ignorando schemas de auth, RLS e tabelas estruturais exclusivas do Supabase, rodando contra a URL de produção do Supabase:
   ```bash
   pg_dump --data-only --schema=public --format=plain --no-owner --no-acl --inserts -U postgres -h [HOST_DO_SUPABASE] sigeo_db > dados_producao.sql
   ```
2. **Carga (NestJS/PostgreSQL Local):** Como a `InitialSchema` gerada pelo TypeORM espelha perfeitamente as tabelas do Supabase (sem a camada RLS), esse arquivo `.sql` rodará de forma nativa e populando as tabelas limpas.
3. **Autenticação:** As senhas da tabela `auth.users` do Supabase serão exportadas à parte e inseridas diretamente na nossa tabela local de usuários (via script de seeding de senhas), mantendo o ecossistema transparente para os usuários finais.
4. **Arquivos e Mídias (Storage):** Os arquivos de produção armazenados nos buckets originais do Supabase serão transferidos via script customizado (`migrate-storage.js`) utilizando a SDK S3/MinIO e ajustando dinamicamente nomes de buckets com caracteres inválidos (conversão de `_` para `-`).

---

### E. Migração Gradual do Frontend (Strangler Fig Pattern)
**Decisão:** **Emular o Supabase localmente via PostgREST**.
* **Justificativa:** Como o Supabase utiliza PostgREST por baixo dos panos, adicionamos um container `postgrest/postgrest` no `docker-compose` local apontando para o nosso banco de dados. A `VITE_SUPABASE_URL` do frontend é alterada para este serviço local (`http://localhost:3001`). Isso permite que os arquivos que ainda usam `supabase.from()` funcionem imediatamente em desenvolvimento contra o banco de dados local, preservando os dados de produção e permitindo refatoração gradual para os controllers do NestJS.

---

## 2. Estrutura de Pastas (Padrão Monorepo / Multi-Service)

A aplicação seguirá o princípio de Responsabilidade Única (SOLID) e modularização estrita:

```text
sigeo-navigator/
├── frontend/                 # Aplicação React/Vite atual (Lovable)
├── docker-compose.yml        # Orquestração de todos os serviços
└── backend/                  # Monorepo NestJS
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── database/         # Arquivos de controle do banco de dados
    │   │   ├── migrations/   # Migrations do TypeORM (alterações estruturais)
    │   │   ├── scripts/      # Scripts SQL brutos (views, procedures)
    │   │   └── seeds/        # Scripts para popular dados iniciais
    │   ├── core/             # Interceptors, Guards, Filters, Decorators globais
    │   │   ├── auth/         # Estrutura global de Autenticação
    │   │   │   ├── guards/
    │   │   │   │   └── jwt-auth.guard.ts
    │   │   │   └── decorators/
    │   │   │       └── current-user.decorator.ts
    │   │   └── config/       # Configurações de Banco, MinIO, etc.
    │   └── modules/
    │       ├── auth/         # Login, Register, Refresh Token
    │       ├── storage/      # Serviço de integração com MinIO
    │       └── aluno/        # Exemplo de Módulo de Negócio
    │           ├── entities/
    │           │   └── aluno.entity.ts
    │           ├── dto/
    │           │   ├── create-aluno.dto.ts
    │           │   └── update-aluno.dto.ts
    │           ├── controllers/
    │           │   └── aluno.controller.ts
    │           ├── services/
    │           │   ├── create-aluno.service.ts
    │           │   ├── update-aluno.service.ts
    │           │   ├── delete-aluno.service.ts
    │           │   ├── find-aluno.service.ts
    │           │   └── list-alunos.service.ts
    │           └── aluno.module.ts
    ├── package.json
    └── tsconfig.json
```

---

## 3. Templates de Código

### A. Infraestrutura: `docker-compose.yml`
```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    container_name: sigeo_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
      POSTGRES_DB: sigeo_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - sigeo_network

  minio:
    image: minio/minio
    container_name: sigeo_minio
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: minio_password
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000" # API S3
      - "9001:9001" # Web Console
    volumes:
      - miniodata:/data
    networks:
      - sigeo_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sigeo_backend
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=database
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres_password
      - DB_NAME=sigeo_db
      - JWT_SECRET=super_secret_jwt_key
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
    depends_on:
      - database
      - minio
    networks:
      - sigeo_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sigeo_frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    networks:
      - sigeo_network

volumes:
  pgdata:
  miniodata:

networks:
  sigeo_network:
    driver: bridge
```

### B. Entity TypeORM: `aluno.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('alunos')
export class Aluno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string; // Relacionamento com o usuário dono/criador (Substitui RLS)

  @Column({ length: 150 })
  nome: string;

  @Column({ nullable: true })
  dataNascimento: Date;

  @Column({ nullable: true })
  posicao: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### C. Controller Múltiplos Services: `aluno.controller.ts`
```typescript
import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { CreateAlunoService } from '../services/create-aluno.service';
import { FindAlunoService } from '../services/find-aluno.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@Controller('alunos')
@UseGuards(JwtAuthGuard) // Protege todas as rotas
export class AlunoController {
  constructor(
    private readonly createAlunoService: CreateAlunoService,
    private readonly findAlunoService: FindAlunoService,
    // Outros services injetados aqui
  ) {}

  @Post()
  async create(@Body() createAlunoDto: CreateAlunoDto, @Request() req) {
    // req.user contém o ID extraído do JWT pelo Guard
    return this.createAlunoService.execute(createAlunoDto, req.user.id);
  }

  @Get()
  async findAll(@Request() req) {
    // Filtra apenas alunos do usuário logado (Simulação RLS)
    return this.findAlunoService.findAllByUser(req.user.id);
  }
}
```

### D. Exemplo de Service Isolado: `create-aluno.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../entities/aluno.entity';
import { CreateAlunoDto } from '../dto/create-aluno.dto';

@Injectable()
export class CreateAlunoService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
  ) {}

  async execute(dto: CreateAlunoDto, userId: string): Promise<Aluno> {
    const aluno = this.alunoRepository.create({
      ...dto,
      userId, // Associa o recurso ao tenant/usuário
    });
    
    return this.alunoRepository.save(aluno);
  }
}
```

### E. Auth Guard para simular Supabase Auth: `jwt-auth.guard.ts`
```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Aqui podemos adicionar lógicas customizadas antes de validar o JWT
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Se não houver usuário ou o token for inválido, lança erro
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou expirado.');
    }
    // O objeto `user` será populado no `req.user` para uso nos Controllers
    return user;
  }
}
```

---

## 4. Próximos Passos (Execução)
1. **Setup Inicial:** Criar o monorepo NestJS na pasta `/backend` e configurar o TypeORM. **Importante:** a propriedade `synchronize` do TypeORM deve ser configurada como `false` para garantir que o esquema do banco seja modificado exclusivamente pelos arquivos da pasta `database/migrations`.
2. **Infra:** Subir o `docker-compose up -d` com Postgres e MinIO para iniciar o desenvolvimento local.
3. **Módulo Auth:** Implementar o login retornando um token no mesmo formato que o frontend espera (armazenado via localStorage/cookies).
4. **Dívida Técnica Frontend:** Limpar dependências diretas do Supabase isolando chamadas em APIs de features e hooks agnósticos (`API_PROVIDER`). **100% dos Módulos e Hooks Isolados (Fase 4 Concluída).**
5. **Desenvolvimento de APIs NestJS:** Programação efetiva dos endpoints no backend NestJS para substituir o PostgREST emulado, testando módulo a módulo. **(Fase 7 Concluída).**
6. **QA e Homologação:** Validação End-to-End eliminando resquícios do Supabase SDK (como as queries aninhadas `!inner` que não rodam localmente) e adequação de mappings. **(Fase 8 Concluída).**
7. **Deploy Produção:** Subir a nova arquitetura para o ambiente Cloud de produção e desligar instâncias do Supabase antigas.
