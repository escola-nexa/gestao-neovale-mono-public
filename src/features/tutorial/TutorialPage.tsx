import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  School, Route, BookOpen, GraduationCap, Users, UserPlus,
  Calendar, Clock, FileText, MessageSquare, Settings,
  ArrowRight, CheckCircle2, ClipboardList, BarChart3,
  Sparkles, Eye, Send, PenTool, Shield, Upload,
  ListChecks, BookOpenCheck, Layers, Timer, CalendarDays,
  UserCheck, FileCheck, AlertTriangle, Info, Star,
  ChevronRight, Folder, FileUp, MousePointerClick,
  Clipboard, LayoutGrid, Target, Lightbulb,
  Link2, Bell, Activity, Search, Download, Printer,
  TrendingUp, AlertCircle, Globe, Key, Share2, UserCog,
  Lock, Gauge, MapPin, Filter, FileBarChart,
  ClipboardCheck, Zap, Brain, Table2, Home
} from 'lucide-react';

const setupSteps = [
  { label: 'Escolas', icon: School, color: 'bg-blue-500' },
  { label: 'Itinerários', icon: Route, color: 'bg-purple-500' },
  { label: 'Cursos', icon: BookOpen, color: 'bg-emerald-500' },
  { label: 'Disciplinas', icon: GraduationCap, color: 'bg-amber-500' },
  { label: 'Turmas', icon: Users, color: 'bg-cyan-500' },
  { label: 'Professores', icon: UserCheck, color: 'bg-pink-500' },
  { label: 'Alunos', icon: UserPlus, color: 'bg-indigo-500' },
  { label: 'Calendário', icon: Calendar, color: 'bg-orange-500' },
  { label: 'Grade Horária', icon: Clock, color: 'bg-teal-500' },
];

interface TutorialStep {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  tip?: string;
}

interface TutorialSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  steps: TutorialStep[];
}

