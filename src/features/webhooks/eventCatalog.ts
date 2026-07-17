export interface WebhookEvent {
  type: string;
  label: string;
  description: string;
}

export interface WebhookDomain {
  key: string;
  label: string;
  description: string;
  events: WebhookEvent[];
}

export const WEBHOOK_DOMAINS: WebhookDomain[] = [
  {
    key: 'academico',
    label: 'Acadêmico',
    description: 'Estrutura acadêmica: escolas, cursos, disciplinas e turmas.',
    events: [
      { type: 'school.created', label: 'Escola criada', description: 'Quando uma nova escola é cadastrada.' },
      { type: 'school.updated', label: 'Escola atualizada', description: 'Quando dados de uma escola são editados.' },
      { type: 'school.deleted', label: 'Escola excluída', description: 'Quando uma escola é removida.' },
      { type: 'course.created', label: 'Curso criado', description: 'Quando um novo curso é cadastrado.' },
      { type: 'course.updated', label: 'Curso atualizado', description: 'Quando um curso é editado.' },
      { type: 'subject.created', label: 'Disciplina criada', description: 'Quando uma nova disciplina é cadastrada.' },
      { type: 'subject.updated', label: 'Disciplina atualizada', description: 'Quando uma disciplina é editada.' },
      { type: 'class_group.created', label: 'Turma criada', description: 'Quando uma nova turma é cadastrada.' },
      { type: 'class_group.updated', label: 'Turma atualizada', description: 'Quando uma turma é editada.' },
    ],
  },
  {
    key: 'pessoas',
    label: 'Pessoas',
    description: 'Professores, alunos e matrículas.',
    events: [
      { type: 'professor.created', label: 'Professor criado', description: 'Cadastro de novo professor.' },
      { type: 'professor.updated', label: 'Professor atualizado', description: 'Edição de dados do professor.' },
      { type: 'professor.status_changed', label: 'Status do professor alterado', description: 'Mudança de status (ativo/inativo).' },
      { type: 'professor.deleted', label: 'Professor excluído', description: 'Exclusão lógica do professor.' },
      { type: 'student.created', label: 'Aluno criado', description: 'Cadastro de novo aluno.' },
      { type: 'student.updated', label: 'Aluno atualizado', description: 'Edição de dados do aluno.' },
      { type: 'student.status_changed', label: 'Status do aluno alterado', description: 'Mudança de status do aluno.' },
      { type: 'enrollment.created', label: 'Matrícula criada', description: 'Nova matrícula de aluno.' },
      { type: 'enrollment.updated', label: 'Matrícula atualizada', description: 'Edição de matrícula.' },
    ],
  },
  {
    key: 'pedagogico',
    label: 'Pedagógico',
    description: 'Planejamentos e fluxo de aprovação.',
    events: [
      { type: 'pre_planning.created', label: 'Pré-planejamento criado', description: 'Novo pré-planejamento gerado.' },
      { type: 'pre_planning.updated', label: 'Pré-planejamento atualizado', description: 'Edição de pré-planejamento.' },
      { type: 'pre_planning.status_changed', label: 'Status do pré-planejamento', description: 'Mudança de status.' },
      { type: 'teacher_planning.created', label: 'Planejamento do professor criado', description: 'Novo planejamento do professor.' },
      { type: 'teacher_planning.updated', label: 'Planejamento atualizado', description: 'Edição de planejamento.' },
      { type: 'teacher_planning.status_changed', label: 'Status do planejamento alterado', description: 'Mudança no fluxo (assinatura, devolução, aprovação).' },
    ],
  },
  {
    key: 'frequencia_notas',
    label: 'Frequência & Notas',
    description: 'Registros pedagógicos diários.',
    events: [
      { type: 'attendance.created', label: 'Frequência registrada', description: 'Quando uma frequência é lançada.' },
      { type: 'attendance.updated', label: 'Frequência atualizada', description: 'Quando uma frequência é editada.' },
    ],
  },
  {
    key: 'orientacoes',
    label: 'Orientações',
    description: 'Ciclo de orientações pedagógicas.',
    events: [
      { type: 'orientation.created', label: 'Orientação criada', description: 'Nova orientação registrada.' },
      { type: 'orientation.updated', label: 'Orientação atualizada', description: 'Edição de orientação.' },
      { type: 'orientation.status_changed', label: 'Status alterado', description: 'Mudança no fluxo (assinatura, cancelamento).' },
    ],
  },
  {
    key: 'acompanhamento',
    label: 'Acompanhamento',
    description: 'Visitas e entregas de apostilas.',
    events: [
      { type: 'delivery.created', label: 'Entrega criada', description: 'Nova entrega de apostila agendada.' },
      { type: 'delivery.updated', label: 'Entrega atualizada', description: 'Atualização em entrega.' },
      { type: 'delivery.status_changed', label: 'Status da entrega', description: 'Mudança de status (concluída/cancelada).' },
    ],
  },
  {
    key: 'compartilhamento',
    label: 'Compartilhamento',
    description: 'Links externos e portal público.',
    events: [
      { type: 'external_link.created', label: 'Link externo criado', description: 'Novo link de compartilhamento gerado.' },
      { type: 'external_link.updated', label: 'Link externo atualizado', description: 'Atualização em link externo.' },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    description: 'Eventos de teste e diagnóstico.',
    events: [
      { type: 'webhook.test', label: 'Teste manual', description: 'Disparado pelo botão "Testar agora".' },
    ],
  },
];

export const ALL_EVENT_TYPES = WEBHOOK_DOMAINS.flatMap((d) => d.events.map((e) => e.type));

export function getEventLabel(type: string): string {
  for (const d of WEBHOOK_DOMAINS) {
    const ev = d.events.find((e) => e.type === type);
    if (ev) return ev.label;
  }
  return type;
}
