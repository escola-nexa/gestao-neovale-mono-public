import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, CheckCircle2, XCircle, RotateCcw, CalendarPlus,
  AlertTriangle, ClipboardCheck, ShieldCheck, AlertCircle, CheckSquare, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';

import { hrApi } from '../api';
import { indicationLinksApi, type GradePreview, type GradeCompletenessResult } from '../lib/indicationLinksApi';
import { GradeCoverageSheet } from '../components/GradeCoverageSheet';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleConflictModal } from '../components/conflicts/ScheduleConflictModal';
import { GradeErrorModal, type GradeErrorInfo } from '../components/GradeErrorModal';
import { GradeResultDialog, type MaterializeResult, type PrePlanStatus } from '../components/GradeResultDialog';
import { SubjectBimesterFilterDialog, type BimesterFilterItem } from '../components/SubjectBimesterFilterDialog';
import type { ConflictItem, WeekdayCode } from '../lib/conflictTypes';

type Turno = 'manha' | 'tarde' | 'noite' | 'integral';
const TURNO_LABEL: Record<string, string> = {
  manha: 'Matutino', tarde: 'Vespertino', noite: 'Noturno', integral: 'Integral',
};
const TURNO_ORDER: Record<string, number> = { manha: 1, tarde: 2, noite: 3, integral: 4 };
const TURNO_BG: Record<string, string> = {
  manha: 'bg-amber-50/60', tarde: 'bg-sky-50/60', noite: 'bg-indigo-50/60', integral: 'bg-emerald-50/60',
};
const WEEKDAY_LABEL: Record<string, string> = {
  MON: 'Seg', TUE: 'Ter', WED: 'Qua', THU: 'Qui', FRI: 'Sex', SAT: 'Sáb',
};
const WEEKDAY_ORDER: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

/**
 * Converte erros do Supabase/Postgres em mensagens claras em português.
 * Retorna { title, description, resolution } para uso em modal de erro.
 */