const tutorialSections: TutorialSection[] = [
  // ===== ACADÊMICO =====
  {
    id: 'escolas',
    title: 'Escolas',
    subtitle: 'Hub central: gerencie escolas, cursos, turmas, alunos e professores',
    icon: School,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Escolas" no menu lateral', description: 'No menu lateral, na seção ACADÊMICO, clique em "Escolas". Você verá a lista de todas as escolas cadastradas.', icon: MousePointerClick },
      { title: 'Crie uma nova escola', description: 'Clique em "Nova Escola" e preencha: código, nome, endereço, cidade, telefone, e-mail e diretor(a).', icon: School },
      { title: 'Acesse o detalhe da escola', description: 'Clique no nome da escola para abrir o Hub da Escola, onde você gerencia tudo relacionado àquela unidade.', icon: Eye },
      { title: 'Cursos da escola', description: 'Dentro do detalhe da escola, acesse "Cursos" para vincular cursos existentes ou ver os já vinculados.', icon: BookOpen },
      { title: 'Turmas da escola', description: 'Acesse "Turmas" para criar e gerenciar turmas. Cada turma é vinculada a um curso da escola.', icon: Users },
      { title: 'Alunos da escola', description: 'Acesse "Alunos" para cadastrar individualmente, importar em massa via planilha ou gerenciar matrículas.', icon: UserPlus },
      { title: 'Professores da escola', description: 'Acesse "Professores" para ver os docentes vinculados à escola.', icon: UserCheck },
      { title: 'Horários da escola', description: 'Acesse "Horários" para configurar os slots de tempo (horários de aula) de cada dia da semana.', icon: Timer, tip: 'A escola é o ponto central do sistema. Cursos, turmas, alunos e horários são todos gerenciados a partir dela.' },
    ],
  },
  {
    id: 'itinerarios',
    title: 'Itinerários Formativos',
    subtitle: 'Organize os eixos de formação e acesse cursos por itinerário',
    icon: Route,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Itinerários Formativos" no menu lateral', description: 'No menu lateral, na seção ACADÊMICO, clique em "Itinerários Formativos".', icon: MousePointerClick },
      { title: 'Crie um novo itinerário', description: 'Clique em "Novo Itinerário" e informe o nome e uma descrição do eixo formativo.', icon: Route },
      { title: 'Acesse os cursos do itinerário', description: 'Clique no itinerário para ver todos os cursos vinculados a ele. De lá, você pode criar novos cursos ou acessar disciplinas.', icon: BookOpen, tip: 'Itinerários → Cursos → Disciplinas: essa é a hierarquia de navegação acadêmica do sistema.' },
    ],
  },
  {
    id: 'cursos',
    title: 'Cursos',
    subtitle: 'Gerencie cursos, vincule escolas e configure disciplinas',
    icon: BookOpen,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse cursos via Itinerários ou Escolas', description: 'Cursos não ficam no menu lateral. Acesse por: Itinerários → clique no itinerário → Cursos. Ou: Escolas → detalhe da escola → Cursos.', icon: MousePointerClick },
      { title: 'Crie um novo curso', description: 'Clique em "Novo Curso" e informe: código, nome, nível de ensino (Médio, Técnico, etc.), itinerário e descrição.', icon: BookOpen },
      { title: 'Vincule escolas ao curso', description: 'Clique no ícone de "Escolas" do curso para vincular a uma ou mais unidades escolares.', icon: School, tip: 'Um mesmo curso pode ser oferecido em várias escolas. A desvinculação só é permitida se não houver professores ou alunos ativos.' },
      { title: 'Acesse as disciplinas', description: 'Clique no ícone de "Disciplinas" do curso para gerenciar as matérias. Cada disciplina pertence a um curso.', icon: GraduationCap },
    ],
  },
  {
    id: 'disciplinas',
    title: 'Disciplinas',
    subtitle: 'Configure matérias com carga horária e conteúdo semanal',
    icon: GraduationCap,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse disciplinas via Cursos', description: 'Disciplinas não ficam no menu lateral. Acesse: Itinerários → Cursos → ícone de Disciplinas do curso. Ou: Escolas → Cursos → Disciplinas.', icon: MousePointerClick },
      { title: 'Crie uma nova disciplina', description: 'Informe: código, nome, nome para boletim, carga horária semanal, total de aulas e semestre (1º, 2º ou Anual).', icon: GraduationCap },
      { title: 'Configure o Calendário Semanal', description: 'Clique no ícone de calendário (📅) da disciplina para definir o conteúdo pedagógico semana a semana por bimestre.', icon: CalendarDays },
      { title: 'Preencha os 8 campos pedagógicos', description: 'Em cada semana: Objetivo, Competências, Conteúdos, Metodologia, Recursos, Avaliação, Produto e Próximas Ações.', icon: ClipboardList },
      { title: 'Adicione materiais de aula', description: 'Na seção "Aulas Planejadas", adicione vídeos, PDFs, apresentações e links como material de apoio.', icon: FileUp, tip: 'Preencha o calendário semanal ANTES de gerar pré-planejamentos. O conteúdo será clonado automaticamente!' },
    ],
  },
  {
    id: 'turmas',
    title: 'Turmas',
    subtitle: 'Crie turmas vinculadas a escolas e cursos',
    icon: Users,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse turmas via Escolas', description: 'Turmas não ficam no menu lateral. Acesse: Escolas → detalhe da escola → aba "Turmas".', icon: MousePointerClick },
      { title: 'Crie uma nova turma', description: 'Informe o nome (ex: "1º Ano A") e o ano letivo (ex: 2026). Selecione o curso.', icon: Users },
      { title: 'A turma herda disciplinas do curso', description: 'Ao vincular a um curso, a turma automaticamente terá acesso às disciplinas cadastradas naquele curso.', icon: Link2, tip: 'A turma é o elo entre escola, curso, professores e alunos. Sem turma, não há planejamento, frequência nem notas.' },
    ],
  },
  // ===== PESSOAS =====
  {
    id: 'professores',
    title: 'Professores',
    subtitle: 'Cadastre docentes e configure vínculos acadêmicos',
    icon: UserCheck,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Professores" no menu lateral', description: 'No menu lateral, na seção ACADÊMICO, clique em "Professores".', icon: MousePointerClick },
      { title: 'Crie um novo professor', description: 'Informe: nome completo, CPF, telefone, matrícula e especialização. Uma conta de usuário (login) será criada automaticamente.', icon: UserCheck },
      { title: 'Configure os vínculos', description: 'Clique em "Vínculos" para associar o professor a escolas e cursos. Isso define onde ele aparece na grade horária.', icon: Link2, tip: 'Um professor pode estar vinculado a múltiplas escolas e cursos. O professor só verá dados das escolas/cursos em que está vinculado.' },
      { title: 'Perfil detalhado', description: 'Clique no nome do professor para ver perfil completo com vínculos, planejamentos, frequência e orientações.', icon: Eye },
    ],
  },
  {
    id: 'alunos',
    title: 'Alunos',
    subtitle: 'Cadastre alunos, importe em massa e gerencie matrículas',
    icon: UserPlus,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse alunos via Escolas', description: 'Alunos são gerenciados dentro de cada escola: Escolas → detalhe da escola → aba "Alunos".', icon: MousePointerClick },
      { title: 'Cadastro individual', description: 'Use "Novo Aluno" e preencha: nome completo, data de nascimento, código de matrícula, nome da mãe, contato e endereço.', icon: ClipboardList },
      { title: 'Importação em massa', description: 'Use "Importar" para importar alunos via planilha CSV/Excel. O sistema valida e mostra erros por linha.', icon: Upload },
      { title: 'Realize a matrícula', description: 'Clique em "Matrículas" no aluno e vincule a uma escola, curso, turma e ano letivo.', icon: FileCheck, tip: 'Sem matrícula ativa, o aluno NÃO aparece na chamada de frequência nem no lançamento de notas.' },
      { title: 'Busca global', description: 'Use a rota /alunos para localizar qualquer aluno pelo nome ou código em todas as escolas.', icon: Search },
      { title: 'Histórico de importações', description: 'Acesse o histórico de importações de cada escola para ver lotes, status e detalhes.', icon: FileBarChart },
    ],
  },
  // ===== PEDAGÓGICO =====
  {
    id: 'planejamento',
    title: 'Planejamento Pedagógico',
    subtitle: 'Gere pré-planejamentos, preencha, revise e assine digitalmente',
    icon: FileText,
    badge: 'Coordenador / Professor',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    steps: [
      { title: 'Acesse "Planejamento" no menu lateral', description: 'No menu lateral, na seção PEDAGÓGICO, clique em "Planejamento".', icon: MousePointerClick },
      { title: 'Geração em Massa (Coordenador)', description: 'Clique em "Gerar Pré-Planejamentos". Selecione Escola → Curso → Turma → Bimestre. O sistema exibe checklist de professores/disciplinas.', icon: Sparkles },
      { title: 'Clonagem automática', description: 'O sistema copia o conteúdo do Calendário Semanal da disciplina (materiais + 8 campos pedagógicos) para cada semana automaticamente.', icon: Clipboard, tip: 'Preencha o Calendário Semanal da disciplina ANTES de gerar para que os dados sejam clonados!' },
      { title: 'Professor preenche', description: 'O professor visualiza seus pré-planejamentos e pode editar/complementar os campos pedagógicos.', icon: PenTool },
      { title: 'Envio e revisão', description: 'O professor envia para revisão. O coordenador pode aprovar, devolver com feedback ou editar. O histórico de feedback fica registrado.', icon: Send },
      { title: 'Assinatura digital', description: 'Após aprovação, professor e coordenador assinam digitalmente (com foto + geolocalização). O documento torna-se imutável.', icon: Shield },
      { title: 'Cards de acompanhamento', description: 'Os cards no topo mostram contagem de planejamentos: rascunhos, enviados, devolvidos, aguardando assinatura e assinados.', icon: BarChart3 },
    ],
  },
  {
    id: 'frequencia',
    title: 'Frequência / Chamada',
    subtitle: 'Registre presença e faltas por hora-aula com alertas automáticos',
    icon: ClipboardList,
    badge: 'Professor',
    badgeColor: 'bg-amber-100 text-amber-700',
    steps: [
      { title: 'Acesse "Frequência" no menu lateral', description: 'No menu lateral, seção PEDAGÓGICO, clique em "Frequência". A seção "Minhas Aulas Hoje" aparece no topo.', icon: MousePointerClick },
      { title: 'Aulas de hoje (atalho)', description: 'Clique em qualquer aula listada em "Minhas Aulas Hoje" para abrir diretamente a chamada. Cada card mostra o resumo da chamada.', icon: Zap },
      { title: 'Filtros manuais', description: 'Ou use os filtros: Escola → Curso → Turma → Disciplina para acessar qualquer chamada.', icon: Filter },
      { title: 'Registre a presença', description: 'Clique no status de cada aluno para alternar: Presente (P) → Falta (F) → Abono (A). O estado é cíclico.', icon: ListChecks },
      { title: 'Chamada por hora-aula', description: 'A frequência é registrada por cada hora-aula individualmente, permitindo múltiplos registros por dia.', icon: Clock },
      { title: 'Salve a chamada', description: 'Clique em "Salvar". O sistema exibe resumo imediato (ex: "2 faltas de 30 alunos").', icon: CheckCircle2 },
      { title: 'Alertas de frequência', description: 'Na aba "Alertas", visualize alunos com frequência abaixo de 75%. Amarelo para 20-25% de faltas e vermelho para 25%+.', icon: AlertCircle, tip: 'O sistema trava a navegação se houver alterações não salvas, evitando perda de dados.' },
    ],
  },
  {
    id: 'notas',
    title: 'Notas',
    subtitle: 'Configure avaliações, lance notas e feche bimestres',
    icon: BarChart3,
    badge: 'Professor',
    badgeColor: 'bg-amber-100 text-amber-700',
    steps: [
      { title: 'Acesse "Notas" no menu lateral', description: 'No menu lateral, seção PEDAGÓGICO, clique em "Notas". Selecione escola, curso, turma, disciplina e bimestre.', icon: MousePointerClick },
      { title: 'Configure as atividades', description: 'Defina as atividades avaliativas (provas, trabalhos, participação) com pontuação máxima e tipo de média.', icon: Target },
      { title: 'Lance as notas', description: 'Preencha a nota de cada aluno na grade de lançamento. A média é calculada automaticamente.', icon: PenTool },
      { title: 'Panorama geral', description: 'Na aba "Panorama", veja a matriz de notas de todas as disciplinas da turma no bimestre.', icon: Table2 },
      { title: 'Feche o bimestre', description: 'Após lançar todas as notas, feche o bimestre. O status muda para "CLOSED" e as notas ficam protegidas.', icon: Lock, tip: 'O fechamento do bimestre é obrigatório para que as notas apareçam no portal externo e nos boletins.' },
    ],
  },
  {
    id: 'boletins',
    title: 'Boletins',
    subtitle: 'Gere boletins individuais e relatórios gerais com PDF oficial',
    icon: FileBarChart,
    badge: 'Todos os perfis',
    badgeColor: 'bg-gray-100 text-gray-700',
    steps: [
      { title: 'Acesse "Boletins" no menu lateral', description: 'No menu lateral, seção PEDAGÓGICO, clique em "Boletins". Selecione escola, curso e turma.', icon: MousePointerClick },
      { title: 'Selecione os bimestres', description: 'Escolha quais bimestres incluir (1 a 4). Pode selecionar múltiplos para boletim consolidado.', icon: CalendarDays },
      { title: 'Boletim Individual', description: 'Visualize o boletim de cada aluno com notas e faltas por disciplina. Navegue entre alunos.', icon: UserCheck },
      { title: 'Relatório Geral da Turma', description: 'Visualize o relatório consolidado com todos os alunos e disciplinas.', icon: Table2 },
      { title: 'Gere o PDF', description: 'Clique em "Gerar PDF". O boletim individual gera TODOS os alunos em um único PDF (um por página).', icon: Download, tip: 'O PDF segue o padrão institucional Neovale com cabeçalho, escola, curso, turma, itinerário e data de emissão.' },
    ],
  },
  {
    id: 'orientacoes',
    title: 'Orientações Pedagógicas',
    subtitle: 'Envie orientações, acompanhe evidências e assine',
    icon: MessageSquare,
    badge: 'Coordenador / Professor',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    steps: [
      { title: 'Acesse "Orientações" no menu lateral', description: 'No menu lateral, seção PEDAGÓGICO, clique em "Orientações".', icon: MousePointerClick },
      { title: 'Crie uma orientação (Coordenador)', description: 'Clique em "Nova Orientação". Selecione professor, escola, disciplina, tipo e descreva detalhadamente.', icon: MessageSquare },
      { title: 'Tipos disponíveis', description: 'Orientação de Planejamento, de Aula, Pedagógica Geral, entre outros.', icon: Layers },
      { title: 'Agende data e hora', description: 'Defina data, horário e local. Opcionalmente, adicione link de videochamada.', icon: CalendarDays },
      { title: 'Professor responde', description: 'O professor recebe notificação, visualiza a orientação e envia evidências (fotos, documentos).', icon: Upload },
      { title: 'Aprovação ou rejeição', description: 'O coordenador analisa evidências e pode assinar (aprovar), rejeitar com justificativa ou cancelar.', icon: FileCheck, tip: 'Orientações assinadas geram PDF oficial. O sistema notifica automaticamente o professor.' },
    ],
  },
  {
    id: 'grade-horaria',
    title: 'Grade Horária',
    subtitle: 'Monte horários de aula e gere ocorrências para o ano',
    icon: Clock,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Grade Horária" no menu lateral', description: 'No menu lateral, seção PEDAGÓGICO, clique em "Grade Horária".', icon: MousePointerClick },
      { title: 'Configure horários da escola', description: 'Acesse "Horários da Escola" para definir os slots de tempo (hora de início e fim) de cada dia da semana.', icon: Timer },
      { title: 'Monte a grade semanal', description: 'Na tela principal, selecione: Escola → Curso → Turma → Semestre. Atribua disciplinas e professores a cada slot.', icon: LayoutGrid },
      { title: 'Conflitos automáticos', description: 'O sistema detecta automaticamente se um professor já está em outra turma no mesmo horário.', icon: AlertTriangle },
      { title: 'Gere as aulas do ano', description: 'O sistema gera todas as ocorrências de aula para o ano, respeitando calendário letivo e feriados.', icon: Sparkles },
      { title: 'Planejamento do Professor', description: 'Em "Planejamento do Professor", defina horários de planejamento (preparo) para cada docente.', icon: FileText, tip: 'A grade horária precisa estar montada ANTES de gerar pré-planejamentos.' },
    ],
  },
  // ===== CALENDÁRIO =====
  {
    id: 'calendario',
    title: 'Calendário Acadêmico',
    subtitle: 'Defina ano letivo, bimestres, feriados e dias letivos',
    icon: CalendarDays,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Calendário Acadêmico" no menu lateral', description: 'No menu lateral, seção CALENDÁRIO, clique em "Calendário Acadêmico".', icon: MousePointerClick },
      { title: 'Crie o calendário anual', description: 'Clique em "Novo Calendário", selecione o ano e defina as datas de início e fim do ano letivo.', icon: Calendar },
      { title: 'Defina os 4 bimestres', description: 'Adicione os 4 bimestres com datas de início e fim. O sistema valida sobreposições.', icon: Layers },
      { title: 'Cadastre feriados e eventos', description: 'Adicione feriados, recessos e eventos especiais. Esses dias são descontados da contagem de aulas.', icon: CalendarDays },
      { title: 'Popule dias letivos', description: 'Use "Popular Dias Letivos" para gerar automaticamente todos os dias úteis (segunda a sexta).', icon: Sparkles },
      { title: 'Ative o calendário', description: 'Altere para "Ativo". Só pode haver 1 calendário ativo por vez.', icon: CheckCircle2, tip: 'O calendário ATIVO é pré-requisito para grade horária, planejamentos e contagem de aulas.' },
    ],
  },
  // ===== ACOMPANHAMENTO =====
  {
    id: 'bi',
    title: 'B.I. (Business Intelligence)',
    subtitle: '19 painéis analíticos: rankings, riscos, insights e recomendações',
    icon: Brain,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "B.I." no menu lateral', description: 'No menu lateral, seção ACOMPANHAMENTO, clique em "B.I.". O hub mostra cards para todos os painéis.', icon: MousePointerClick },
      { title: 'Visão Executiva', description: 'KPIs gerais: professores ativos, conformidade, riscos e pendências por escola.', icon: Gauge },
      { title: 'Planejamento, Frequência e Notas', description: 'Painéis dedicados com métricas específicas de cada módulo operacional.', icon: BarChart3 },
      { title: 'Rankings', description: 'Rankings de professores, escolas e cidades por conformidade, planejamento, frequência e notas.', icon: TrendingUp },
      { title: 'Riscos e Previsões', description: 'Identifique riscos pedagógicos com base em dados históricos e projeções.', icon: AlertTriangle },
      { title: 'Insights e Recomendações', description: 'O sistema gera automaticamente insights e recomendações de ação.', icon: Lightbulb },
      { title: 'Escolas e Cidades', description: 'Visão geográfica com drill-down por escola e cidade.', icon: MapPin },
      { title: 'Relatórios e Exportação', description: 'Exporte em PDF e Excel com os filtros aplicados.', icon: Download, tip: 'O B.I. utiliza snapshots históricos para tendências e projeções de curto prazo.' },
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoria de Acesso',
    subtitle: 'Monitore adesão, engajamento e uso da plataforma',
    icon: Shield,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Auditoria de Acesso" no menu lateral', description: 'No menu lateral, seção ACOMPANHAMENTO, clique em "Auditoria de Acesso".', icon: MousePointerClick },
      { title: 'KPIs de adesão', description: 'Total de usuários, ativos hoje, nos últimos 7/30 dias, nunca acessaram e inativos.', icon: Gauge },
      { title: 'Lista de usuários', description: 'Em "Usuários", veja nome, perfil, escola, último acesso, total de acessos, dias sem acesso e classificação.', icon: Users },
      { title: 'Classificações automáticas', description: 'Acesso hoje, Ativo regularmente, Baixa frequência, Inativo há 7/15/30/60/90+ dias e Situação crítica.', icon: TrendingUp },
      { title: 'Detalhe por usuário', description: 'Clique no nome para ver timeline de eventos, módulos usados, horários de uso e engajamento.', icon: Eye, tip: 'Use a auditoria para cobrar adesão e identificar quem precisa de acompanhamento.' },
    ],
  },
  // ===== ADMINISTRAÇÃO =====
  {
    id: 'compartilhamento',
    title: 'Compartilhamento Externo',
    subtitle: 'Portal público para consulta de planejamentos, notas e boletins',
    icon: Share2,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Compartilhamento" no menu lateral', description: 'No menu lateral, seção ADMINISTRAÇÃO, clique em "Compartilhamento".', icon: MousePointerClick },
      { title: 'Configure a palavra-chave', description: 'Na aba "Palavras-chave", crie uma palavra-chave trimestral por escola. Protege o acesso externo.', icon: Key },
      { title: 'Crie links externos', description: 'Na aba "Links Externos", gere links públicos por escola. Defina tipo de conteúdo, datas e escopo.', icon: Link2 },
      { title: 'Compartilhe o link', description: 'Copie o link gerado e envie. O visitante acessa sem login, usando a palavra-chave.', icon: Globe },
      { title: 'Portal do visitante', description: 'O visitante pode filtrar por turma, disciplina, aluno e bimestre. Visualiza e baixa PDFs oficiais.', icon: Search },
      { title: 'Monitore acessos', description: 'Na aba "Registro de Acessos", veja IP, cidade, dispositivo e status de cada acesso.', icon: Activity, tip: 'O sistema limita 10 tentativas por IP a cada 5 min para proteção contra ataques.' },
    ],
  },
  {
    id: 'usuarios',
    title: 'Usuários',
    subtitle: 'Crie contas e gerencie perfis de acesso',
    icon: Settings,
    badge: 'Admin / Coordenador',
    badgeColor: 'bg-purple-100 text-purple-700',
    steps: [
      { title: 'Acesse "Usuários" no menu lateral', description: 'No menu lateral, seção ADMINISTRAÇÃO, clique em "Usuários".', icon: MousePointerClick },
      { title: 'Crie um novo usuário', description: 'Clique em "Novo Usuário". Informe nome, e-mail, telefone e perfil de acesso.', icon: UserPlus },
      { title: 'Perfis disponíveis', description: '🔴 Administrador: acesso total. 🔵 Coordenador: gerencia planejamentos e cadastros. 🟡 Professor: acessa apenas seus dados.', icon: Shield },
      { title: 'Indicador de acesso', description: 'Usuários que nunca acessaram são sinalizados com badge "Nunca acessou" em vermelho.', icon: AlertCircle },
      { title: 'Redefinição de senha', description: 'Administradores podem redefinir a senha de qualquer usuário.', icon: Lock, tip: 'Professores só veem dados vinculados ao seu perfil. Coordenadores só criam outros coordenadores e professores.' },
    ],
  },
  {
    id: 'estados-cidades',
    title: 'Estados e Cidades',
    subtitle: 'Configure a localização geográfica das escolas',
    icon: MapPin,
    badge: 'Administrador',
    badgeColor: 'bg-red-100 text-red-700',
    steps: [
      { title: 'Acesse "Estados e Cidades" no menu lateral', description: 'No menu lateral, seção ADMINISTRAÇÃO, clique em "Estados e Cidades".', icon: MousePointerClick },
      { title: 'Cadastre estados', description: 'Adicione os estados onde a rede de ensino atua.', icon: MapPin },
      { title: 'Cadastre cidades', description: 'Dentro de cada estado, cadastre as cidades para vincular às escolas.', icon: MapPin, tip: 'As cidades aparecem nos filtros do B.I. e nos relatórios por região.' },
    ],
  },
  // ===== INÍCIO =====
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Visão geral personalizada por perfil de acesso',
    icon: Home,
    badge: 'Todos os perfis',
    badgeColor: 'bg-gray-100 text-gray-700',
    steps: [
      { title: 'Tela inicial', description: 'Ao fazer login, o Dashboard é a tela inicial com informações relevantes para seu perfil.', icon: Home },
      { title: 'Cards de resumo', description: 'Contadores de escolas, turmas, professores, alunos e planejamentos.', icon: BarChart3 },
      { title: 'Minhas aulas hoje (Professor)', description: 'Professores veem suas aulas do dia com acesso rápido à frequência.', icon: Clock },
      { title: 'Pendências do coordenador', description: 'Planejamentos aguardando revisão e orientações pendentes.', icon: ClipboardCheck },
      { title: 'Contagem regressiva do bimestre', description: 'Quantos dias faltam para o fim do bimestre atual.', icon: Timer },
      { title: 'Ações rápidas', description: 'Atalhos para funcionalidades mais usadas do seu perfil.', icon: Zap, tip: 'O Dashboard adapta seu conteúdo automaticamente conforme o perfil do usuário logado.' },
    ],
  },
  {
    id: 'pendencias',
    title: 'Pendências',
    subtitle: 'Central com tudo que precisa de ação no sistema',
    icon: ListChecks,
    badge: 'Todos os perfis',
    badgeColor: 'bg-gray-100 text-gray-700',
    steps: [
      { title: 'Acesse "Pendências" no menu lateral', description: 'No menu lateral, seção INÍCIO, clique em "Pendências" (ou "Minhas Pendências" para professores).', icon: MousePointerClick },
      { title: 'Cards executivos', description: 'Total de pendências, críticas, vencidas, do dia e resolvidas recentemente.', icon: BarChart3 },
      { title: 'Tipos de pendência', description: 'Planejamentos em rascunho/devolvidos, aguardando assinatura/revisão, orientações pendentes, frequências não lançadas, notas pendentes.', icon: ClipboardList },
      { title: 'Prioridades automáticas', description: 'Crítica (vermelho), Alta (laranja), Média (amarelo) ou Baixa (azul).', icon: AlertCircle },
      { title: 'Ações rápidas', description: 'Clique em "Resolver" para ir diretamente à tela onde a ação precisa ser realizada.', icon: Zap, tip: 'A Central de Pendências é a forma mais rápida de saber "o que fazer agora" no sistema.' },
    ],
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    subtitle: 'Alertas automáticos sobre eventos do sistema',
    icon: Bell,
    badge: 'Todos os perfis',
    badgeColor: 'bg-gray-100 text-gray-700',
    steps: [
      { title: 'Clique no sino', description: 'No canto superior direito, clique no ícone de sino para ver suas notificações.', icon: Bell },
      { title: 'Tipos de notificação', description: 'Orientações criadas, planejamentos devolvidos, atualizações de status e lembretes.', icon: AlertCircle },
      { title: 'Marque como lida', description: 'Marque individualmente ou use "Marcar todas como lidas".', icon: CheckCircle2, tip: 'Notificações são geradas automaticamente pelo sistema quando eventos relevantes ocorrem.' },
    ],
  },
  {
    id: 'perfil',
    title: 'Meu Perfil',
    subtitle: 'Visualize seus dados pessoais e vínculos acadêmicos',
    icon: UserCog,
    badge: 'Todos os perfis',
    badgeColor: 'bg-gray-100 text-gray-700',
    steps: [
      { title: 'Acesse "Meu Perfil" no menu lateral', description: 'No menu lateral, seção CONTA, clique em "Meu Perfil".', icon: MousePointerClick },
      { title: 'Dados pessoais', description: 'Nome, e-mail, telefone e dados cadastrais.', icon: UserCheck },
      { title: 'Informações profissionais', description: 'Especialização, matrícula, CPF e vínculos acadêmicos (escolas e cursos).', icon: GraduationCap },
      { title: 'Resumo de atividades', description: 'Cards com estatísticas: planejamentos, orientações, turmas e disciplinas.', icon: BarChart3 },
    ],
  },
];

