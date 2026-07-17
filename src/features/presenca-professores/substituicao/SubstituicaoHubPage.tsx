import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Replace, ClipboardList, UserCog, DollarSign, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard } from '@/components/NeovaleHubCard';
import { useOrganization } from '@/hooks/useOrganization';
import { isAdminRole } from '@/lib/roles';
import { useHasFinancialAccess } from './components/FinancialAccessGuard';
import { useTSRList } from './hooks/useTeacherSubstitution';
import { useAuth } from '@/contexts/AuthContext';

export default function SubstituicaoHubPage() {
  const { userRole } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasFinancial = useHasFinancialAccess();
  const isAdmin = isAdminRole(userRole);
  const isCoord = userRole === 'coordenador' || isAdmin;
  const isRh = userRole === 'rh' || isAdmin;

  // KPIs leves (reaproveita listas com cache)
  const { data: allRows = [] } = useTSRList({});

  const coordPending = useMemo(
    () => allRows.filter(r => r.status === 'returned_to_coordinator').length,
    [allRows],
  );
  const coordExecPending = useMemo(
    () => allRows.filter(r => r.status === 'substitution_completed').length,
    [allRows],
  );
  const rhQueue = useMemo(
    () => allRows.filter(r => r.status === 'request_created').length,
    [allRows],
  );
  const rhValidationPending = useMemo(
    () => allRows.filter(r => ['signed_report_uploaded', 'pending_rh_validation'].includes(r.status)).length,
    [allRows],
  );
  const finPending = useMemo(
    () => allRows.filter(r => ['approved_for_payment', 'payment_pending'].includes(r.status)).length,
    [allRows],
  );
  const myCoord = useMemo(
    () => allRows.filter(r => (r as any).requested_by === user?.id).length,
    [allRows, user?.id],
  );

  // Auto-redirect quando o papel só tem uma tela relevante
  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'rh' && !isAdmin) {
      navigate('/presenca-professores/substituicao/rh', { replace: true });
    } else if (userRole === 'coordenador' && !hasFinancial) {
      navigate('/presenca-professores/substituicao/coordenacao', { replace: true });
    }
  }, [userRole, isAdmin, hasFinancial, navigate]);

  const coordBadge =
    coordPending > 0 ? `${coordPending} aguardando você`
    : coordExecPending > 0 ? `${coordExecPending} para confirmar execução`
    : (myCoord > 0 ? `${myCoord} minhas` : undefined);

  const rhBadge =
    rhQueue > 0 ? `${rhQueue} na fila`
    : rhValidationPending > 0 ? `${rhValidationPending} para validar`
    : undefined;

  const cards = [
    isCoord && {
      title: 'Coordenação',
      description: 'Solicitar substituições, acompanhar atendimento do R.H. e informar a escola.',
      url: '/presenca-professores/substituicao/coordenacao',
      icon: ClipboardList,
      tag: '01 / Coordenação',
      badge: coordBadge,
    },
    isRh && {
      title: 'R.H.',
      description: 'Atender solicitações, validar documentação e encaminhar ao Financeiro.',
      url: '/presenca-professores/substituicao/rh',
      icon: UserCog,
      tag: '02 / R.H.',
      badge: rhBadge,
    },
    hasFinancial && {
      title: 'Financeiro',
      description: 'Documentação, cálculo de hora-aula e pagamento das substituições finalizadas.',
      url: '/presenca-professores/substituicao/financeiro',
      icon: DollarSign,
      tag: '03 / Financeiro',
      badge: finPending > 0 ? `${finPending} aguardando pagamento` : undefined,
    },
    isAdmin && {
      title: 'Acessos do Financeiro',
      description: 'Conceda ou revogue acesso ao módulo financeiro de substituições.',
      url: '/presenca-professores/substituicao/financeiro/acessos',
      icon: ShieldCheck,
      tag: '04 / Acesso',
    },
  ].filter(Boolean) as any[];

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição' },
        ]}
        title="Substituição"
        description="Escolha o painel correspondente ao seu papel no fluxo de substituição docente."
        icon={Replace}
        variant="hero"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => <NeovaleHubCard key={c.url} {...c} />)}
      </div>
    </div>
  );
}