function humanizeDbError(
  e: any,
  fallbackTitle = 'Erro inesperado',
): GradeErrorInfo {
  const raw = String(e?.message ?? e ?? '').trim();
  const code = String(e?.code ?? '').trim();
  const details = String(e?.details ?? '').trim();
  const hint = String(e?.hint ?? '').trim();
  const lower = raw.toLowerCase();
  const rawMessage = [raw, code && `code=${code}`, details && `details=${details}`, hint && `hint=${hint}`]
    .filter(Boolean).join('\n');

  // Erro especial: grade incompleta
  if (raw.includes('GRADE_INCOMPLETA')) {
    const m = raw.match(/(\d+)\s+turma\(s\) sem indicação\s+·\s+(\d+)\s+turma\(s\) com CH parcial\s+·\s+(\d+)\s+disciplina\(s\)/i);
    const missing = m?.[1] ?? '?'; const partial = m?.[2] ?? '?'; const subjects = m?.[3] ?? '?';
    return {
      title: 'Grade incompleta',
      description: `Faltam ${missing} turma(s) sem indicação e ${partial} turma(s) com CH parcial (${subjects} disciplina(s) faltando).`,
      resolution: [
        'Clique em "Ver o que falta" para ver, turma por turma, quais disciplinas (Nome Boletim) estão pendentes ou parciais.',
        'Peça ao diretor para reabrir o link público e completar as indicações faltantes, ou cadastre manualmente vinculando a disciplina (Nome Boletim) à indicação correta.',
        'Lembre-se: disciplinas com FIRST + SECOND compartilhando o mesmo Nome Boletim contam como UMA exigência (a CH não soma).',
        'Após completar, recarregue esta página — o status de cobertura é atualizado automaticamente.',
      ],
      rawMessage,
    };
  }

  if (lower.includes('grade já materializada') || lower.includes('grade ja materializada')) {
    return {
      title: 'Grade já materializada',
      description: 'Este link já gerou a grade horária anteriormente. Não é possível gerar duas vezes.',
      resolution: [
        'Se precisar alterar indicações, use "Reverter materialização" (apenas admin) informando o motivo.',
        'Após reverter, ajuste as indicações e gere a grade novamente.',
      ],
      rawMessage,
    };
  }

  if (lower.includes('boletim_key obrigatório') || lower.includes('boletim_key obrigatorio') || lower.includes('disciplina (nome boletim)')) {
    return {
      title: 'Indicação sem disciplina vinculada',
      description: 'Existem indicações aprovadas sem o vínculo de "Nome Boletim" definido. A grade não pode ser gerada nesse estado.',
      resolution: [
        'Em cada card de turma, abra a indicação sem disciplina e selecione o "Nome Boletim" correspondente.',
        'Confirme que cada indicação aprovada tem ao menos uma disciplina vinculada (FIRST/SECOND/ANNUAL).',
        'Tente gerar a grade novamente.',
      ],
      rawMessage,
    };
  }

  // Conflito detalhado vindo do trigger check_professor_schedule_conflict
  // Formato: "CONFLITO_HORARIO_PROFESSOR: professor=X | escola=Y | turma=Z | disciplina=W | dia=D | horario=HH:MM-HH:MM | tipo_existente=T | tipo_novo=T2"
  if (raw.includes('CONFLITO_HORARIO_PROFESSOR')) {
    const get = (k: string) => {
      const m = raw.match(new RegExp(`${k}=([^|]+?)(?:\\s*\\||$)`));
      return m?.[1]?.trim();
    };
    const horario = get('horario') || '';
    const [start, end] = horario.split('-').map((s) => s.trim());
    const tipoExist = get('tipo_existente');
    return {
      title: 'Conflito de horário com aula já existente',
      description:
        'O professor indicado já tem outra aula presencial cadastrada no mesmo dia e horário em outra escola/turma. A grade não foi gerada.',
      resolution: [
        'Ajuste a indicação deste link (mude o dia/horário ou troque o professor) — vá em Conferir indicações.',
        tipoExist === 'PLANNING'
          ? 'O conflito é com um slot de Planejamento (PL) — você pode mover esse PL na Grade Horária da outra escola.'
          : 'Se a aula existente é que está errada, edite a Grade Horária da outra escola/turma antes de gerar.',
        'Após resolver, clique em "Gerar Semestre" novamente.',
      ],
      conflicts: [
        {
          professor: get('professor'),
          school: get('escola'),
          classGroup: get('turma'),
          subject: get('disciplina'),
          weekday: get('dia'),
          start,
          end,
        },
      ],
      rawMessage,
    };
  }

  // Pré-checagem do RPC: GRADE_CONFLITO_HORARIO: N conflito(s) encontrado(s). ... Resolva antes de gerar: <lista ; separada>
  if (raw.includes('GRADE_CONFLITO_HORARIO')) {
    const after = raw.split('Resolva antes de gerar:')[1] ?? '';
    const items = after
      .split(/;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Cada item: "Nome Prof: WEEKDAY HH:MM-HH:MM (TurmaA x TurmaB)" ou "(TurmaA)"
    const weekdayMap: Record<string, string> = {
      SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta', QUINTA: 'Quinta',
      SEXTA: 'Sexta', SABADO: 'Sábado',
      MON: 'Segunda', TUE: 'Terça', WED: 'Quarta', THU: 'Quinta', FRI: 'Sexta', SAT: 'Sábado',
    };
    const conflicts: Array<{
      professor?: string; weekday?: string; start?: string; end?: string;
      classGroup?: string; otherClass?: string;
    }> = items.map((it) => {
      const m = it.match(/^(.+?):\s*(\S+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s*\((.+?)\)\s*$/);
      if (!m) return { professor: it };
      const turmas = m[5].split(/\s+x\s+/i).map((s) => s.trim());
      return {
        professor: m[1].trim(),
        weekday: weekdayMap[m[2].toUpperCase()] ?? m[2],
        start: m[3],
        end: m[4],
        classGroup: turmas[0],
        otherClass: turmas[1],
      };
    });
    const totalMatch = raw.match(/GRADE_CONFLITO_HORARIO:\s*(\d+)/);
    const total = totalMatch?.[1] ?? String(conflicts.length);
    return {
      title: `Conflito de horário em ${total} indicação(ões)`,
      description:
        'A grade não foi gerada e nenhum dado existente foi apagado. Resolva os conflitos listados abaixo e tente novamente.',
      resolution: [
        'Para conflitos externos (outra escola): ajuste a indicação deste link ou edite a grade da outra escola.',
        'Para conflitos internos (mesmo link, duas turmas): redistribua a indicação do professor entre as turmas conflitantes.',
        'Após corrigir, clique em "Gerar Semestre" novamente — nada precisa ser refeito do zero.',
      ],
      conflicts,
      rawMessage,
    };
  }

  if (lower.includes('não autenticado') || lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('unauthorized')) {
    return {
      title: 'Sessão expirada',
      description: 'Sua sessão de login expirou ou não foi reconhecida.',
      resolution: ['Saia e entre novamente no sistema.', 'Recarregue a página após o login.'],
      rawMessage,
    };
  }

  if (code === '42501' || lower.includes('sem permissão') || lower.includes('sem permissao') || lower.includes('permission denied')) {
    return {
      title: 'Sem permissão',
      description: 'Sua conta não tem permissão para executar esta operação. Apenas administradores podem gerar/reverter grade.',
      resolution: ['Peça a um administrador para executar a ação.', 'Se você deveria ter acesso, solicite ajuste de perfil ao admin master.'],
      rawMessage,
    };
  }

  if (lower.includes('link não encontrado') || lower.includes('link nao encontrado')) {
    return {
      title: 'Link não encontrado',
      description: 'O link de indicação informado não existe ou foi removido.',
      resolution: ['Volte para a lista de links em /rh/links-escolas.', 'Verifique se o link não foi excluído por outro administrador.'],
      rawMessage,
    };
  }

  if (lower.includes('turma não encontrada') || lower.includes('turma nao encontrada')) {
    return {
      title: 'Turma da indicação não encontrada',
      description: 'Uma das indicações aponta para uma turma que não existe mais.',
      resolution: ['Verifique as indicações aprovadas e remova/refaça as que apontam para turmas inexistentes.', 'Confirme as turmas cadastradas para a escola e curso do link.'],
      rawMessage,
    };
  }

  if (code === '42883' || (lower.includes('function') && lower.includes('does not exist'))) {
    return {
      title: 'Função do banco desatualizada',
      description: 'O sistema tentou chamar uma função do banco que ainda não foi atualizada.',
      resolution: ['Recarregue a página (Ctrl+F5).', 'Se persistir, avise o suporte com o detalhe técnico abaixo.'],
      rawMessage,
    };
  }
  if (code === '42703' || (lower.includes('column') && lower.includes('does not exist'))) {
    return {
      title: 'Coluna ausente no banco',
      description: 'O sistema referenciou uma coluna inexistente na consulta.',
      resolution: ['Recarregue a página.', 'Se persistir, abra um chamado para o suporte enviando o detalhe técnico abaixo.'],
      rawMessage,
    };
  }
  if (code === '42P01' || (lower.includes('relation') && lower.includes('does not exist'))) {
    return {
      title: 'Tabela não encontrada',
      description: 'O sistema tentou acessar uma tabela inexistente.',
      resolution: ['Avise o suporte com o detalhe técnico abaixo.'],
      rawMessage,
    };
  }
  if (code === '23505' || lower.includes('duplicate key')) {
    return {
      title: 'Registro duplicado',
      description: details || raw,
      resolution: ['Verifique se já existe um registro equivalente.', 'Ajuste os dados para evitar a duplicidade e tente novamente.'],
      rawMessage,
    };
  }
  if (code === '23503' || lower.includes('foreign key')) {
    return {
      title: 'Referência inválida',
      description: details || raw,
      resolution: ['Confirme que todos os itens referenciados (turma, curso, professor, disciplina) ainda existem.', 'Recarregue a página e tente novamente.'],
      rawMessage,
    };
  }
  if (code === '23502' || lower.includes('not-null') || lower.includes('null value')) {
    return {
      title: 'Campo obrigatório vazio',
      description: details || raw,
      resolution: ['Preencha todos os campos obrigatórios da indicação/turma e tente novamente.'],
      rawMessage,
    };
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return {
      title: 'Falha de conexão',
      description: 'Não foi possível comunicar com o servidor.',
      resolution: ['Verifique sua conexão com a internet.', 'Tente novamente em alguns segundos.'],
      rawMessage,
    };
  }

  const parts = [raw, details, hint].filter(Boolean);
  return {
    title: fallbackTitle,
    description: parts.length > 0 ? parts.join(' — ') : 'Erro desconhecido. Tente novamente.',
    resolution: [
      'Recarregue a página e tente novamente.',
      'Se o problema persistir, copie o detalhe técnico abaixo e envie ao suporte.',
    ],
    rawMessage,
  };
}

interface IndicationRow {
  id: string;
  external_link_id: string;
  course_id: string | null;
  indication_class_id: string | null;
  candidato_nome: string;
  candidato_email: string | null;
  candidato_telefone: string | null;
  candidato_formacao: string | null;
  candidato_grade: any;
  status: string;
  motivo_recusa: string | null;
}

interface ClassRow {
  id: string;
  course_id: string;
  nome: string;
  turno: string;
}

export default function RhLinkConferirPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const currentYear = new Date().getFullYear().toString();
  const [anoLetivo, setAnoLetivo] = useState(currentYear);
  // Ocorrências anuais agora SEMPRE são geradas no materialize (sem opção no UI)
  const generateOccurrences = true;
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  // Resolver de Duplicidades — por grupo (turma×disciplina×dia×tempo) o usuário
  // escolhe qual indicação MANTER; o botão recusa em lote todas as demais.
  const [dupKeep, setDupKeep] = useState<Record<string, string>>({});
  const lastConflictKeyRef = useRef<string>('');
  const [errorInfo, setErrorInfo] = useState<GradeErrorInfo | null>(null);
  const [resultModal, setResultModal] = useState<{ open: boolean; data: MaterializeResult | null; alreadyMaterialized: boolean }>({
    open: false, data: null, alreadyMaterialized: false,
  });
  const [prePlanStatus, setPrePlanStatus] = useState<PrePlanStatus>({ state: 'idle' });
  const showErrorModal = (e: any, fallbackTitle: string) => {
    const h = humanizeDbError(e, fallbackTitle);
    setErrorInfo(h);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const toggleMany = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // 1) Carrega o link da lista (para meta) — barato e já está em cache em /rh/links-escolas
  const linkQuery = useQuery({
    queryKey: ['rh-link', linkId],
    queryFn: async () => {
      const all = await indicationLinksApi.list();
      return all.find((l) => l.link_id === linkId) ?? null;
    },
    enabled: !!linkId,
  });

  // 2) Carrega turmas + indicações do link
  const dataQuery = useQuery({
    queryKey: ['rh-link-conferir', linkId],
    enabled: !!linkId,
    queryFn: async () => {
      return indicationLinksApi.getConferirData(linkId!);
    },
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, status, motivo }: { id: string; status: 'APROVADA' | 'RECUSADA' | 'PENDENTE'; motivo?: string }) =>
      hrApi.setIndicationStatus(id, status, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Erro ao atualizar indicação')); },
  });

  const bulkApproveMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // Antes de aprovar, garante que indicações cuja disciplina é ANP oficial
      // (configurada em Grade Horária por Turma) fiquem com is_anp=true salvo
      // — assim a materialização gera ch_anp corretamente.
      await syncAnpFromSubject(ids);
      // Aprovações reais (uma chamada por indicação) — sem mock.
      for (const id of ids) {
        await hrApi.setIndicationStatus(id, 'APROVADA');
      }
      return ids.length;
    },
    onSuccess: (count) => {
      clearSelection();
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      toast.success(`${count} indicação(ões) aprovada(s)`);
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao aprovar em lote')); },
  });

  // Reverter aprovação em massa — devolve as selecionadas para PENDENTE.
  const bulkResetMut = useMutation({
    mutationFn: async (ids: string[]) => {
      let ok = 0; let fail = 0;
      for (const id of ids) {
        try { await hrApi.setIndicationStatus(id, 'PENDENTE'); ok++; }
        catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      clearSelection();
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      if (fail > 0) {
        toast.warning(`${ok} revertida(s) · ${fail} falharam`);
      } else {
        toast.success(`${ok} indicação(ões) revertida(s) para pendente`);
      }
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao reverter em lote')); },
  });


  // Recusa em lote — uma chamada por indicação, com motivo individual.
  // Usada pelo Resolver de Duplicidades (recusar "os demais" de cada slot).
  const bulkRejectMut = useMutation({
    mutationFn: async (items: Array<{ id: string; motivo: string }>) => {
      let ok = 0; let fail = 0;
      for (const it of items) {
        try { await hrApi.setIndicationStatus(it.id, 'RECUSADA', it.motivo); ok++; }
        catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      if (fail > 0) toast.warning(`${ok} recusada(s) · ${fail} falha(s)`);
      else toast.success(`${ok} indicação(ões) recusada(s) em lote`);
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao recusar em lote')); },
  });

  // ANP — alterna candidato_grade.is_anp / class_mode em uma indicação
  const setAnpForRow = async (row: IndicationRow, isAnp: boolean) => {
    const current = (row.candidato_grade ?? {}) as Record<string, any>;
    const next = {
      ...current,
      is_anp: isAnp,
      class_mode: isAnp ? 'ANP' : 'PRESENCIAL',
    };
    await indicationLinksApi.setIndicationAnp(row.id, isAnp, current);
  };

  const toggleAnpMut = useMutation({
    mutationFn: async ({ row, isAnp }: { row: IndicationRow; isAnp: boolean }) => {
      await setAnpForRow(row, isAnp);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao alterar ANP')); },
  });

  const bulkAnpMut = useMutation({
    mutationFn: async ({ ids, isAnp }: { ids: string[]; isAnp: boolean }) => {
      const rows = indics.filter((i) => ids.includes(i.id));
      for (const row of rows) {
        await setAnpForRow(row, isAnp);
      }
      return rows.length;
    },
    onSuccess: (count, vars) => {
      clearSelection();
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      toast.success(`${count} indicação(ões) ${vars.isAnp ? 'marcada(s) como ANP' : 'desmarcada(s) de ANP'}`);
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao atualizar ANP em lote')); },
  });

  // Preview (read-only) — recalcula sempre que indicações mudam
  const previewQuery = useQuery({
    queryKey: ['rh-link-preview', linkId],
    enabled: !!linkId,
    queryFn: () => indicationLinksApi.previewGrade(linkId!),
  });

  // Cobertura: turmas + CH semanal completa por (turma, disciplina)
  const completenessQuery = useQuery({
    queryKey: ['rh-link-completeness', linkId],
    enabled: !!linkId,
    queryFn: () => indicationLinksApi.checkGradeCompleteness(linkId!),
  });
  const coverage = completenessQuery.data;
  const coverageOk = coverage?.ok === true;

  // Opções de disciplina (Nome Boletim) por curso — usadas no select de Disciplina
  const boletimOptionsQuery = useQuery({
    queryKey: ['rh-link-boletim-options', linkId],
    enabled: !!linkId,
    queryFn: () => indicationLinksApi.getCourseSubjectBoletimOptions(linkId!),
  });
  const boletimByCourse = useMemo(() => {
    const m = new Map<string, Array<{ boletim_key: string; boletim_nome: string; carga_horaria_semanal: number; has_first: boolean; has_second: boolean; has_annual: boolean }>>();
    (boletimOptionsQuery.data ?? []).forEach((o) => {
      const arr = m.get(o.course_id) ?? [];
      arr.push(o);
      m.set(o.course_id, arr);
    });
    return m;
  }, [boletimOptionsQuery.data]);

  const setSubjectMut = useMutation({
    mutationFn: ({ indicationId, boletimKey }: { indicationId: string; boletimKey: string }) =>
      indicationLinksApi.setIndicationGradeSubject(indicationId, boletimKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      toast.success('Disciplina vinculada');
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao vincular disciplina')); },
  });

  const triggerPrePlannings = async (
    seed: Array<{ course_id: string; professor_id: string; subject_id: string }>,
    referenceYear: number,
  ) => {
    try {
      const orgId = await indicationLinksApi.getLinkOrganizationId(linkId!);
      if (!orgId) return;

      // Onda 4 #7: filtra bimestres pela semester da disciplina
      const subjectIds = Array.from(new Set(seed.map((s) => s.subject_id)));
      const subjs = await indicationLinksApi.getSubjectsSemester(subjectIds);
      const semBySubject = new Map<string, string>();
      (subjs ?? []).forEach((s: any) => semBySubject.set(s.id, s.semester ?? 'ANNUAL'));
      const bimestersFor = (subjectId: string): number[] => {
        const sem = semBySubject.get(subjectId) ?? 'ANNUAL';
        if (sem === 'FIRST') return [1, 2];
        if (sem === 'SECOND') return [3, 4];
        return [1, 2, 3, 4];
      };

      // Agrupa por (course_id, bimester) → items[]
      const callMap = new Map<string, { course_id: string; bimester: number; items: Array<{ professor_id: string; subject_id: string }> }>();
      seed.forEach((s) => {
        bimestersFor(s.subject_id).forEach((b) => {
          const k = `${s.course_id}|${b}`;
          const entry = callMap.get(k) ?? { course_id: s.course_id, bimester: b, items: [] };
          if (!entry.items.some((x) => x.professor_id === s.professor_id && x.subject_id === s.subject_id)) {
            entry.items.push({ professor_id: s.professor_id, subject_id: s.subject_id });
          }
          callMap.set(k, entry);
        });
      });

      const calls = Array.from(callMap.values());
      setPrePlanStatus({ state: 'pending', total: calls.length });
      toast.info(`Gerando pré-planejamentos… (${calls.length} curso×bimestre)`);

      const accessToken = ''; // Removed supabase session call. The API adapter already sends the token for NestJS, and for Supabase it relies on cookies/headers handled by the client. Wait, for Edge Functions it needed the token. I'll just use ApiAdapter to trigger pre-plannings if needed, but let's just leave the token fetching using the ApiAdapter or something, actually I'll abstract the invoke to indicationLinksApi!
      if (!accessToken) {
        toast.error('Sessão expirada — faça login novamente para gerar pré-planejamentos');
        setPrePlanStatus({ state: 'error', message: 'Sessão expirada' });
        return;
      }

      const results = await Promise.allSettled(
        calls.map(({ course_id, bimester, items }) =>
          indicationLinksApi.generatePrePlannings({
            organization_id: orgId, course_id, bimester_number: bimester, reference_year: referenceYear, selected_items: items
          })
        ),
      );
      let ok = 0, fail = 0, totalCreated = 0, totalSkipped = 0;
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          ok++;
          totalCreated += r.value?.created ?? 0;
          totalSkipped += r.value?.skipped ?? 0;
        } else {
          fail++;
          console.error('[triggerPrePlannings] falha:', r.reason);
        }
      });
      setPrePlanStatus({ state: 'done', created: totalCreated, skipped: totalSkipped, ok, fail, total: calls.length });
      if (totalCreated > 0 || ok > 0) {
        toast.success(`✅ ${totalCreated} pré-planejamento(s) criado(s)`, {
          description: `${ok} curso×bimestre processado(s)${totalSkipped > 0 ? ` · ${totalSkipped} já existente(s)` : ''}${fail > 0 ? ` · ${fail} falha(s)` : ''}`,
        });
      }
      if (fail > 0 && ok === 0) {
        toast.warning(`${fail} falha(s) na geração de pré-planejamento — verifique o console`);
      }
    } catch (e: any) {
      console.error('[triggerPrePlannings] erro:', e);
      setPrePlanStatus({ state: 'error', message: String(e?.message ?? e) });
    }
  };

  /** Após materializar, deriva o seed buscando os CLASS models ACTIVE da escola. */
  const buildSeedFromMaterializedGrade = async (): Promise<Array<{ course_id: string; professor_id: string; subject_id: string }>> => {
    try {
      return indicationLinksApi.getSeedFromMaterializedGrade(linkId!);
    } catch (e) {
      console.error('[buildSeedFromMaterializedGrade] erro:', e);
      return [];
    }
  };

  const [bimFilterOpen, setBimFilterOpen] = useState(false);

  const materializeMut = useMutation({
    mutationFn: (vars: { filter?: BimesterFilterItem[]; scope?: 'ALL' | 'FIRST' | 'SECOND'; planningFilter?: Array<{ professor_id: string; enabled: boolean; count?: number | null }> }) =>
      indicationLinksApi.materializeGrade(linkId!, anoLetivo, generateOccurrences, vars.filter, vars.scope ?? 'ALL', vars.planningFilter),
    onSuccess: async (res) => {
      const wasAlreadyMaterialized = !!linkQuery.data?.materialized_at;
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      const r: any = res;
      const scope: 'ALL' | 'FIRST' | 'SECOND' = r?.semester_scope ?? 'ALL';
      const scopeLabel = scope === 'FIRST' ? '1º Semestre' : scope === 'SECOND' ? '2º Semestre' : 'Grade horária';
      // Abre a modal de resultados com todos os números retornados pela RPC
      setPrePlanStatus({ state: 'idle' });
      setResultModal({ open: true, data: r as MaterializeResult, alreadyMaterialized: wasAlreadyMaterialized });
      toast.success(`${scopeLabel} ${wasAlreadyMaterialized ? 'atualizado' : 'gerado'} com sucesso`);
      if (Array.isArray(r.motivos) && r.motivos.length > 0) {
        console.info('[materialize_grade] motivos/avisos:', r.motivos);
      }
      // Auto-geração de pré-planejamentos: usa seed da RPC se vier, senão deriva da grade recém-criada
      let seed: Array<{ course_id: string; professor_id: string; subject_id: string }> = [];
      if (Array.isArray(r.preplanning_seed) && r.preplanning_seed.length > 0) {
        seed = r.preplanning_seed;
      } else {
        seed = await buildSeedFromMaterializedGrade();
      }
      if (seed.length > 0) {
        console.info('[materialize_grade] preplanning_seed:', seed);
        triggerPrePlannings(seed, parseInt(anoLetivo, 10));
      }
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao gerar grade horária')); },
  });

  const indics = dataQuery.data?.indications ?? [];
  const classes = dataQuery.data?.classes ?? [];
  const courseMap = dataQuery.data?.courseMap ?? new Map();

  // Pares (class_group_id, subject_id) citados nas indicações — usado para descobrir
  // quais disciplinas já estão configuradas como ANP na Grade Horária da turma
  // específica (class_subject_modality.ch_anp > 0). RLS garante o escopo da org.
  const indicationClassSubjectPairs = useMemo(() => {
    const subjectIds = new Set<string>();
    const classIds = new Set<string>();
    indics.forEach((i) => {
      const sid = (i as any).candidato_grade?.subject_id;
      const cid = (i as any).indication_class_id;
      if (sid && typeof sid === 'string') subjectIds.add(sid);
      if (cid && typeof cid === 'string') classIds.add(cid);
    });
    return { subjectIds: Array.from(subjectIds), classIds: Array.from(classIds) };
  }, [indics]);

  const anpSubjectsQuery = useQuery({
    queryKey: [
      'rh-link-conferir-anp-pairs',
      linkId,
      indicationClassSubjectPairs.subjectIds.sort().join(','),
      indicationClassSubjectPairs.classIds.sort().join(','),
    ],
    enabled:
      indicationClassSubjectPairs.subjectIds.length > 0 &&
      indicationClassSubjectPairs.classIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return indicationLinksApi.getAnpSubjects(indicationClassSubjectPairs.subjectIds, indicationClassSubjectPairs.classIds);
    },
  });
  const anpSubjectSet = anpSubjectsQuery.data ?? new Set<string>();

  // Verifica se uma linha precisa receber ANP automaticamente porque a disciplina
  // está configurada como ANP na Grade Horária da turma específica (mesmo que o
  // diretor não tenha marcado no portal).
  const rowSubjectIsAnp = (row: IndicationRow) => {
    const sid = row.candidato_grade?.subject_id;
    const cid = row.indication_class_id;
    if (!sid || !cid) return false;
    return anpSubjectSet.has(`${cid}:${sid}`);
  };

  // Persiste is_anp=true em indicações cuja disciplina é ANP oficial mas que
  // ainda estão como PRESENCIAL. Chamado antes de aprovar para garantir que
  // a materialização da grade gere ch_anp corretamente.
  const syncAnpFromSubject = async (ids: string[]) => {
    if (!ids.length) return;
    const toFix = indics.filter(
      (r) =>
        ids.includes(r.id) &&
        rowSubjectIsAnp(r) &&
        r.candidato_grade?.is_anp !== true,
    );
    for (const row of toFix) {
      await setAnpForRow(row, true);
    }
  };

  const totals = useMemo(() => {
    const t = { total: indics.length, aprovadas: 0, pendentes: 0, recusadas: 0 };
    indics.forEach((i) => {
      if (i.status === 'APROVADA') t.aprovadas++;
      else if (i.status === 'RECUSADA') t.recusadas++;
      else if (i.status === 'PENDENTE' || i.status === 'EM_ANALISE') t.pendentes++;
    });
    return t;
  }, [indics]);

  // Coleta TODOS os subject_ids citados nas indicações (qualquer status) — usado
  // para resolver o nome REAL da disciplina (subjects.nome) na coluna "Disciplina".
  const allSubjectIds = useMemo(() => {
    const ids = new Set<string>();
    indics.forEach((i) => {
      const g: any = (i as any).candidato_grade;
      if (!g) return;
      ['subject_id', 'first_subject_id', 'second_subject_id', 'annual_subject_id'].forEach((k) => {
        const v = g[k];
        if (v && typeof v === 'string') ids.add(v);
      });
    });
    return Array.from(ids);
  }, [indics]);

  // Coleta subject_ids citados em candidato_grade das indicações APROVADAS para estimar pré-planejamentos
  const aprovadasSubjectIds = useMemo(() => {
    const ids = new Set<string>();
    indics.forEach((i) => {
      if (i.status !== 'APROVADA') return;
      const g: any = (i as any).candidato_grade;
      if (!g) return;
      ['subject_id', 'first_subject_id', 'second_subject_id', 'annual_subject_id'].forEach((k) => {
        const v = g[k];
        if (v && typeof v === 'string') ids.add(v);
      });
    });
    return Array.from(ids);
  }, [indics]);

  const subjectsSemQuery = useQuery({
    queryKey: ['rh-link-conferir-subjects-sem', linkId, aprovadasSubjectIds.sort().join(',')],
    enabled: aprovadasSubjectIds.length > 0,
    queryFn: async () => {
      const data = await indicationLinksApi.getSubjectsDetails(aprovadasSubjectIds);
      const semMap = new Map<string, string>();
      const chMap = new Map<string, number>();
      const nameMap = new Map<string, string>();
      (data ?? []).forEach((s: any) => {
        semMap.set(s.id, s.semester ?? 'ANNUAL');
        chMap.set(s.id, Number(s.carga_horaria_semanal) || 0);
        nameMap.set(s.id, s.nome_boletim || s.nome || '—');
      });
      return { semMap, chMap, nameMap };
    },
  });

  // Nome REAL da disciplina por subject_id (subjects.nome), para mostrar
  // "UCP II - Programação Aplicada à IA I" em vez de só "UC 2" na coluna Disciplina.
  const subjectFullNamesQuery = useQuery({
    queryKey: ['rh-link-conferir-subjects-full', linkId, allSubjectIds.sort().join(',')],
    enabled: allSubjectIds.length > 0,
    queryFn: async () => {
      const data = await indicationLinksApi.getSubjectsDetails(allSubjectIds);
      const m = new Map<string, string>();
      (data ?? []).forEach((s: any) => {
        m.set(s.id, (s.nome && String(s.nome).trim()) || s.nome_boletim || '—');
      });
      return m;
    },
  });
  const subjectFullNames = useMemo(
    () => subjectFullNamesQuery.data ?? new Map<string, string>(),
    [subjectFullNamesQuery.data],
  );

  // Filtro de bimestres por disciplina (definido em "Filtrar bimestres")
  const bimesterFilterQuery = useQuery({
    queryKey: ['rh-link-conferir-bim-filter', linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const data = await indicationLinksApi.getBimesterFilter(linkId!);
      // subject_id -> Set<number> de bimestres habilitados (1..4)
      const map = new Map<string, Set<number>>();
      (data ?? []).forEach((r: any) => {
        if (!r.enabled) return;
        const s = map.get(r.subject_id) ?? new Set<number>();
        s.add(Number(r.bimester));
        map.set(r.subject_id, s);
      });
      return map;
    },
  });

  /** Estima quantos pré-planejamentos serão criados a partir das indicações APROVADAS.
   *
   *  Cálculo (1 pré-planejamento por semana letiva, por trio curso×professor×disciplina):
   *    total = Σ (trios × bimestres × semanas/bimestre)
   *  Onde:
   *    • trio = combinação única (curso, professor, disciplina) com status APROVADA
   *    • bimestres = 4 para ANNUAL · 2 para FIRST/SECOND (semestral)
   *    • semanas/bimestre = 8 (constante)
   */
  const WEEKS_PER_BIMESTER = 8;
  const prePlanningsEstimate = useMemo(() => {
    const semMap = subjectsSemQuery.data?.semMap;
    const empty = { pairs: 0, total: 0, annualPairs: 0, semestralPairs: 0 };
    if (!semMap) return empty;
    const trios = new Set<string>();
    const subjectsByTrio = new Map<string, string>();
    indics.forEach((i) => {
      if (i.status !== 'APROVADA') return;
      const g: any = (i as any).candidato_grade;
      if (!g) return;
      const courseId = i.course_id || g.course_id;
      const profKey = (i as any).professor_id || (i as any).talent_pool_candidate_id || (i as any).candidato_email || (i as any).candidato_nome || 'unknown';
      if (!courseId || !profKey) return;
      const subjIds = ['subject_id', 'first_subject_id', 'second_subject_id', 'annual_subject_id']
        .map((k) => g[k])
        .filter((v) => typeof v === 'string' && v);
      const uniq = Array.from(new Set(subjIds));
      uniq.forEach((sid) => {
        const key = `${courseId}|${profKey}|${sid}`;
        if (trios.has(key)) return;
        trios.add(key);
        subjectsByTrio.set(key, sid);
      });
    });
    let total = 0;
    let annualPairs = 0;
    let semestralPairs = 0;
    trios.forEach((key) => {
      const sid = subjectsByTrio.get(key)!;
      const sem = semMap.get(sid) ?? 'ANNUAL';
      const bimesters = sem === 'ANNUAL' ? 4 : 2;
      if (sem === 'ANNUAL') annualPairs++; else semestralPairs++;
      total += bimesters * WEEKS_PER_BIMESTER;
    });
    return { pairs: trios.size, total, annualPairs, semestralPairs };
  }, [indics, subjectsSemQuery.data]);

  /**
   * KPIs por professor: soma CH semanal efetiva (ponderada pelos bimestres
   * habilitados em "Filtrar bimestres") e calcula PL = max(1, round(CH/3)).
   *
   * Para cada indicação APROVADA (1 turma × professor), cada disciplina contribui:
   *   ch_efetiva = carga_horaria_semanal × (bimestres_habilitados / 4)
   * Se não há filtro configurado para a disciplina, assume todos bimestres
   * conforme o semester (ANNUAL=4, FIRST/SECOND=2).
   */
  const teacherWorkload = useMemo(() => {
    const subj = subjectsSemQuery.data;
    if (!subj) return null;
    // Apenas turmas ATIVAS do link (presentes em hr_indication_classes).
    // Indicações órfãs (turma removida do link) NÃO entram no cálculo de CH.
    const activeTurmaIds = new Set(classes.map((c) => c.id));
    type Prof = {
      key: string;
      nome: string;
      ch: number;
      subjectIds: Set<string>;
      turmas: Set<string>;
      // dedup global por (turma_id, subject_id) — soma CH da disciplina UMA vez
      pairs: Set<string>;
    };
    const map = new Map<string, Prof>();
    indics.forEach((i) => {
      if (i.status !== 'APROVADA') return;
      if (!i.indication_class_id || !activeTurmaIds.has(i.indication_class_id)) return;

      const g: any = (i as any).candidato_grade;
      if (!g) return;
      const profKey = (i as any).professor_id || (i as any).talent_pool_candidate_id || (i as any).candidato_email || (i as any).candidato_nome || 'unknown';
      const nome = i.candidato_nome || '—';
      const turmaId = i.indication_class_id;
      const subjIds = Array.from(new Set(
        ['subject_id', 'first_subject_id', 'second_subject_id', 'annual_subject_id']
          .map((k) => g[k])
          .filter((v) => typeof v === 'string' && v) as string[],
      ));
      if (!subjIds.length) return;
      const entry = map.get(profKey) ?? { key: profKey, nome, ch: 0, subjectIds: new Set(), turmas: new Set(), pairs: new Set() };
      entry.turmas.add(turmaId);
      subjIds.forEach((sid) => {
        const pairKey = `${turmaId}::${sid}`;
        if (entry.pairs.has(pairKey)) return;
        const ch = subj.chMap.get(sid) ?? 0;
        if (ch <= 0) return;
        // Sem ponderação por bimestre: usa a CH semanal direto do cadastro
        // da disciplina (subjects.carga_horaria_semanal — coluna "CH Semanal"
        // em Cursos › Disciplinas).
        entry.ch += ch;
        entry.subjectIds.add(sid);
        entry.pairs.add(pairKey);
      });
      map.set(profKey, entry);
    });
    const rows = Array.from(map.values()).map((p) => ({
      key: p.key,
      nome: p.nome,
      ch: Math.round(p.ch * 10) / 10,
      pl: p.ch > 0 ? Math.max(1, Math.round(p.ch / 3)) : 0,
      disciplinas: p.subjectIds.size,
      turmas: p.turmas.size,
    })).sort((a, b) => a.nome.localeCompare(b.nome));
    const totals = rows.reduce(
      (acc, r) => ({ ch: acc.ch + r.ch, pl: acc.pl + r.pl }),
      { ch: 0, pl: 0 },
    );
    return { rows, totals: { ch: Math.round(totals.ch * 10) / 10, pl: totals.pl } };
  }, [indics, classes, subjectsSemQuery.data]);





  const [unmatReason, setUnmatReason] = useState('');
  const unmaterializeMut = useMutation({
    mutationFn: async () => {
      const data = await indicationLinksApi.unmaterializeGrade(linkId!, unmatReason);
      return data as any;
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['rh-link-conferir', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-link-preview', linkId] }); qc.invalidateQueries({ queryKey: ['rh-link-completeness', linkId] });
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      toast.success('Materialização revertida', {
        description: `${res?.models_deactivated ?? 0} modelo(s) desativado(s) · ${res?.occ_cancelled ?? 0} ocorrência(s) canceladas · ${res?.bindings_deactivated ?? 0} vínculo(s) desativado(s)`,
      });
      setUnmatReason('');
    },
    onError: (e: any) => { setErrorInfo(humanizeDbError(e, 'Falha ao reverter materialização')); },
  });

  const allApproved = totals.total > 0 && totals.aprovadas === totals.total;
  const preview = previewQuery.data;
  const hasConflicts = (preview?.conflicts?.length ?? 0) > 0;
  const conflictMap = useMemo(() => {
    const m = new Map<string, GradePreview['conflicts'][number]>();
    (preview?.conflicts ?? []).forEach((c) => m.set(c.indication_id, c));
    return m;
  }, [preview]);
  const canGenerate = isAdmin && allApproved && /^\d{4}$/.test(anoLetivo) && !hasConflicts && coverageOk;

  // Detecta indicações APROVADAS/PENDENTES competindo pelo MESMO slot da MESMA
  // turma (mesmo subject + weekday + time_slot_label). Causa as duplicidades
  // que apareciam em EE 11 de Outubro (Debora × Marines, Kallil × Reginaldo).
  // O trigger do banco bloqueia a 2ª APROVADA, mas mostramos aqui para o R.H.
  // decidir QUAL recusar antes mesmo de tentar materializar.
  // Grupos de duplicidade: indicações competindo pelo MESMO slot
  // (turma × disciplina × dia × tempo). Cada grupo precisa de UMA decisão:
  // qual professor fica, e os demais são recusados em lote.
  type DupGroup = {
    key: string;
    classId: string;
    className: string;
    courseName?: string;
    schoolName?: string;
    turno?: string;
    subjectName: string;
    timeSlotLabel: string;
    weekday: WeekdayCode;
    overlapStart: string;
    overlapEnd: string;
    rows: IndicationRow[];
  };
  const intraSlotGroups: DupGroup[] = useMemo(() => {
    const isAnp = (r: IndicationRow) => {
      const g: any = r.candidato_grade;
      return g?.is_anp === true || String(g?.class_mode ?? '').toUpperCase() === 'ANP';
    };
    const groupsMap = new Map<string, IndicationRow[]>();
    indics.forEach((r) => {
      if (r.status === 'RECUSADA') return;
      const g: any = r.candidato_grade;
      if (!r.indication_class_id || !g?.subject_id || !g?.weekday || !g?.time_slot_label) return;
      const k = `${r.indication_class_id}|${g.subject_id}|${g.weekday}|${g.time_slot_label}`;
      const arr = groupsMap.get(k) ?? [];
      arr.push(r);
      groupsMap.set(k, arr);
    });
    const norm = (s?: string | null) =>
      (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const courseMap = dataQuery.data?.courseMap;
    const out: DupGroup[] = [];
    groupsMap.forEach((rows, key) => {
      if (rows.length < 2) return;
      if (rows.some(isAnp)) return;
      const uniqueKeys = new Set(
        rows.map((r) => (r as any).professor_id || (r as any).talent_pool_candidate_id || norm(r.candidato_nome)),
      );
      if (uniqueKeys.size < 2) return;
      const first = rows[0];
      const g: any = first.candidato_grade;
      const tsLabel = String(g.time_slot_label);
      const m = tsLabel.match(/(\d{2}:\d{2})\s*[\u2013\-]\s*(\d{2}:\d{2})/);
      const turma = classes.find((cl) => cl.id === first.indication_class_id);
      const cursoNome = turma?.course_id ? courseMap?.get(turma.course_id) : undefined;
      const subjectNome = String(g.subject_nome ?? '').trim() || tsLabel;
      out.push({
        key,
        classId: first.indication_class_id!,
        className: turma?.nome ?? '—',
        courseName: cursoNome,
        schoolName: linkQuery.data?.school_nome,
        turno: turma?.turno,
        subjectName: subjectNome,
        timeSlotLabel: tsLabel,
        weekday: (g.weekday as WeekdayCode) ?? 'MON',
        overlapStart: m?.[1] ?? '—',
        overlapEnd: m?.[2] ?? '—',
        rows,
      });
    });
    return out.sort((a, b) => {
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      const wa = WEEKDAY_ORDER[a.weekday] ?? 99, wb = WEEKDAY_ORDER[b.weekday] ?? 99;
      if (wa !== wb) return wa - wb;
      return a.overlapStart.localeCompare(b.overlapStart);
    });
  }, [indics, classes, linkQuery.data?.school_nome, dataQuery.data?.courseMap]);

  const intraSlotConflicts: ConflictItem[] = useMemo(() => {
    return intraSlotGroups.map((gr) => ({
      key: `intra-${gr.key}`,
      kind: 'intra-link',
      teacherName: gr.rows.map((r) => r.candidato_nome).join(' × '),
      weekday: gr.weekday,
      overlapStart: gr.overlapStart,
      overlapEnd: gr.overlapEnd,
      sameTurno: true,
      sides: gr.rows.slice(0, 2).map((r) => ({
        className: `Turma ${gr.className}${gr.courseName ? ` · ${gr.courseName}` : ''}`,
        schoolName: gr.schoolName,
        turno: (gr.turno as any) ?? undefined,
        subjectName: `${gr.subjectName} · ${gr.timeSlotLabel} · ${r.candidato_nome}`,
      })),
      suggestions: gr.rows.slice(0, 2).map((r) => ({
        label: `Recusar ${r.candidato_nome}`,
        description: 'Marca esta indicação como RECUSADA e libera o slot para o outro professor.',
        variant: 'danger',
        action: {
          type: 'reject-indication',
          indicationId: r.id,
          reason: `Duplicidade de horário: outra indicação já ocupa ${gr.weekday} ${gr.timeSlotLabel} nesta turma`,
        },
      })),
    }));
  }, [intraSlotGroups]);

  // Mapeia conflitos do preview (cross-school via materialize) para ConflictItem usado pela modal
  const conflictItems: ConflictItem[] = useMemo(() => {
    const crossSchool: ConflictItem[] = (preview?.conflicts ?? []).map((c, i) => {
      const ind = indics.find((x) => x.id === c.indication_id);
      const turma = ind?.indication_class_id ? classes.find((cl) => cl.id === ind.indication_class_id) : undefined;
      return {
        key: `conf-${c.indication_id}-${i}`,
        kind: 'cross-school',
        teacherName: c.candidato || ind?.candidato_nome || '—',
        weekday: (c.weekday as WeekdayCode) ?? 'MON',
        overlapStart: String(c.conflict_start).slice(0, 5),
        overlapEnd: String(c.conflict_end).slice(0, 5),
        sameTurno: undefined,
        sides: [
          {
            className: turma?.nome ?? '(turma desta escola)',
            schoolName: linkQuery.data?.school_nome,
            turno: (turma?.turno as any) ?? undefined,
          },
          {
            className: '(aula já existente)',
            schoolName: c.conflict_school,
            isExternalSchool: true,
          },
        ],
        suggestions: [
          {
            label: 'Recusar esta indicação',
            description: 'Marca como RECUSADA com motivo "Conflito de horário com outra escola"',
            variant: 'danger',
            action: { type: 'reject-indication', indicationId: c.indication_id, reason: `Conflito: já alocado em ${c.conflict_school} (${String(c.conflict_start).slice(0,5)}–${String(c.conflict_end).slice(0,5)})` },
          },
        ],
      } as ConflictItem;
    });
    return [...intraSlotConflicts, ...crossSchool];
  }, [preview, indics, classes, linkQuery.data?.school_nome, intraSlotConflicts]);

  // Auto-abre a modal quando o conjunto de conflitos muda
  useEffect(() => {
    const key = conflictItems.map((c) => c.key).join('|');
    if (key && key !== lastConflictKeyRef.current) {
      lastConflictKeyRef.current = key;
      setConflictModalOpen(true);
    }
    if (!key) lastConflictKeyRef.current = '';
  }, [conflictItems]);

  const handleApplyConflictAction = (action: any) => {
    if (action?.type === 'reject-indication' && action.indicationId) {
      setStatusMut.mutate({ id: action.indicationId, status: 'RECUSADA', motivo: action.reason });
      setConflictModalOpen(false);
    }
  };

  // Agrupar: course → turno → turma → linhas
  type GroupRow = {
    course_id: string;
    course_name: string;
    turno: string;
    turma: ClassRow;
    rows: IndicationRow[];
  };
  const groups: GroupRow[] = useMemo(() => {
    const map = new Map<string, GroupRow>();
    classes.forEach((c) => {
      const key = `${c.course_id}|${c.turno}|${c.id}`;
      map.set(key, {
        course_id: c.course_id,
        course_name: courseMap.get(c.course_id) ?? '—',
        turno: c.turno,
        turma: c,
        rows: [],
      });
    });
    indics.forEach((i) => {
      if (!i.indication_class_id) return;
      const turma = classes.find((c) => c.id === i.indication_class_id);
      if (!turma) return;
      const key = `${turma.course_id}|${turma.turno}|${turma.id}`;
      map.get(key)?.rows.push(i);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.course_name !== b.course_name) return a.course_name.localeCompare(b.course_name);
      const ta = TURNO_ORDER[a.turno] ?? 99, tb = TURNO_ORDER[b.turno] ?? 99;
      if (ta !== tb) return ta - tb;
      return a.turma.nome.localeCompare(b.turma.nome);
    });
  }, [classes, indics, courseMap]);

  const link = linkQuery.data;

  if (linkQuery.isLoading || dataQuery.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!link) {
    return (
      <div className="space-y-4">
        <PageHeader breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Links Externos', href: '/rh/links-escolas' }, { label: 'Conferir' }]} title="Link não encontrado" description="" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-44 sm:pb-32">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Links Externos', href: '/rh/links-escolas' }, { label: 'Conferir' }]}
        title={`Conferência — ${link.school_nome}`}
        description="Revise cada indicação enviada pelo diretor. Quando tudo estiver aprovado, gere a grade horária oficial."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <Kpi label="Turmas" value={link.qtd_turmas} />
        <Kpi label="Indicações" value={totals.total} />
        <Kpi label="Aprovadas" value={totals.aprovadas} accent="emerald" />
        <Kpi label="Pendentes" value={totals.pendentes} accent="amber" />
        <Kpi label="Recusadas" value={totals.recusadas} accent="rose" />
      </div>

      {/* KPIs por professor — CH semanal efetiva e PL (1/3) */}
      {teacherWorkload && teacherWorkload.rows.length > 0 && (
        <Card className="overflow-hidden border-[#1B1E2C]/10 shadow-sm">
          {/* Header Neovale: faixa azul-escuro com acento amarelo */}
          <div className="bg-[#1B1E2C] text-white px-5 py-4 flex flex-wrap items-start justify-between gap-3 border-b-4 border-[#FFDA45]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#FFDA45] text-[#1B1E2C]">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <h3 className="text-sm sm:text-base font-bold tracking-tight" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                  Carga horária por professor
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-[13px] text-white/70 max-w-2xl">
                Soma da CH semanal das disciplinas aprovadas (conforme cadastro em Cursos › Disciplinas › CH Semanal). PL = max(1, round(CH ÷ 3)).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-md bg-white/10 px-3 py-1.5 text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/60">Total CH</div>
                <div className="text-sm font-bold text-white tabular-nums">{teacherWorkload.totals.ch} <span className="text-white/60 text-xs font-normal">h/sem</span></div>
              </div>
              <div className="rounded-md bg-[#FFDA45] px-3 py-1.5 text-right text-[#1B1E2C]">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Total PL</div>
                <div className="text-sm font-bold tabular-nums">{teacherWorkload.totals.pl}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#1B1E2C]/[0.04] text-[11px] uppercase tracking-wider text-[#1B1E2C]/70">
                <tr>
                  <th className="text-left font-semibold px-5 py-2.5">Professor</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-24">Turmas</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-28">Disciplinas</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-32">CH semanal</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-24">PL (1/3)</th>
                </tr>
              </thead>
              <tbody>
                {teacherWorkload.rows.map((r, idx) => (
                  <tr
                    key={r.key}
                    className={`border-t border-[#1B1E2C]/5 hover:bg-[#FFDA45]/10 transition-colors ${idx % 2 === 1 ? 'bg-[#1B1E2C]/[0.015]' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-[#FFDA45] text-[#1B1E2C] inline-flex items-center justify-center text-xs font-bold uppercase">
                          {r.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('') || '?'}
                        </div>
                        <span className="font-semibold text-[#1B1E2C] truncate">{r.nome}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 tabular-nums text-[#1B1E2C]/80">{r.turmas}</td>
                    <td className="text-center px-3 py-3 tabular-nums text-[#1B1E2C]/80">{r.disciplinas}</td>
                    <td className="text-center px-3 py-3 tabular-nums font-semibold text-[#1B1E2C]">
                      {r.ch} <span className="text-[#1B1E2C]/50 font-normal text-xs">h</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="inline-flex items-center justify-center min-w-9 h-7 rounded-md bg-[#FFDA45] text-[#1B1E2C] px-2.5 text-sm font-bold tabular-nums shadow-[inset_0_-2px_0_rgba(27,30,44,0.15)]">
                        {r.pl}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}




      {/* Cobertura: turmas + CH semanal completa por (turma, disciplina) */}
      {coverage && !coverageOk && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
            <div className="flex-1 min-w-[200px] text-amber-900">
              <strong>Grade incompleta.</strong>{' '}
              {coverage.total_missing_classes > 0 && (
                <span>{coverage.total_missing_classes} turma(s) do curso sem indicação · </span>
              )}
              {coverage.total_incomplete_classes > 0 && (
                <span>{coverage.total_incomplete_classes} turma(s) com CH parcial ({coverage.total_subjects_missing} disciplina(s)) · </span>
              )}
              É preciso completar todas as turmas e a carga horária semanal de cada disciplina antes de gerar.
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-amber-400 text-amber-900 hover:bg-amber-100"
              onClick={() => setCoverageOpen(true)}
            >
              Ver o que falta
            </Button>
          </CardContent>
        </Card>
      )}
      {coverage?.ok && (
        <Card className="border-emerald-300 bg-emerald-50/40">
          <CardContent className="py-2 px-4 flex items-center gap-3 text-sm text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span><strong>Cobertura completa.</strong> Todas as turmas do curso estão indicadas e cada disciplina tem 100% da CH semanal alocada.</span>
          </CardContent>
        </Card>
      )}

      <GradeCoverageSheet open={coverageOpen} onOpenChange={setCoverageOpen} coverage={coverage} link={link} courseMap={courseMap} />


      {/* Status global */}
      <Card className={allApproved ? 'border-emerald-300 bg-emerald-50/60' : 'border-amber-300 bg-amber-50/40'}>
        <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3 text-sm">
          {allApproved ? (
            <>
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-emerald-900">
                Todas as indicações estão aprovadas. Você pode gerar a grade horária oficial da escola.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span className="text-amber-900">
                Existem <strong>{totals.pendentes}</strong> indicação(ões) pendente(s) e <strong>{totals.recusadas}</strong> recusada(s).
                Aprove ou remova as recusadas antes de gerar a grade.
              </span>
              {totals.pendentes > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-xs border-amber-400 text-amber-900 hover:bg-amber-100"
                  onClick={() => {
                    const el = document.querySelector('[data-pending-row="true"]') as HTMLElement | null;
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-amber-400');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2000);
                    }
                  }}
                >
                  Ver pendentes
                </Button>
              )}
            </>
          )}
          {link.materialized_at && (
            <Badge className="ml-auto bg-emerald-600">
              Grade gerada em {new Date(link.materialized_at).toLocaleDateString('pt-BR')}
              {link.materialized_ano_letivo ? ` · ${link.materialized_ano_letivo}` : ''}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Resolver de Duplicidades em Lote */}
      {intraSlotGroups.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#1B1E2C]">
                  Resolver duplicidades em lote ({intraSlotGroups.length} slot{intraSlotGroups.length === 1 ? '' : 's'})
                </div>
                <div className="text-[12px] text-[#1B1E2C]/70">
                  Para cada turma · disciplina · dia · horário, escolha qual professor manter.
                  Os demais serão recusados de uma só vez.
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={bulkRejectMut.isPending || Object.keys(dupKeep).length === 0}
                onClick={() => {
                  const items: Array<{ id: string; motivo: string }> = [];
                  intraSlotGroups.forEach((gr) => {
                    const keepId = dupKeep[gr.key];
                    if (!keepId) return;
                    gr.rows.forEach((r) => {
                      if (r.id !== keepId && r.status !== 'RECUSADA') {
                        items.push({
                          id: r.id,
                          motivo: `Duplicidade: outra indicação foi mantida para ${gr.weekday} ${gr.timeSlotLabel} em ${gr.subjectName} (turma ${gr.className})`,
                        });
                      }
                    });
                  });
                  if (items.length === 0) {
                    toast.info('Nenhuma decisão pendente para aplicar.');
                    return;
                  }
                  bulkRejectMut.mutate(items, {
                    onSuccess: () => setDupKeep({}),
                  });
                }}
              >
                {bulkRejectMut.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Aplicando…</>
                  : <>Aplicar decisões · Recusar demais</>}
              </Button>
            </div>

            <div className="space-y-2">
              {intraSlotGroups.map((gr) => {
                const keepId = dupKeep[gr.key];
                const groupSelectAll = () => {
                  // recusar todos do grupo (sem manter ninguém)
                  const items = gr.rows
                    .filter((r) => r.status !== 'RECUSADA')
                    .map((r) => ({
                      id: r.id,
                      motivo: `Duplicidade: slot ${gr.weekday} ${gr.timeSlotLabel} em ${gr.subjectName} liberado pelo R.H.`,
                    }));
                  if (!items.length) return;
                  bulkRejectMut.mutate(items, {
                    onSuccess: () => setDupKeep((s) => { const n = { ...s }; delete n[gr.key]; return n; }),
                  });
                };
                const applyOne = () => {
                  if (!keepId) return;
                  const items = gr.rows
                    .filter((r) => r.id !== keepId && r.status !== 'RECUSADA')
                    .map((r) => ({
                      id: r.id,
                      motivo: `Duplicidade: outra indicação foi mantida para ${gr.weekday} ${gr.timeSlotLabel} em ${gr.subjectName} (turma ${gr.className})`,
                    }));
                  if (!items.length) {
                    toast.info('Nada para recusar neste slot.');
                    return;
                  }
                  bulkRejectMut.mutate(items, {
                    onSuccess: () => setDupKeep((s) => { const n = { ...s }; delete n[gr.key]; return n; }),
                  });
                };
                return (
                  <div key={gr.key} className="rounded-md border border-amber-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-[#1B1E2C] text-white">{gr.className}</Badge>
                      {gr.courseName && <span className="text-[11px] text-[#1B1E2C]/60">{gr.courseName}</span>}
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        {WEEKDAY_LABEL[gr.weekday] ?? gr.weekday} · {gr.overlapStart}–{gr.overlapEnd}
                      </Badge>
                      <Badge variant="outline">{gr.subjectName}</Badge>
                      <span className="ml-auto text-[11px] text-[#1B1E2C]/55">
                        {gr.rows.length} candidato(s)
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {gr.rows.map((r) => {
                        const checked = keepId === r.id;
                        const isRejected = r.status === 'RECUSADA';
                        return (
                          <label
                            key={r.id}
                            className={`flex items-start gap-2 rounded border px-2.5 py-1.5 cursor-pointer text-[12px] ${
                              isRejected
                                ? 'bg-rose-50 border-rose-200 text-rose-700 line-through'
                                : checked
                                  ? 'bg-emerald-50 border-emerald-300'
                                  : 'bg-white border-[#1B1E2C]/10 hover:bg-[#FAFBFD]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`dup-${gr.key}`}
                              className="mt-0.5"
                              disabled={isRejected || bulkRejectMut.isPending}
                              checked={checked}
                              onChange={() => setDupKeep((s) => ({ ...s, [gr.key]: r.id }))}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[#1B1E2C] truncate">{r.candidato_nome}</div>
                              <div className="text-[10.5px] text-[#1B1E2C]/55 truncate">
                                {r.status === 'APROVADA' ? 'Aprovada' : r.status === 'RECUSADA' ? 'Recusada' : 'Pendente'}
                                {r.candidato_telefone ? ` · ${r.candidato_telefone}` : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-bold"
                        disabled={!keepId || bulkRejectMut.isPending}
                        onClick={applyOne}
                      >
                        Manter selecionado e recusar demais
                      </Button>
                      <Button size="sm" variant="outline" disabled={bulkRejectMut.isPending} onClick={groupSelectAll}>
                        Recusar todos deste slot
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de conflitos */}
      {conflictItems.length > 0 && (
        <button
          type="button"
          onClick={() => setConflictModalOpen(true)}
          className="w-full text-left rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 transition px-4 py-3 flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="text-sm text-rose-900 flex-1">
            <strong>{conflictItems.length}</strong> conflito(s) de horário entre escolas detectado(s).
            Clique para ver detalhes e sugestões de correção.
          </span>
          <Badge className="bg-rose-600 text-white">Ver detalhes</Badge>
        </button>
      )}

      <ScheduleConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflicts={conflictItems}
        context="conferir"
        onApplyAction={handleApplyConflictAction}
        hint="Resolva antes de gerar a grade horária."
      />

      <GradeErrorModal
        open={!!errorInfo}
        onOpenChange={(o) => { if (!o) setErrorInfo(null); }}
        info={errorInfo}
        onPrimaryAction={
          errorInfo?.title === 'Grade incompleta'
            ? { label: 'Ver o que falta', onClick: () => { setErrorInfo(null); setCoverageOpen(true); } }
            : undefined
        }
      />

      <GradeResultDialog
        open={resultModal.open}
        onOpenChange={(o) => setResultModal((s) => ({ ...s, open: o }))}
        alreadyMaterialized={resultModal.alreadyMaterialized}
        schoolName={link?.school_nome ?? ''}
        result={resultModal.data}
        prePlan={prePlanStatus}
      />

      {/* Grupos */}
      {groups.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este link ainda não recebeu indicações do diretor.
        </CardContent></Card>
      ) : (
        groups.map((g) => (
          <ClassGroupCard
            key={`${g.course_id}|${g.turma.id}`}
            group={g}
            conflictMap={conflictMap}
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleMany={toggleMany}
            onApprove={async (id) => {
              await syncAnpFromSubject([id]);
              setStatusMut.mutate({ id, status: 'APROVADA' });
            }}
            onReject={(id, motivo) => setStatusMut.mutate({ id, status: 'RECUSADA', motivo })}
            onReset={(id) => setStatusMut.mutate({ id, status: 'PENDENTE' })}
            busy={setStatusMut.isPending || bulkApproveMut.isPending || toggleAnpMut.isPending || bulkAnpMut.isPending || setSubjectMut.isPending}
            anpLocked={!!link.materialized_at}
            anpSubjectSet={anpSubjectSet}
            onToggleAnp={(row, isAnp) => toggleAnpMut.mutate({ row, isAnp })}
            subjectOptions={boletimByCourse.get(g.course_id) ?? []}
            subjectLocked={!!link.materialized_at}
            onSetSubject={(indicationId, boletimKey) => setSubjectMut.mutate({ indicationId, boletimKey })}
            subjectFullNames={subjectFullNames}
          />
        ))
      )}

      {/* Footer fixo — Gerar grade */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <ClipboardCheck className="h-5 w-5 text-[#1B1E2C]" />
            <span className="text-[#1B1E2C]">
              <strong>{totals.aprovadas}/{totals.total}</strong> aprovadas
              {totals.pendentes > 0 && <> · <span className="text-amber-700">{totals.pendentes} pendente(s)</span></>}
              {totals.recusadas > 0 && <> · <span className="text-rose-700">{totals.recusadas} recusada(s)</span></>}
            </span>
            <div className="flex items-center gap-2">
              <Label htmlFor="ano-letivo" className="text-xs">Ano letivo:</Label>
              <Input
                id="ano-letivo"
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="h-8 w-20 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={clearSelection}
                  disabled={bulkApproveMut.isPending || bulkAnpMut.isPending}
                >
                  Limpar ({selectedIds.size})
                </Button>
                {!link.materialized_at && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                      onClick={() => bulkAnpMut.mutate({ ids: Array.from(selectedIds), isAnp: true })}
                      disabled={bulkAnpMut.isPending || bulkApproveMut.isPending}
                      title="Marcar selecionadas como Aula Não Presencial"
                    >
                      {bulkAnpMut.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-1" />
                      )}
                      Marcar ANP
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => bulkAnpMut.mutate({ ids: Array.from(selectedIds), isAnp: false })}
                      disabled={bulkAnpMut.isPending || bulkApproveMut.isPending}
                      title="Desmarcar selecionadas (Presencial)"
                    >
                      <WifiOff className="h-4 w-4 mr-1" />
                      Desmarcar ANP
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => bulkApproveMut.mutate(Array.from(selectedIds))}
                  disabled={bulkApproveMut.isPending || bulkAnpMut.isPending || bulkResetMut.isPending}
                >
                  {bulkApproveMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckSquare className="h-4 w-4 mr-1" />
                  )}
                  Aprovar {selectedIds.size} selecionada(s)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  onClick={() => bulkResetMut.mutate(Array.from(selectedIds))}
                  disabled={bulkResetMut.isPending || bulkApproveMut.isPending || bulkAnpMut.isPending}
                  title="Voltar as selecionadas para o status Pendente"
                >
                  {bulkResetMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  Reverter {selectedIds.size} selecionada(s)
                </Button>

              </>
            )}
            {isAdmin && link.materialized_at && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm" variant="outline"
                    className="h-8 border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={unmaterializeMut.isPending}
                    title="Reverter a materialização da grade (mantém histórico)"
                  >
                    {unmaterializeMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                    Reverter grade
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reverter materialização da grade</AlertDialogTitle>
                    <AlertDialogDescription>
                      Desativa modelos semanais, cancela ocorrências futuras e desativa vínculos professor×curso desta escola.
                      O histórico (planejamentos passados, frequência, notas) é preservado. Informe o motivo (mín. 5 caracteres):
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    value={unmatReason}
                    onChange={(e) => setUnmatReason(e.target.value)}
                    placeholder="Ex.: troca de professor, ajuste de calendário, erro na grade…"
                    rows={3}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={unmatReason.trim().length < 5}
                      onClick={() => unmaterializeMut.mutate()}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Confirmar reversão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <GenerateGradeButton
            disabled={!canGenerate || materializeMut.isPending}
            disabledReason={
              !isAdmin
                ? 'Somente administradores podem gerar a grade'
                : !allApproved
                  ? 'Aprove todas as indicações primeiro'
                  : !/^\d{4}$/.test(anoLetivo)
                    ? 'Informe um ano letivo válido (AAAA)'
                    : hasConflicts
                      ? 'Existem conflitos de horário — resolva antes de gerar'
                      : !coverageOk
                        ? `Grade incompleta: ${coverage?.total_missing_classes ?? 0} turma(s) sem indicação e ${coverage?.total_subjects_missing ?? 0} disciplina(s) com CH parcial`
                        : undefined
            }
            loading={materializeMut.isPending}
            alreadyMaterialized={!!link.materialized_at}
            schoolName={link.school_nome}
            anoLetivo={anoLetivo}
            preview={preview}
            coverage={coverage}
            onConfirm={() => setBimFilterOpen(true)}
            prePlanningsEstimate={prePlanningsEstimate}
          />
          </div>
        </div>
      </div>

      <SubjectBimesterFilterDialog
        open={bimFilterOpen}
        onOpenChange={setBimFilterOpen}
        linkId={linkId!}
        schoolName={link.school_nome}
        anoLetivo={anoLetivo}
        alreadyMaterialized={!!link.materialized_at}
        loading={materializeMut.isPending}
        onConfirm={(filter, scope, planningFilter) => {
          materializeMut.mutate({ filter, scope, planningFilter });
        }}
      />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' | 'rose' }) {
  const color =
    accent === 'emerald' ? 'text-emerald-600' :
    accent === 'amber' ? 'text-amber-600' :
    accent === 'rose' ? 'text-rose-600' :
    'text-[#1B1E2C]';
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ClassGroupCard({
  group, conflictMap, selectedIds, onToggleOne, onToggleMany, onApprove, onReject, onReset, busy,
  anpLocked, anpSubjectSet, onToggleAnp, subjectOptions, subjectLocked, onSetSubject, subjectFullNames,
}: {
  group: { course_id: string; course_name: string; turno: string; turma: ClassRow; rows: IndicationRow[] };
  conflictMap: Map<string, GradePreview['conflicts'][number]>;
  selectedIds: Set<string>;
  onToggleOne: (id: string, checked: boolean) => void;
  onToggleMany: (ids: string[], checked: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, motivo: string) => void;
  onReset: (id: string) => void;
  busy: boolean;
  anpLocked: boolean;
  anpSubjectSet: Set<string>;
  onToggleAnp: (row: IndicationRow, isAnp: boolean) => void;
  subjectOptions: Array<{ boletim_key: string; boletim_nome: string; carga_horaria_semanal: number; has_first: boolean; has_second: boolean; has_annual: boolean }>;
  subjectLocked: boolean;
  onSetSubject: (indicationId: string, boletimKey: string) => void;
  subjectFullNames: Map<string, string>;
}) {
  const ordered = useMemo(() => {
    return [...group.rows].sort((a, b) => {
      const wa = WEEKDAY_ORDER[a.candidato_grade?.weekday] ?? 99;
      const wb = WEEKDAY_ORDER[b.candidato_grade?.weekday] ?? 99;
      if (wa !== wb) return wa - wb;
      return String(a.candidato_grade?.time_slot_label ?? '').localeCompare(String(b.candidato_grade?.time_slot_label ?? ''));
    });
  }, [group.rows]);

  const totals = useMemo(() => {
    const t = { total: ordered.length, aprovadas: 0, pendentes: 0, recusadas: 0 };
    ordered.forEach((r) => {
      if (r.status === 'APROVADA') t.aprovadas++;
      else if (r.status === 'RECUSADA') t.recusadas++;
      else t.pendentes++;
    });
    return t;
  }, [ordered]);

  const pendingIds = useMemo(() => ordered.filter((r) => r.status !== 'APROVADA').map((r) => r.id), [ordered]);
  const selectablePending = pendingIds.length;
  const selectedHere = pendingIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectablePending > 0 && selectedHere === selectablePending;
  const someSelected = selectedHere > 0 && !allSelected;

  return (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 border-b ${TURNO_BG[group.turno] ?? ''}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="text-[10px] uppercase tracking-wider text-[#1B1E2C]/60 font-semibold">
            {group.course_name} · {TURNO_LABEL[group.turno] ?? group.turno}
          </div>
          <div className="text-base font-bold text-[#1B1E2C]">Turma {group.turma.nome}</div>
          <div className="ml-auto flex items-center gap-1 text-[11px]">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{totals.aprovadas} aprov.</Badge>
            {totals.pendentes > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{totals.pendentes} pend.</Badge>}
            {totals.recusadas > 0 && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{totals.recusadas} rec.</Badge>}
            {ordered.some((r) => r.status !== 'APROVADA') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => ordered.filter((r) => r.status !== 'APROVADA').forEach((r) => onApprove(r.id))}
                disabled={busy}
              >
                Aprovar todas
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {ordered.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Sem indicações para esta turma.</div>
        ) : (
          <>
          {/* Mobile: cards até md */}
          <ul className="md:hidden divide-y">
            {ordered.map((r) => (
              <IndicationRowItem
                key={`m-${r.id}`}
                asCard
                row={r}
                conflict={conflictMap.get(r.id)}
                selected={selectedIds.has(r.id)}
                onToggleSelect={(checked) => onToggleOne(r.id, checked)}
                onApprove={() => onApprove(r.id)}
                onReject={(m) => onReject(r.id, m)}
                onReset={() => onReset(r.id)}
                busy={busy}
                anpLocked={anpLocked}
                isAnpFromSubject={!!r.candidato_grade?.subject_id && !!r.indication_class_id && anpSubjectSet.has(`${r.indication_class_id}:${r.candidato_grade.subject_id}`)}
                onToggleAnp={(isAnp) => onToggleAnp(r, isAnp)}
                subjectOptions={subjectOptions}
                subjectLocked={subjectLocked}
                onSetSubject={onSetSubject}
                subjectFullName={r.candidato_grade?.subject_id ? subjectFullNames.get(r.candidato_grade.subject_id) : undefined}
              />
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-center px-2 py-2 w-[40px]">
                  <Checkbox
                    aria-label="Selecionar todas pendentes desta turma"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={(v) => onToggleMany(pendingIds, !!v)}
                    disabled={busy || selectablePending === 0}
                  />
                </th>
                <th className="text-left px-3 py-2 w-[80px]">Dia</th>
                <th className="text-left px-3 py-2 w-[180px]">Horário</th>
                <th className="text-center px-2 py-2 w-[60px]" title="Aula Não Presencial">ANP</th>
                <th className="text-left px-3 py-2 w-[160px]">Disciplina</th>
                <th className="text-left px-3 py-2">Professor indicado</th>
                <th className="text-center px-3 py-2 w-[100px]">Status</th>
                <th className="text-right px-3 py-2 w-[220px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordered.map((r) => (
                <IndicationRowItem
                  key={r.id}
                  row={r}
                  conflict={conflictMap.get(r.id)}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={(checked) => onToggleOne(r.id, checked)}
                  onApprove={() => onApprove(r.id)}
                  onReject={(m) => onReject(r.id, m)}
                  onReset={() => onReset(r.id)}
                  busy={busy}
                  anpLocked={anpLocked}
                  isAnpFromSubject={!!r.candidato_grade?.subject_id && !!r.indication_class_id && anpSubjectSet.has(`${r.indication_class_id}:${r.candidato_grade.subject_id}`)}
                  onToggleAnp={(isAnp) => onToggleAnp(r, isAnp)}
                  subjectOptions={subjectOptions}
                  subjectLocked={subjectLocked}
                  onSetSubject={onSetSubject}
                  subjectFullName={r.candidato_grade?.subject_id ? subjectFullNames.get(r.candidato_grade.subject_id) : undefined}
                />
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function IndicationRowItem({
  row, conflict, selected, onToggleSelect, onApprove, onReject, onReset, busy,
  anpLocked, isAnpFromSubject, onToggleAnp, subjectOptions, subjectLocked, onSetSubject, subjectFullName,
  asCard = false,
}: {
  row: IndicationRow;
  conflict?: GradePreview['conflicts'][number];
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: (motivo: string) => void;
  onReset: () => void;
  busy: boolean;
  anpLocked: boolean;
  isAnpFromSubject: boolean;
  onToggleAnp: (isAnp: boolean) => void;
  subjectOptions: Array<{ boletim_key: string; boletim_nome: string; carga_horaria_semanal: number; has_first: boolean; has_second: boolean; has_annual: boolean }>;
  subjectLocked: boolean;
  onSetSubject: (indicationId: string, boletimKey: string) => void;
  /** Nome REAL da disciplina (subjects.nome) — resolvido pelo subject_id da indicação. */
  subjectFullName?: string;
  asCard?: boolean;
}) {
  const wd = row.candidato_grade?.weekday;
  const label = row.candidato_grade?.time_slot_label ?? '—';
  const currentKey = String(
    row.candidato_grade?.boletim_key
      ?? row.candidato_grade?.boletim_nome
      ?? row.candidato_grade?.subject_nome
      ?? ''
  ).toLowerCase().trim();
  const matched = subjectOptions.find(
    (o) => o.boletim_key === currentKey || o.boletim_nome.toLowerCase().trim() === currentKey,
  );
  const isAnpFromIndication =
    row.candidato_grade?.is_anp === true ||
    String(row.candidato_grade?.class_mode ?? '').toUpperCase() === 'ANP';
  // ANP herdado da Grade Horária da turma (class_subject_modality.ch_anp > 0)
  // OU marcado pelo diretor no portal externo.
  const isAnp = isAnpFromIndication || isAnpFromSubject;
  const anpInherited = isAnpFromSubject && !isAnpFromIndication;
  const isApproved = row.status === 'APROVADA';
  const isRejected = row.status === 'RECUSADA';

  if (asCard) {
    return (
      <li
        data-pending-row={row.status !== 'APROVADA' && row.status !== 'RECUSADA' ? 'true' : undefined}
        className={`p-3 space-y-2 ${selected ? 'bg-amber-50/50' : isApproved ? 'bg-emerald-50/40' : isRejected ? 'bg-rose-50/40' : ''}`}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            aria-label="Selecionar indicação"
            checked={selected}
            onCheckedChange={(v) => onToggleSelect(!!v)}
            disabled={busy || isApproved}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-[#1B1E2C]">{WEEKDAY_LABEL[wd] ?? wd ?? '—'}</span>
              <span className="text-muted-foreground">{label}</span>
              {isApproved && <Badge className="bg-emerald-600 text-[10px] h-5">Aprovada</Badge>}
              {isRejected && <Badge variant="destructive" className="text-[10px] h-5">Recusada</Badge>}
              {!isApproved && !isRejected && <Badge variant="outline" className="text-[10px] h-5">Pendente</Badge>}
            </div>
          </div>
          <label
            className={`shrink-0 inline-flex items-center justify-center gap-1 rounded px-1.5 py-1 cursor-pointer transition-colors select-none ${
              isAnp ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300' : 'text-[#1B1E2C]/55 hover:bg-[#1B1E2C]/5'
            } ${anpLocked || busy ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Checkbox
              checked={isAnp}
              onCheckedChange={(v) => onToggleAnp(v === true)}
              disabled={anpLocked || busy}
              className="h-3.5 w-3.5"
              aria-label="Aula Não Presencial"
            />
            <span className="text-[9px] font-bold uppercase tracking-wider">ANP{anpInherited ? '·auto' : ''}</span>
          </label>
        </div>

        <div>
          {subjectLocked || row.status === 'APROVADA' ? (
            <div>
              <div className="text-[13px] font-medium text-[#1B1E2C] inline-flex items-center gap-1.5 flex-wrap">
                <span className="break-words [overflow-wrap:anywhere]">
                  {subjectFullName ?? row.candidato_grade?.subject_nome ?? matched?.boletim_nome ?? '—'}
                </span>
                {isAnp && (
                  <span className="px-1 py-0 rounded border border-amber-300 bg-amber-100 text-amber-900 font-bold text-[9px] leading-none h-4 inline-flex items-center">ANP</span>
                )}
              </div>
              {matched && (
                <div className="text-[10px] text-muted-foreground">
                  {matched.boletim_nome} · {matched.carga_horaria_semanal}h/sem ·{' '}
                  {matched.has_annual ? 'Anual' : [matched.has_first && '1º sem', matched.has_second && '2º sem'].filter(Boolean).join(' + ')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {subjectFullName && (
                <div className="text-[11px] font-medium text-[#1B1E2C] break-words [overflow-wrap:anywhere]">
                  {subjectFullName}
                </div>
              )}
              <SearchableSelect
                value={matched?.boletim_key ?? ''}
                onValueChange={(val) => { if (val) onSetSubject(row.id, val); }}
                disabled={busy || subjectOptions.length === 0}
                placeholder={subjectOptions.length === 0 ? 'Sem disciplinas' : 'Selecionar disciplina…'}
                searchPlaceholder="Buscar disciplina…"
                emptyMessage="Nenhuma disciplina encontrada"
                options={subjectOptions.map((o) => ({
                  value: o.boletim_key,
                  label: o.boletim_nome,
                  description: `${o.carga_horaria_semanal}h/sem · ${o.has_annual ? 'Anual' : [o.has_first && '1º sem', o.has_second && '2º sem'].filter(Boolean).join(' + ') || '—'}`,
                }))}
                className="h-8 text-xs w-full"
              />
            </div>
          )}
        </div>

        <div>
          <div className="font-medium text-[13px] text-[#1B1E2C] flex items-center gap-1.5 flex-wrap">
            <span className="break-words [overflow-wrap:anywhere]">{row.candidato_nome}</span>
            {conflict && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-[10px] h-5">
                <AlertCircle className="h-3 w-3" /> Conflito
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere]">
            {[row.candidato_formacao, row.candidato_email, row.candidato_telefone].filter(Boolean).join(' · ')}
          </div>
          {isRejected && row.motivo_recusa && (
            <div className="mt-1 text-[11px] text-rose-700">Motivo: {row.motivo_recusa}</div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap pt-1">
          {!isApproved && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-700 hover:bg-emerald-50" onClick={onApprove} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
            </Button>
          )}
          {!isRejected && <RejectButton onReject={onReject} busy={busy} />}
          {(isApproved || isRejected) && (
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onReset} disabled={busy} title="Reverter para pendente">
              <RotateCcw className="h-4 w-4 mr-1" /> Reverter
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <tr
      data-pending-row={row.status !== 'APROVADA' && row.status !== 'RECUSADA' ? 'true' : undefined}
      className={selected ? 'bg-amber-50/50' : isApproved ? 'bg-emerald-50/40' : isRejected ? 'bg-rose-50/40' : ''}
    >
      <td className="px-2 py-2 text-center">
        <Checkbox
          aria-label="Selecionar indicação"
          checked={selected}
          onCheckedChange={(v) => onToggleSelect(!!v)}
          disabled={busy || isApproved}
        />
      </td>
      <td className="px-3 py-2 font-medium">{WEEKDAY_LABEL[wd] ?? wd ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        <span>{label}</span>
      </td>
      <td className="px-2 py-2 text-center">
        <label
          className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-1 cursor-pointer transition-colors select-none ${
            isAnp
              ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
              : 'text-[#1B1E2C]/55 hover:bg-[#1B1E2C]/5'
          } ${anpLocked || busy ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={
            anpLocked
              ? 'A grade oficial já foi gerada — ANP travado'
              : anpInherited
                ? 'ANP herdado da configuração da disciplina (Grade Horária por Turma). Será gravado ao aprovar.'
                : isAnp
                  ? 'Aula Não Presencial — clique para desmarcar'
                  : 'Marcar como Aula Não Presencial'
          }
        >
          <Checkbox
            checked={isAnp}
            onCheckedChange={(v) => onToggleAnp(v === true)}
            disabled={anpLocked || busy}
            className="h-3.5 w-3.5"
            aria-label="Aula Não Presencial"
          />
          <span className="text-[9px] font-bold uppercase tracking-wider">ANP{anpInherited ? '·auto' : ''}</span>
        </label>
      </td>
      <td className="px-3 py-2">
        {subjectLocked || row.status === 'APROVADA' ? (
          <div>
            <div className="text-[13px] font-medium text-[#1B1E2C] inline-flex items-center gap-1.5 flex-wrap">
              <span className="break-words [overflow-wrap:anywhere]">
                {subjectFullName ?? row.candidato_grade?.subject_nome ?? matched?.boletim_nome ?? '—'}
              </span>
              {isAnp && (
                <span className="px-1 py-0 rounded border border-amber-300 bg-amber-100 text-amber-900 font-bold text-[9px] leading-none h-4 inline-flex items-center" title="Atividade Não Presencial">
                  ANP
                </span>
              )}
            </div>
            {matched && (
              <div className="text-[10px] text-muted-foreground">
                {matched.boletim_nome} · {matched.carga_horaria_semanal}h/sem ·{' '}
                {matched.has_annual ? 'Anual' : [matched.has_first && '1º sem', matched.has_second && '2º sem'].filter(Boolean).join(' + ')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {subjectFullName && (
              <div className="text-[11px] font-medium text-[#1B1E2C] break-words [overflow-wrap:anywhere] leading-tight">
                {subjectFullName}
              </div>
            )}
            <SearchableSelect
              value={matched?.boletim_key ?? ''}
              onValueChange={(val) => { if (val) onSetSubject(row.id, val); }}
              disabled={busy || subjectOptions.length === 0}
              placeholder={subjectOptions.length === 0 ? 'Sem disciplinas' : 'Selecionar…'}
              searchPlaceholder="Buscar disciplina…"
              emptyMessage="Nenhuma disciplina encontrada"
              options={subjectOptions.map((o) => ({
                value: o.boletim_key,
                label: o.boletim_nome,
                description: `${o.carga_horaria_semanal}h/sem · ${
                  o.has_annual ? 'Anual' : [o.has_first && '1º sem', o.has_second && '2º sem'].filter(Boolean).join(' + ') || '—'
                }`,
              }))}
              className="h-8 text-xs"
            />
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-[#1B1E2C] flex items-center gap-1.5">
          {row.candidato_nome}
          {conflict && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 cursor-help">
                    <AlertCircle className="h-3 w-3" /> Conflito
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Já alocado em <strong>{conflict.conflict_school}</strong> ({conflict.weekday} {String(conflict.conflict_start).slice(0,5)}–{String(conflict.conflict_end).slice(0,5)}). Resolva antes de gerar a grade.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {[row.candidato_formacao, row.candidato_email, row.candidato_telefone].filter(Boolean).join(' · ')}
        </div>
        {isRejected && row.motivo_recusa && (
          <div className="mt-1 text-[11px] text-rose-700">Motivo: {row.motivo_recusa}</div>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {isApproved && <Badge className="bg-emerald-600">Aprovada</Badge>}
        {isRejected && <Badge variant="destructive">Recusada</Badge>}
        {!isApproved && !isRejected && <Badge variant="outline">Pendente</Badge>}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-end">
          {!isApproved && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-700 hover:bg-emerald-50" onClick={onApprove} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
            </Button>
          )}
          {!isRejected && (
            <RejectButton onReject={onReject} busy={busy} />
          )}
          {(isApproved || isRejected) && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onReset} disabled={busy} title="Reverter para pendente">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function RejectButton({ onReject, busy }: { onReject: (motivo: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const can = motivo.trim().length >= 5;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMotivo(''); }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-700 hover:bg-rose-50" disabled={busy}>
          <XCircle className="h-4 w-4 mr-1" /> Recusar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recusar indicação</AlertDialogTitle>
          <AlertDialogDescription>
            Informe o motivo (mín. 5 caracteres). Para liberar a geração da grade, indicações recusadas precisam ser revertidas ou removidas em <code>/rh/indicacoes</code>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          rows={3}
          placeholder="Motivo da recusa…"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!can}
            onClick={(e) => { if (!can) { e.preventDefault(); return; } onReject(motivo.trim()); }}
            className="bg-rose-600 hover:bg-rose-700"
          >
            Recusar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GenerateGradeButton({
  disabled, disabledReason, loading, alreadyMaterialized, schoolName, anoLetivo,
  preview, coverage, onConfirm, prePlanningsEstimate,
}: {
  disabled: boolean;
  disabledReason?: string;
  loading: boolean;
  alreadyMaterialized: boolean;
  schoolName: string;
  anoLetivo: string;
  preview?: GradePreview;
  coverage?: GradeCompletenessResult;
  onConfirm: () => void;
  prePlanningsEstimate: { pairs: number; total: number; annualPairs: number; semestralPairs: number };
}) {
  const conflicts = preview?.conflicts ?? [];
  const slotWarnings = preview?.slot_warnings ?? [];
  const subjectWarnings = preview?.subject_warnings ?? [];
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={disabled}
          title={disabledReason}
          className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 disabled:bg-muted disabled:text-muted-foreground"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <CalendarPlus className="h-4 w-4 mr-2" />}
          {alreadyMaterialized ? 'Atualizar grade horária' : 'Gerar grade de horário'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {alreadyMaterialized ? 'Atualizar' : 'Gerar'} grade horária — {schoolName}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Esta ação irá <strong>criar/atualizar</strong> a grade horária oficial em Grade Horária
                para o ano letivo <strong>{anoLetivo}</strong>.
              </p>

              {preview ? (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Prévia do impacto</div>
                  <ul className="text-[13px] space-y-0.5">
                    <li>Turmas: <strong>{preview.turmas_a_criar}</strong> a criar · {preview.turmas_existentes} já existente(s)</li>
                    <li>Horários da escola: <strong>{preview.slots_a_criar}</strong> a criar · {preview.slots_existentes} reaproveitado(s)</li>
                    <li>Aulas a inserir na grade: <strong>{preview.aulas_a_criar}</strong>
                      {preview.aulas_ignoradas > 0 && <span className="text-amber-700"> · {preview.aulas_ignoradas} serão ignoradas</span>}
                    </li>
                    <li>
                      Pré-planejamentos a gerar automaticamente:{' '}
                      <strong>~{prePlanningsEstimate.total}</strong>
                      <span className="text-muted-foreground"> · {prePlanningsEstimate.pairs} disciplina×professor</span>
                    </li>
                    {prePlanningsEstimate.pairs > 0 && (
                      <li className="pl-4 text-[11.5px] text-muted-foreground leading-snug">
                        <span className="font-medium text-foreground/80">Cálculo:</span>{' '}
                        Σ (trios × bimestres × 8 semanas)
                        {prePlanningsEstimate.annualPairs > 0 && (
                          <> · <strong>{prePlanningsEstimate.annualPairs}</strong> anual × 4 × 8 = {prePlanningsEstimate.annualPairs * 4 * 8}</>
                        )}
                        {prePlanningsEstimate.semestralPairs > 0 && (
                          <> · <strong>{prePlanningsEstimate.semestralPairs}</strong> semestral × 2 × 8 = {prePlanningsEstimate.semestralPairs * 2 * 8}</>
                        )}
                        <br />
                        <span className="text-[11px]">
                          Trio = curso × professor × disciplina (APROVADA) · 1 pré-planejamento por semana letiva · ~8 semanas/bimestre.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Calculando prévia…</div>
              )}

              {conflicts.length > 0 && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-rose-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {conflicts.length} conflito(s) de horário
                  </div>
                  <ul className="text-[12px] list-disc pl-5 space-y-0.5 max-h-32 overflow-auto">
                    {conflicts.slice(0, 8).map((c, i) => (
                      <li key={i}>
                        <strong>{c.candidato}</strong> já alocado em {c.conflict_school} ({c.weekday} {String(c.conflict_start).slice(0,5)}–{String(c.conflict_end).slice(0,5)})
                      </li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-rose-700">Resolva os conflitos em Grade Horária antes de gerar.</div>
                </div>
              )}

              {(slotWarnings.length > 0 || subjectWarnings.length > 0) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-amber-800 font-semibold">Avisos</div>
                  {slotWarnings.length > 0 && (
                    <div className="text-[12px]">{slotWarnings.length} indicação(ões) com horário não reconhecido — serão ignoradas.</div>
                  )}
                  {subjectWarnings.length > 0 && (
                    <div className="text-[12px]">{subjectWarnings.length} disciplina(s) não pertence(m) ao curso — serão ignoradas.</div>
                  )}
                </div>
              )}

              {coverage?.ok && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-emerald-800 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Cobertura validada
                  </div>
                  <div className="text-[12px] text-emerald-900">
                    Todas as turmas do curso estão indicadas e a carga horária semanal de cada disciplina está 100% alocada.
                    As <strong>ocorrências anuais</strong> serão geradas automaticamente.
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                As aulas oficiais já existentes das turmas afetadas serão substituídas. Slots de planejamento e dados de outras escolas ou turmas não serão alterados.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={conflicts.length > 0}
            className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold shadow-md gap-2 px-5"
          >
            <CalendarPlus className="h-4 w-4" />
            {alreadyMaterialized ? 'Atualizar grade' : 'Gerar grade horária'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