const roleGuide = [
  {
    role: 'Administrador',
    icon: Shield,
    color: 'border-red-200 bg-red-50',
    iconColor: 'text-red-600',
    access: [
      'Acesso total ao sistema',
      'Gerencia usuários e permissões',
      'Configura escolas, cursos e turmas',
      'Visualiza todos os dados de todas as escolas',
      'Acessa B.I. completo e auditoria',
      'Gerencia compartilhamento externo',
      'Deleta registros de acesso externo',
    ],
  },
  {
    role: 'Coordenador',
    icon: BookOpenCheck,
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'text-blue-600',
    access: [
      'Cria pré-planejamentos e revisa planejamentos',
      'Envia e gerencia orientações pedagógicas',
      'Gerencia cadastros de alunos e professores',
      'Acessa B.I. e auditoria por escopo',
      'Visualiza boletins e relatórios',
      'Configura compartilhamento externo',
    ],
  },
  {
    role: 'Professor',
    icon: GraduationCap,
    color: 'border-amber-200 bg-amber-50',
    iconColor: 'text-amber-600',
    access: [
      'Preenche planejamentos atribuídos',
      'Registra frequência (chamada por hora-aula)',
      'Lança notas dos alunos',
      'Vê apenas seus próprios dados vinculados',
      'Responde orientações com evidências',
      'Assina planejamentos digitalmente',
    ],
  },
];

