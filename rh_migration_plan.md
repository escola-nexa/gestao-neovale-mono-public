# Plano de Migração do Módulo RH (Recursos Humanos)

Assim como fizemos no módulo de Tickets, o objetivo aqui é eliminar as chamadas diretas ao cliente do `supabase` nos arquivos de UI e *hooks* do módulo de RH, transferindo essa responsabilidade para a camada de serviço isolada (`src/features/rh/api.ts` ou equivalentes com suporte ao `API_PROVIDER`).

## 1. Escopo de Arquivos Identificados

Uma varredura na pasta `src/features/rh` revelou os seguintes arquivos que dependem diretamente do `supabase`:

### Páginas (Pages / Tabs)
- [ ] `RhConfiguracoesPage.tsx` (Consultas e RPCs)
- [ ] `ExternalIndicationPage.tsx` (Vários RPCs para indicações externas)
- [ ] `AptosContratacaoDetailPage.tsx` (Storage e RPCs)
- [ ] `AptosContratacaoPage.tsx` (Listagem e Realtime)
- [ ] `RhLinksEscolasPage.tsx` (Tabelas de links e relatórios)
- [ ] `RhLinkConferirPage.tsx` (Mais de 10 referências, RPCs, Storage, Invoke Edge Functions)
- [ ] `tabs/SimuladorTab.tsx` (Consultas simples de RH)

### Hooks e Utils
- [ ] `useDraftAutoSave.ts` (RPC `save_indication_draft`)
- [ ] `useTeacherShiftWorkload.ts` (Consultas ativas de turmas)
- [ ] `lib/indicationLinksApi.ts` (Lógica de links usando `supabase.rpc`)
- [ ] `utils/schoolIndicationsPdf.ts` (Consultas isoladas p/ geração de PDF)

## 2. Estratégia de Refatoração

1. **Aprimoramento do `hrApi` e APIs do RH**: Identificar funções em `src/features/rh/api.ts` que já existem e criar as faltantes (especialmente aquelas relativas a RPCs pesados e rotinas de arquivo de admissão).
2. **Substituição Gradual nas Páginas**: Refatorar `RhConfiguracoesPage`, `RhLinksEscolasPage` e demais páginas principais.
3. **Casos Complexos**: `RhLinkConferirPage.tsx` possui invocações de *Edge Functions* (`generate-pre-plannings`) e dezenas de `supabase.rpc`. Terão que ser tratadas com cuidado, provavelmente quebrando a lógica de requisição para dentro de `rhApi`.

## 3. Próximo Passo

Começar a migração pelas páginas de listagem e configuração (`RhConfiguracoesPage.tsx` e `RhLinksEscolasPage.tsx`), estendendo `src/features/rh/api.ts` conforme necessário.