const sectionGroups = [
  { label: 'Acadêmico (menu lateral)', ids: ['escolas', 'itinerarios', 'professores'], color: 'text-blue-600' },
  { label: 'Hierarquia: Escola → Cursos → Disciplinas → Turmas → Alunos', ids: ['cursos', 'disciplinas', 'turmas', 'alunos'], color: 'text-emerald-600' },
  { label: 'Pedagógico (menu lateral)', ids: ['planejamento', 'frequencia', 'notas', 'boletins', 'orientacoes', 'grade-horaria'], color: 'text-purple-600' },
  { label: 'Calendário (menu lateral)', ids: ['calendario'], color: 'text-orange-600' },
  { label: 'Acompanhamento (menu lateral)', ids: ['bi', 'auditoria'], color: 'text-indigo-600' },
  { label: 'Administração (menu lateral)', ids: ['compartilhamento', 'usuarios', 'estados-cidades'], color: 'text-red-600' },
  { label: 'Início e Sistema', ids: ['dashboard', 'pendencias', 'notificacoes', 'perfil'], color: 'text-gray-600' },
];

export default function TutorialPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Tutorial' }]}
        title="Manual do Sistema"
        description="Guia completo para usar todas as funcionalidades da Neovale"
        icon={BookOpen}
        variant="hero"
      />

      {/* Quick Role Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Perfis de Acesso
          </CardTitle>
          <CardDescription>Entenda o que cada tipo de usuário pode fazer no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleGuide.map((r) => (
              <div key={r.role} className={`rounded-xl border p-4 ${r.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <r.icon className={`w-5 h-5 ${r.iconColor}`} />
                  <h3 className="font-semibold text-sm">{r.role}</h3>
                </div>
                <ul className="space-y-1.5">
                  {r.access.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Order */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Ordem de Configuração Inicial
          </CardTitle>
          <CardDescription>Siga esta sequência obrigatória para configurar o sistema corretamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {setupSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${step.color} text-white text-xs font-bold`}>
                    {index + 1}
                  </span>
                  <step.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                {index < setupSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Importante:</strong> Essa ordem é obrigatória! Cursos, disciplinas, turmas e alunos são acessados dentro de Escolas ou Itinerários — eles não ficam no menu lateral.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Como Navegar no Sistema
          </CardTitle>
          <CardDescription>Entenda a estrutura de navegação da Neovale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-blue-50/50 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-blue-800">Menu Lateral (acesso direto)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Dashboard', 'Pendências', 'Escolas', 'Itinerários', 'Professores', 'Planejamento', 'Frequência', 'Notas', 'Boletins', 'Orientações', 'Grade Horária', 'Calendário', 'B.I.', 'Auditoria', 'Compartilhamento', 'Usuários', 'Meu Perfil'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-blue-700">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-amber-50/50 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-amber-800">Acessados dentro de outros módulos</h4>
            <div className="space-y-2 text-xs text-amber-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cursos:</span>
                <span>Itinerários → Cursos <strong>ou</strong> Escolas → Cursos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Disciplinas:</span>
                <span>Cursos → Disciplinas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Turmas:</span>
                <span>Escolas → Turmas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Alunos:</span>
                <span>Escolas → Alunos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Horários:</span>
                <span>Escolas → Horários <strong>ou</strong> Grade Horária → Horários da Escola</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Fluxo de Trabalho Resumido
          </CardTitle>
          <CardDescription>Visão geral do ciclo completo de uso do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { step: '1', title: 'Cadastros', desc: 'Escolas, itinerários, cursos, disciplinas, turmas, professores e alunos', icon: Folder, color: 'border-blue-300 bg-blue-50' },
              { step: '2', title: 'Calendário e Grade', desc: 'Ano letivo, bimestres, feriados e grade horária semanal', icon: Calendar, color: 'border-purple-300 bg-purple-50' },
              { step: '3', title: 'Planejamento', desc: 'Gere pré-planejamentos, preenchimento e assinatura digital', icon: FileText, color: 'border-emerald-300 bg-emerald-50' },
              { step: '4', title: 'Operacional', desc: 'Frequência, notas, boletins e orientações pedagógicas', icon: Star, color: 'border-amber-300 bg-amber-50' },
              { step: '5', title: 'Gestão', desc: 'B.I., auditoria, pendências e compartilhamento externo', icon: Brain, color: 'border-indigo-300 bg-indigo-50' },
            ].map((item) => (
              <div key={item.step} className={`rounded-xl border p-4 ${item.color} text-center space-y-2`}>
                <div className="mx-auto w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs font-bold bg-white/80 rounded-full px-2 py-0.5">Etapa {item.step}</span>
                </div>
                <h4 className="font-semibold text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Detailed Tutorials grouped */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Tutoriais Detalhados
        </h2>
        <p className="text-sm text-muted-foreground">Clique em cada seção para expandir o passo a passo completo</p>
      </div>

      {sectionGroups.map((group) => {
        const sections = tutorialSections.filter(s => group.ids.includes(s.id));
        if (sections.length === 0) return null;
        return (
          <div key={group.label} className="space-y-2">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${group.color} flex items-center gap-2`}>
              <div className="h-1 w-4 rounded-full bg-current" />
              {group.label}
            </h3>
            <Card>
              <CardContent className="p-0">
                <Accordion type="multiple" className="w-full">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="hover:no-underline px-6 py-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <section.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{section.title}</span>
                              {section.badge && (
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${section.badgeColor}`}>
                                  {section.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5">
                        <ol className="space-y-4 ml-1">
                          {section.steps.map((step, i) => {
                            const StepIcon = step.icon || CheckCircle2;
                            return (
                              <li key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <StepIcon className="w-4 h-4 text-primary" />
                                  </div>
                                  {i < section.steps.length - 1 && (
                                    <div className="w-px h-full bg-border mt-1" />
                                  )}
                                </div>
                                <div className="pb-2 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold bg-muted rounded-full px-2 py-0.5">Passo {i + 1}</span>
                                  </div>
                                  <p className="font-medium text-sm mt-1">{step.title}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                                  {step.tip && (
                                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                                      <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-blue-800">{step.tip}</p>
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* FAQ Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Dicas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: School, text: 'Cursos, disciplinas, turmas e alunos são acessados dentro de Escolas ou Itinerários — não pelo menu lateral' },
              { icon: CalendarDays, text: 'Preencha o Calendário Semanal da disciplina antes de gerar pré-planejamentos' },
              { icon: Clock, text: 'Monte a grade horária antes de gerar pré-planejamentos' },
              { icon: Calendar, text: 'O calendário letivo precisa estar ATIVO para o sistema funcionar' },
              { icon: UserCheck, text: 'Vincule professores a escolas/cursos antes de montar a grade' },
              { icon: UserPlus, text: 'Alunos precisam de matrícula ativa para aparecer na chamada e nas notas' },
              { icon: Shield, text: 'Cada professor só vê seus próprios dados — nunca os de outros professores' },
              { icon: Lock, text: 'Feche o bimestre para que as notas apareçam no portal externo e nos boletins' },
              { icon: Key, text: 'Configure a palavra-chave ANTES de compartilhar links externos' },
              { icon: Activity, text: 'Use a Auditoria para monitorar quem está acessando o sistema' },
              { icon: ListChecks, text: 'A Central de Pendências mostra tudo que precisa de ação imediata' },
              { icon: Download, text: 'PDFs de boletins geram TODOS os alunos em um único arquivo (um por página)' },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <tip.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{tip.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
