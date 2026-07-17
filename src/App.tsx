import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolHubProvider } from "@/contexts/SchoolHubContext";
import { AuthGuard } from "@/components/AuthGuard";
import { FinanceiroGuard } from "@/components/FinanceiroGuard";
import { MainLayout } from "@/layouts/MainLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { prefetchCommonRoutes } from "@/lib/route-prefetch";

// Pages
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import PlaceholderPage from "@/pages/PlaceholderPage";
import { useOneSignalBoot } from "@/hooks/useOneSignalBoot";

// Feature Pages (lazy loaded for smaller initial bundle)
const UsersPage = lazy(() => import("@/features/users/UsersPage"));
const EscolasPage = lazy(() => import("@/features/escolas/EscolasPage"));
const SchoolDetailPage = lazy(() => import("@/features/escolas/SchoolDetailPage"));
const SchoolCoursesPage = lazy(() => import("@/features/escolas/SchoolCoursesPage"));
const SchoolProfessorsPage = lazy(() => import("@/features/escolas/SchoolProfessorsPage"));
const SchoolSubjectsPage = lazy(() => import("@/features/escolas/SchoolSubjectsPage"));
const SchoolClassGroupsPage = lazy(() => import("@/features/escolas/SchoolClassGroupsPage"));
const ItinerariosPage = lazy(() => import("@/features/itinerarios/ItinerariosPage"));
const CursosPage = lazy(() => import("@/features/cursos/CursosPage"));
const CourseSchoolsPage = lazy(() => import("@/features/cursos/CourseSchoolsPage"));
const DisciplinasPage = lazy(() => import("@/features/disciplinas/DisciplinasPage"));
const LessonMaterialsPage = lazy(() => import("@/features/disciplinas/LessonMaterialsPage"));
const SubjectWeeklyCalendarPage = lazy(() => import("@/features/disciplinas/SubjectWeeklyCalendarPage"));
const ProfessorDetailPage = lazy(() => import("@/features/professores/ProfessorDetailPage"));
const DocumentosPage = lazy(() => import("@/features/professores/DocumentosPage"));
const AlunosPage = lazy(() => import("@/features/alunos/AlunosPage"));
const ProfessoresPage = lazy(() => import("@/features/professores/ProfessoresPage"));
const ProfessoresKanbanPage = lazy(() => import("@/features/professores/ProfessoresKanbanPage"));
const TalentosPage = lazy(() => import("@/features/talentos/TalentosPage"));
const TalentoFormPage = lazy(() => import("@/features/talentos/TalentoFormPage"));
const RhHubPage = lazy(() => import("@/features/rh/RhHubPage"));

const RhConfiguracoesPage = lazy(() => import("@/features/rh/pages/RhConfiguracoesPage"));
const RhPlanosPage = lazy(() => import("@/features/rh/pages/RhPlanosPage"));
const RhPlanoDetailPage = lazy(() => import("@/features/rh/pages/RhPlanoDetailPage"));
const RhIndicacoesPage = lazy(() => import("@/features/rh/pages/RhIndicacoesPage"));

const RhAlocacaoBoardPage = lazy(() => import("@/features/rh/pages/RhAlocacaoBoardPage"));
const RhProfessoresPage = lazy(() => import("@/features/rh/pages/RhProfessoresPage"));
const RhDemandaCalcPage = lazy(() => import("@/features/rh/pages/RhDemandaCalcPage"));
const ExternalIndicationPage = lazy(() => import("@/features/rh/pages/ExternalIndicationPage"));
const ExternalSchoolIndicationPage = lazy(() => import("@/features/rh/pages/ExternalSchoolIndicationPage"));
const RhLinksEscolasPage = lazy(() => import("@/features/rh/pages/RhLinksEscolasPage"));
const RhLinkConferirPage = lazy(() => import("@/features/rh/pages/RhLinkConferirPage"));
const AptosContratacaoPage = lazy(() => import("@/features/rh/pages/AptosContratacaoPage"));
const AptosContratacaoDetailPage = lazy(() => import("@/features/rh/pages/AptosContratacaoDetailPage"));
const AptosContratacaoAuditPage = lazy(() => import("@/features/rh/pages/AptosContratacaoAuditPage"));
const CalendarioPage = lazy(() => import("@/features/calendario/CalendarioPage"));
const PlanejamentoPage = lazy(() => import("@/features/planejamento/PlanejamentoPage"));
const CoordinatorReviewPage = lazy(() => import("@/features/planejamento/CoordinatorReviewPage"));
const CoordinatorPlanningCheckPage = lazy(() => import("@/features/planejamento/CoordinatorPlanningCheckPage"));
const PlanningDetailPage = lazy(() => import("@/features/planejamento/PlanningDetailPage"));
const PrePlanningEditPage = lazy(() => import("@/features/planejamento/PrePlanningEditPage"));
const TeacherPlanningEditPage = lazy(() => import("@/features/planejamento/TeacherPlanningEditPage"));
const BulkGenerationPage = lazy(() => import("@/features/planejamento/BulkGenerationPage"));
const OrientacoesPage = lazy(() => import("@/features/orientacoes/OrientacoesPage"));
const NovaOrientacaoPage = lazy(() => import("@/features/orientacoes/NovaOrientacaoPage"));
const GradeHorariaPage = lazy(() => import("@/features/grade-horaria/GradeHorariaPage"));
const SchoolTimeSlotsPage = lazy(() => import("@/features/grade-horaria/SchoolTimeSlotsPage"));
const SchoolDefaultSchedulePage = lazy(() => import("@/features/escolas/SchoolDefaultSchedulePage"));
const ProfessorPlanningSchedulePage = lazy(() => import("@/features/grade-horaria/ProfessorPlanningSchedulePage"));
const EvidenciaPage = lazy(() => import("@/features/orientacoes/EvidenciaPage"));
const TutorialPage = lazy(() => import("@/features/tutorial/TutorialPage"));
const AjudaHubPage = lazy(() => import("@/features/ajuda/AjudaHubPage"));
const AjudaWatchPage = lazy(() => import("@/features/ajuda/AjudaWatchPage"));
const AjudaManagePage = lazy(() => import("@/features/ajuda/AjudaManagePage"));
const AjudaFormPage = lazy(() => import("@/features/ajuda/AjudaFormPage"));
const FrequenciaDashboardPage = lazy(() => import("@/features/frequencia/FrequenciaDashboardPage"));
const FrequenciaRegistroPage = lazy(() => import("@/features/frequencia/FrequenciaRegistroPage"));
const ImportHistoryPage = lazy(() => import("@/features/alunos/ImportHistoryPage"));
const NotasDashboardPage = lazy(() => import("@/features/notas/NotasDashboardPage"));
const NotasLancamentoPage = lazy(() => import("@/features/notas/NotasLancamentoPage"));
const EstadosCidadesPage = lazy(() => import("@/features/configuracoes/EstadosCidadesPage"));
const BrandingSettingsPage = lazy(() => import("@/features/configuracoes/BrandingSettingsPage"));
const BoletinsPage = lazy(() => import("@/features/boletins/BoletinsPage"));
const ConfigurationStatusPage = lazy(() => import("@/features/configuracao/ConfigurationStatusPage"));
const GlobalStudentSearchPage = lazy(() => import("@/features/alunos/GlobalStudentSearchPage"));
const InconsistenciasAlunosPage = lazy(() => import("@/features/alunos/InconsistenciasPage"));
const MeuPerfilPage = lazy(() => import("@/features/perfil/MeuPerfilPage"));
const CompartilhamentoPage = lazy(() => import("@/features/compartilhamento/CompartilhamentoPage"));
const KeywordsManagementPage = lazy(() => import("@/features/compartilhamento/KeywordsManagementPage"));
const ExternalLinksPage = lazy(() => import("@/features/compartilhamento/ExternalLinksPage"));
const AccessLogsPage = lazy(() => import("@/features/compartilhamento/AccessLogsPage"));
const ExternalAccessPage = lazy(() => import("@/features/compartilhamento/ExternalAccessPage"));
const AdministracaoHubPage = lazy(() => import("@/features/administracao/AdministracaoHubPage"));
const AdministracaoFinanceiroHubPage = lazy(() => import("@/features/administracao/AdministracaoFinanceiroHubPage"));
const CondicoesPagamentoPage = lazy(() => import("@/features/financeiro/cadastros/CondicoesPagamentoPage"));
const ClientesPagadoresPage = lazy(() => import("@/features/financeiro/cadastros/ClientesPagadoresPage"));
const TiposDocumentoPage = lazy(() => import("@/features/financeiro/cadastros/TiposDocumentoPage"));
const RegrasCobrancaPage = lazy(() => import("@/features/financeiro/cadastros/RegrasCobrancaPage"));
const FinanceiroHubPage = lazy(() => import("@/features/financeiro/FinanceiroHubPage"));
const PermissoesFinanceirasPage = lazy(() => import("@/features/financeiro/permissoes/PermissoesFinanceirasPage"));
const CadastrosFinanceirosHubPage = lazy(() => import("@/features/financeiro/cadastros/CadastrosFinanceirosHubPage"));
const ContasFinanceirasPage = lazy(() => import("@/features/financeiro/cadastros/ContasFinanceirasPage"));
const BeneficiariosPage = lazy(() => import("@/features/financeiro/cadastros/BeneficiariosPage"));
const PlanoContasPage = lazy(() => import("@/features/financeiro/cadastros/PlanoContasPage"));
const CentrosCustoPage = lazy(() => import("@/features/financeiro/cadastros/CentrosCustoPage"));
const MetodosPagamentoPage = lazy(() => import("@/features/financeiro/cadastros/MetodosPagamentoPage"));
const ConfiguracoesFinanceirasPage = lazy(() => import("@/features/financeiro/configuracoes/ConfiguracoesFinanceirasPage"));
const AssistenteConfiguracaoPage = lazy(() => import("@/features/financeiro/configuracoes/AssistenteConfiguracaoPage"));
const ContasPagarPage = lazy(() => import("@/features/financeiro/contas-pagar/ContasPagarPage"));
const ContaPagarDetailPage = lazy(() => import("@/features/financeiro/contas-pagar/ContaPagarDetailPage"));
const ContasReceberPage = lazy(() => import("@/features/financeiro/contas-receber/ContasReceberPage"));
const ContaReceberDetailPage = lazy(() => import("@/features/financeiro/contas-receber/ContaReceberDetailPage"));
const TesourariaPage = lazy(() => import("@/features/financeiro/tesouraria/TesourariaPage"));
const OrcamentosPage = lazy(() => import("@/features/financeiro/orcamento/OrcamentosPage"));
const OrcamentoDetailPage = lazy(() => import("@/features/financeiro/orcamento/OrcamentoDetailPage"));
const FechamentoPage = lazy(() => import("@/features/financeiro/orcamento/FechamentoPage"));
const FinanceiroRelatoriosPage = lazy(() => import("@/features/financeiro/relatorios/FinanceiroRelatoriosPage"));
const PagamentosPage = lazy(() => import("@/features/financeiro/pagamentos/PagamentosPage"));
const AlcadasPage = lazy(() => import("@/features/financeiro/administracao/AlcadasPage"));
const PoliticasAprovacaoPage = lazy(() => import("@/features/financeiro/administracao/PoliticasAprovacaoPage"));
const ProjetosPage = lazy(() => import("@/features/financeiro/administracao/ProjetosPage"));
const BibliotecaPage = lazy(() => import("@/features/biblioteca/BibliotecaPage"));
const BibliotecaManagePage = lazy(() => import("@/features/biblioteca/BibliotecaManagePage"));
const PwaSettingsPage = lazy(() => import("@/features/pwa/PwaSettingsPage"));
const InstallPage = lazy(() => import("@/features/pwa/InstallPage"));
const OneSignalSettingsPage = lazy(() => import("@/features/onesignal/OneSignalSettingsPage"));
const NotificationSettingsPage = lazy(() => import("@/features/configuracoes/NotificationSettingsPage"));

// Webhooks (admin only)
const WebhooksPage = lazy(() => import("@/features/webhooks/WebhooksPage"));
const WebhookFormPage = lazy(() => import("@/features/webhooks/WebhookFormPage"));
const WebhookDetailPage = lazy(() => import("@/features/webhooks/WebhookDetailPage"));
const WebhookDeliveryHistoryPage = lazy(() => import("@/features/webhooks/WebhookDeliveryHistoryPage"));

// Tickets
const TicketsPage = lazy(() => import("@/features/tickets/TicketsPage"));
const TicketsKanbanPage = lazy(() => import("@/features/tickets/TicketsKanbanPage"));
const TicketCreatePage = lazy(() => import("@/features/tickets/TicketCreatePage"));
const TicketDetailPage = lazy(() => import("@/features/tickets/TicketDetailPage"));
const TicketEditPage = lazy(() => import("@/features/tickets/TicketEditPage"));
const ExternalTicketPage = lazy(() => import("@/features/tickets/ExternalTicketPage"));
const TicketCategoriesPage = lazy(() => import("@/features/tickets/TicketCategoriesPage"));

// Chat Institucional
const ChatPage = lazy(() => import("@/features/chat/ChatPage"));

// Auditoria Pages (lazy loaded)
const AuditoriaDashboardPage = lazy(() => import("@/features/auditoria/AuditoriaDashboardPage"));
const AuditoriaUsuariosPage = lazy(() => import("@/features/auditoria/AuditoriaUsuariosPage"));
const AuditoriaUsuarioDetailPage = lazy(() => import("@/features/auditoria/AuditoriaUsuarioDetailPage"));

// Pendências (lazy loaded)
const PendenciasPage = lazy(() => import("@/features/pendencias/PendenciasPage"));

// Acompanhamento Escolar (lazy loaded)
const AcompanhamentoHomePage = lazy(() => import("@/features/acompanhamento/AcompanhamentoHomePage"));
const VisitasPage = lazy(() => import("@/features/acompanhamento/VisitasPage"));
const VisitDetailPage = lazy(() => import("@/features/acompanhamento/VisitDetailPage"));
const RotasListaPage = lazy(() => import("@/features/acompanhamento/rotas/RotasListaPage"));
const NovaRotaPage = lazy(() => import("@/features/acompanhamento/rotas/NovaRotaPage"));
const RotaDetalhePage = lazy(() => import("@/features/acompanhamento/rotas/RotaDetalhePage"));
const RotaExecucaoPage = lazy(() => import("@/features/acompanhamento/rotas/RotaExecucaoPage"));
const RotasDashboardPage = lazy(() => import("@/features/acompanhamento/rotas/RotasDashboardPage"));
const EntregasPage = lazy(() => import("@/features/acompanhamento/EntregasPage"));
const DeliveryDetailPage = lazy(() => import("@/features/acompanhamento/DeliveryDetailPage"));
const PainelGeralPage = lazy(() => import("@/features/acompanhamento/PainelGeralPage"));
const RelatoriosAcompPage = lazy(() => import("@/features/acompanhamento/RelatoriosPage"));

// BI Pages (lazy loaded)
const BIHomePage = lazy(() => import("@/pages/bi/BIHomePage"));
const BIExecutivePage = lazy(() => import("@/pages/bi/BIExecutivePage"));
const BIPlanningPage = lazy(() => import("@/pages/bi/BIPlanningPage"));
const BIAttendancePage = lazy(() => import("@/pages/bi/BIAttendancePage"));
const BIRisksPage = lazy(() => import("@/pages/bi/BIRisksPage"));
const BIProfessorDetailPage = lazy(() => import("@/pages/bi/BIProfessorDetailPage"));
const BIProfessorListPage = lazy(() => import("@/pages/bi/BIProfessorListPage"));
const BIGradesLearningPage = lazy(() => import("@/pages/bi/BIGradesLearningPage"));
const BISchoolsPage = lazy(() => import("@/pages/bi/BISchoolsPage"));
const BISchoolDetailPage2 = lazy(() => import("@/pages/bi/BISchoolDetailPage2"));
const BICitiesPage = lazy(() => import("@/pages/bi/BICitiesPage"));
const BICityDetailPage = lazy(() => import("@/pages/bi/BICityDetailPage"));
const BIRankingsPage = lazy(() => import("@/pages/bi/BIRankingsPage"));
const BIReportsPage = lazy(() => import("@/pages/bi/BIReportsPage"));

// BI Phase 3 Pages
const BIInsightsPage = lazy(() => import("@/pages/bi/BIInsightsPage"));
const BITrendsPage = lazy(() => import("@/pages/bi/BITrendsPage"));
const BIPredictionRiskPage = lazy(() => import("@/pages/bi/BIPredictionRiskPage"));
const BIRecommendationsPage = lazy(() => import("@/pages/bi/BIRecommendationsPage"));
const BIMonitoringRoomPage = lazy(() => import("@/pages/bi/BIMonitoringRoomPage"));
const BIAuditQualityPage = lazy(() => import("@/pages/bi/BIAuditQualityPage"));
const BIProfessorDocumentsPage = lazy(() => import("@/pages/bi/BIProfessorDocumentsPage"));

// Presença dos Professores
const PresencaHubPage = lazy(() => import("@/features/presenca-professores/PresencaHubPage"));
const PresencaProfessoresPage = lazy(() => import("@/features/presenca-professores/PresencaProfessoresPage"));
const PresencaBiPage = lazy(() => import("@/features/presenca-professores/PresencaBiPage"));
const PresencaSheetDetailPage = lazy(() => import("@/features/presenca-professores/PresencaSheetDetailPage"));
const MinhaPresencaPage = lazy(() => import("@/features/presenca-professores/MinhaPresencaPage"));
const PresencaSettingsPage = lazy(() => import("@/features/presenca-professores/PresencaSettingsPage"));
const SubstituicaoHubPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoHubPage"));
const SubstituicaoCoordenacaoPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoCoordenacaoPage"));
const SubstituicaoRhPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoRhPage"));
const SubstituicaoNovaPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoNovaPage"));
const SubstituicaoDetailPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoDetailPage"));
const SubstituicaoFinanceiroPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoFinanceiroPage"));
const SubstituicaoFinanceiroAcessosPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoFinanceiroAcessosPage"));
const SubstituicaoConfiguracoesPage = lazy(() => import("@/features/presenca-professores/substituicao/SubstituicaoConfiguracoesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageSpinner = () => (
  <div className="flex items-center justify-center p-12 min-h-[40vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

function PrefetchBoot() {
  useOneSignalBoot();
  useEffect(() => {
    prefetchCommonRoutes();
  }, []);
  return null;
}

function RootRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryToken = params.get('school_indication_token');
  const hashToken = location.hash.match(/^#\/?indicacao-escola\/([^/?#]+)/)?.[1];
  const token = queryToken || hashToken;

  if (token) {
    return <Navigate to={`/indicacao-escola/${encodeURIComponent(token)}`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function InternalAppContext() {
  return (
    <AuthProvider>
      <SchoolHubProvider>
        <PrefetchBoot />
        <Outlet />
      </SchoolHubProvider>
    </AuthProvider>
  );
}

/**
 * Layout route persistente: mantém MainLayout (SidebarProvider + AppSidebar +
 * AppHeader) montado durante toda a navegação entre rotas internas. Apenas o
 * <Outlet/> (área principal) é substituído quando o pathname muda, preservando
 * scroll, estado collapsed/expanded e grupos abertos da sidebar.
 */
function PersistentLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ConfirmProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* External routes: never require app login */}
            <Route path="/acesso-externo/:token" element={<ExternalAccessPage />} />
            <Route path="/acesso-externo/ticket/:token" element={<ExternalTicketPage />} />
            <Route path="/acesso-externo/indicacao/:token" element={<ExternalIndicationPage />} />
            <Route path="/indicacao-escola/:token" element={<ExternalSchoolIndicationPage />} />
            <Route path="/acesso-diretor/:token" element={<ExternalSchoolIndicationPage />} />
            <Route path="/" element={<RootRedirect />} />

            <Route element={<InternalAppContext />}>
            {/* Public internal routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />

            {/* Protected Routes — share a single persistent layout so the
                sidebar is never remounted on navigation. */}
            <Route element={<PersistentLayout />}>


            <Route path="/dashboard" element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            } />
            <Route path="/meu-perfil" element={
              <AuthGuard>
                <MeuPerfilPage />
              </AuthGuard>
            } />

            {/* Admin Module */}
            <Route path="/administracao" element={
              <AuthGuard allowedRoles={['admin']}>
                <AdministracaoHubPage />
              </AuthGuard>
            } />
            <Route path="/administracao/permissoes-financeiras" element={
              <AuthGuard>
                <PermissoesFinanceirasPage />
              </AuthGuard>
            } />

            {/* Administração > Financeiro — hub de cadastros e regras (admin) */}
            <Route path="/administracao/financeiro" element={
              <AuthGuard allowedRoles={['admin']}>
                <AdministracaoFinanceiroHubPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/contas" element={
              <AuthGuard allowedRoles={['admin']}>
                <ContasFinanceirasPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/beneficiarios" element={
              <AuthGuard allowedRoles={['admin']}>
                <BeneficiariosPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/plano-contas" element={
              <AuthGuard allowedRoles={['admin']}>
                <PlanoContasPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/centros-custo" element={
              <AuthGuard allowedRoles={['admin']}>
                <CentrosCustoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/projetos" element={
              <AuthGuard allowedRoles={['admin']}>
                <ProjetosPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/metodos-pagamento" element={
              <AuthGuard allowedRoles={['admin']}>
                <MetodosPagamentoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/alcadas" element={
              <AuthGuard allowedRoles={['admin']}>
                <AlcadasPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/politicas-aprovacao" element={
              <AuthGuard allowedRoles={['admin']}>
                <PoliticasAprovacaoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/configuracoes" element={
              <AuthGuard allowedRoles={['admin']}>
                <ConfiguracoesFinanceirasPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/assistente" element={
              <AuthGuard allowedRoles={['admin']}>
                <AssistenteConfiguracaoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/fechamentos" element={
              <AuthGuard allowedRoles={['admin']}>
                <FechamentoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/condicoes-pagamento" element={
              <AuthGuard allowedRoles={['admin']}>
                <CondicoesPagamentoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/clientes-pagadores" element={
              <AuthGuard allowedRoles={['admin']}>
                <ClientesPagadoresPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/tipos-documento" element={
              <AuthGuard allowedRoles={['admin']}>
                <TiposDocumentoPage />
              </AuthGuard>
            } />
            <Route path="/administracao/financeiro/regras-cobranca" element={
              <AuthGuard allowedRoles={['admin']}>
                <RegrasCobrancaPage />
              </AuthGuard>
            } />

            {/* Compat: rotas antigas redirecionam para Administração */}
            <Route path="/financeiro/cadastros" element={<Navigate to="/administracao/financeiro" replace />} />
            <Route path="/financeiro/cadastros/contas" element={<Navigate to="/administracao/financeiro/contas" replace />} />
            <Route path="/financeiro/cadastros/beneficiarios" element={<Navigate to="/administracao/financeiro/beneficiarios" replace />} />
            <Route path="/financeiro/cadastros/plano-contas" element={<Navigate to="/administracao/financeiro/plano-contas" replace />} />
            <Route path="/financeiro/cadastros/centros-custo" element={<Navigate to="/administracao/financeiro/centros-custo" replace />} />
            <Route path="/financeiro/cadastros/metodos-pagamento" element={<Navigate to="/administracao/financeiro/metodos-pagamento" replace />} />
            <Route path="/financeiro/configuracoes" element={<Navigate to="/administracao/financeiro/configuracoes" replace />} />
            <Route path="/financeiro/fechamento" element={<Navigate to="/administracao/financeiro/fechamentos" replace />} />
            <Route path="/financeiro/pagamentos" element={
              <FinanceiroGuard>
                <PagamentosPage />
              </FinanceiroGuard>
            } />



            {/* Financeiro global — perfis admin e financeiro */}
            <Route path="/financeiro" element={
              <FinanceiroGuard>
                <FinanceiroHubPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/contas-a-pagar" element={
              <FinanceiroGuard>
                <ContasPagarPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/contas-a-pagar/:id" element={
              <FinanceiroGuard>
                <ContaPagarDetailPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/contas-a-receber" element={
              <FinanceiroGuard>
                <ContasReceberPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/contas-a-receber/:id" element={
              <FinanceiroGuard>
                <ContaReceberDetailPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/tesouraria" element={
              <FinanceiroGuard>
                <TesourariaPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/conciliacao" element={
              <FinanceiroGuard>
                <TesourariaPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/orcamentos" element={
              <FinanceiroGuard>
                <OrcamentosPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/orcamentos/:id" element={
              <FinanceiroGuard>
                <OrcamentoDetailPage />
              </FinanceiroGuard>
            } />
            <Route path="/financeiro/relatorios" element={
              <FinanceiroGuard>
                <FinanceiroRelatoriosPage />
              </FinanceiroGuard>
            } />

            <Route path="/usuarios" element={
              <AuthGuard requiredModule="administracao">
                <UsersPage />
              </AuthGuard>
            } />

            {/* Cadastros - Admin/Coordenador only */}
            <Route path="/escolas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <EscolasPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <SchoolDetailPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/turmas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SchoolClassGroupsPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/cursos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SchoolCoursesPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <SchoolProfessorsPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/disciplinas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SchoolSubjectsPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/horarios" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SchoolDefaultSchedulePage />
              </AuthGuard>
            } />
            <Route path="/itinerarios" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <ItinerariosPage />
              </AuthGuard>
            } />
            <Route path="/itinerarios/:trackId/cursos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <CursosPage />
              </AuthGuard>
            } />
            <Route path="/cursos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <CursosPage />
              </AuthGuard>
            } />
            <Route path="/cursos/:courseId/escolas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <CourseSchoolsPage />
              </AuthGuard>
            } />
            <Route path="/disciplinas" element={
              <Navigate to="/cursos" replace />
            } />
            <Route path="/cursos/:courseId/disciplinas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <DisciplinasPage />
              </AuthGuard>
            } />
            <Route path="/disciplinas/:subjectId/aulas-planejadas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <LessonMaterialsPage />
              </AuthGuard>
            } />
            <Route path="/disciplinas/:subjectId/calendario-semanal" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SubjectWeeklyCalendarPage />
              </AuthGuard>
            } />
            <Route path="/professores/:professorId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <ProfessorDetailPage />
              </AuthGuard>
            } />
            <Route path="/professores/:professorId/documentos" element={
              <AuthGuard>
                <DocumentosPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/alunos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AlunosPage />
              </AuthGuard>
            } />
            <Route path="/alunos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <GlobalStudentSearchPage />
              </AuthGuard>
            } />
            <Route path="/alunos/inconsistencias" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <InconsistenciasAlunosPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/importacoes" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <ImportHistoryPage />
              </AuthGuard>
            } />
            <Route path="/professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <ProfessoresPage />
              </AuthGuard>
            } />
            <Route path="/professores/kanban" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <ProfessoresKanbanPage />
              </AuthGuard>
            } />
            <Route path="/banco-talentos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <TalentosPage />
              </AuthGuard>
            } />
            <Route path="/banco-talentos/novo" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <TalentoFormPage />
              </AuthGuard>
            } />
            <Route path="/banco-talentos/:id/editar" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <TalentoFormPage />
              </AuthGuard>
            } />

            {/* R.H. - Recursos Humanos */}
            <Route path="/rh" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhHubPage />
              </AuthGuard>
            } />
            <Route path="/rh/alocacao" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhAlocacaoBoardPage />
              </AuthGuard>
            } />
            <Route path="/rh/professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhProfessoresPage />
              </AuthGuard>
            } />
            <Route path="/rh/demanda" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhDemandaCalcPage />
              </AuthGuard>
            } />
            <Route path="/rh/links-escolas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhLinksEscolasPage />
              </AuthGuard>
            } />
            <Route path="/rh/links-escolas/:linkId/conferir" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhLinkConferirPage />
              </AuthGuard>
            } />
            <Route path="/rh/aptos-contratacao" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <AptosContratacaoPage />
              </AuthGuard>
            } />
            <Route path="/rh/aptos-contratacao/auditoria" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <AptosContratacaoAuditPage />
              </AuthGuard>
            } />
            <Route path="/rh/aptos-contratacao/:id" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <AptosContratacaoDetailPage />
              </AuthGuard>
            } />
            {/* Rotas legadas */}
            <Route path="/rh/alocar" element={<Navigate to="/rh/alocacao" replace />} />
            <Route path="/rh/carga-horaria" element={<Navigate to="/rh/professores" replace />} />
            <Route path="/rh/configuracoes" element={
              <AuthGuard allowedRoles={['admin', 'rh']}>
                <RhConfiguracoesPage />
              </AuthGuard>
            } />
            {/* Histórico oculto */}
            <Route path="/rh/planos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhPlanosPage />
              </AuthGuard>
            } />
            <Route path="/rh/planos/:id" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhPlanoDetailPage />
              </AuthGuard>
            } />
            <Route path="/rh/indicacoes" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <RhIndicacoesPage />
              </AuthGuard>
            } />

            {/* Calendario */}
            <Route path="/calendario" element={
              <AuthGuard>
                <CalendarioPage />
              </AuthGuard>
            } />

            {/* Planejamento e Orientações */}
            <Route path="/planejamento" element={
              <AuthGuard>
                <PlanejamentoPage />
              </AuthGuard>
            } />
            <Route path="/planejamento/conferir" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}><CoordinatorPlanningCheckPage /></AuthGuard>
            } />
            <Route path="/planejamento/revisar/:id" element={
              <AuthGuard><CoordinatorReviewPage /></AuthGuard>
            } />
            <Route path="/planejamento/detalhe/:type/:id" element={
              <AuthGuard><PlanningDetailPage /></AuthGuard>
            } />
            <Route path="/planejamento/editar-pre/:id" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}><PrePlanningEditPage /></AuthGuard>
            } />
            <Route path="/planejamento/novo-pre" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}><PrePlanningEditPage /></AuthGuard>
            } />
            <Route path="/planejamento/novo" element={
              <AuthGuard><TeacherPlanningEditPage /></AuthGuard>
            } />
            <Route path="/planejamento/editar/:id" element={
              <AuthGuard><TeacherPlanningEditPage /></AuthGuard>
            } />
            <Route path="/planejamento/geracao-massa" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}><BulkGenerationPage /></AuthGuard>
            } />
            <Route path="/grade-horaria" element={
              <AuthGuard>
                <GradeHorariaPage />
              </AuthGuard>
            } />
            <Route path="/grade-horaria/horarios-escola" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SchoolTimeSlotsPage />
              </AuthGuard>
            } />
            <Route path="/grade-horaria/planejamento-professor" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <ProfessorPlanningSchedulePage />
              </AuthGuard>
            } />
            <Route path="/orientacoes" element={
              <AuthGuard>
                <OrientacoesPage />
              </AuthGuard>
            } />
            <Route path="/orientacoes/nova" element={
              <AuthGuard>
                <NovaOrientacaoPage />
              </AuthGuard>
            } />
            <Route path="/orientacoes/evidencia/:id" element={
              <AuthGuard>
                <EvidenciaPage />
              </AuthGuard>
            } />

            {/* Tutorial legado redireciona para Central de Ajuda */}
            <Route path="/tutorial" element={<Navigate to="/ajuda" replace />} />

            {/* Central de Ajuda */}
            <Route path="/ajuda" element={
              <AuthGuard>
                <AjudaHubPage />
              </AuthGuard>
            } />
            <Route path="/ajuda/watch/:id" element={
              <AuthGuard>
                <AjudaWatchPage />
              </AuthGuard>
            } />
            <Route path="/ajuda/gerenciar" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AjudaManagePage />
              </AuthGuard>
            } />
            <Route path="/ajuda/novo" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AjudaFormPage />
              </AuthGuard>
            } />
            <Route path="/ajuda/:id/editar" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AjudaFormPage />
              </AuthGuard>
            } />


            {/* Configurações */}
            <Route path="/configuracoes/status" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <ConfigurationStatusPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/estados-cidades" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <EstadosCidadesPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/marca" element={
              <AuthGuard allowedRoles={['admin']}>
                <BrandingSettingsPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/pwa" element={
              <AuthGuard allowedRoles={['admin']}>
                <PwaSettingsPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/onesignal" element={
              <AuthGuard allowedRoles={['admin']}>
                <OneSignalSettingsPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/notificacoes" element={
              <AuthGuard>
                <NotificationSettingsPage />
              </AuthGuard>
            } />
            <Route path="/instalar" element={<InstallPage />} />

            {/* Webhooks - Admin only */}
            <Route path="/webhooks" element={
              <AuthGuard allowedRoles={['admin']}>
                <WebhooksPage />
              </AuthGuard>
            } />
            <Route path="/webhooks/novo" element={
              <AuthGuard allowedRoles={['admin']}>
                <WebhookFormPage />
              </AuthGuard>
            } />
            <Route path="/webhooks/historico" element={
              <AuthGuard allowedRoles={['admin']}>
                <WebhookDeliveryHistoryPage />
              </AuthGuard>
            } />
            <Route path="/webhooks/:id" element={
              <AuthGuard allowedRoles={['admin']}>
                <WebhookDetailPage />
              </AuthGuard>
            } />
            <Route path="/webhooks/:id/editar" element={
              <AuthGuard allowedRoles={['admin']}>
                <WebhookFormPage />
              </AuthGuard>
            } />

            {/* Compartilhamento Externo */}
            <Route path="/compartilhamento" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <CompartilhamentoPage />
              </AuthGuard>
            } />
            <Route path="/compartilhamento/keywords" element={
              <AuthGuard allowedRoles={['admin']}>
                <KeywordsManagementPage />
              </AuthGuard>
            } />
            <Route path="/compartilhamento/links" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <ExternalLinksPage />
              </AuthGuard>
            } />
            <Route path="/compartilhamento/logs" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AccessLogsPage />
              </AuthGuard>
            } />

            {/* Frequência */}
            <Route path="/frequencia" element={
              <AuthGuard>
                <FrequenciaDashboardPage />
              </AuthGuard>
            } />
            <Route path="/frequencia/registro/:classGroupId/:subjectId" element={
              <AuthGuard>
                <FrequenciaRegistroPage />
              </AuthGuard>
            } />

            {/* Placeholder Routes */}
            <Route path="/notas" element={
              <AuthGuard>
                <NotasDashboardPage />
              </AuthGuard>
            } />
            <Route path="/notas/lancamento/:classGroupId/:subjectId/:bimester" element={
              <AuthGuard>
                <NotasLancamentoPage />
              </AuthGuard>
            } />
            <Route path="/boletins" element={
              <AuthGuard>
                <BoletinsPage />
              </AuthGuard>
            } />
            <Route path="/biblioteca" element={
              <AuthGuard>
                <BibliotecaPage />
              </AuthGuard>
            } />
            <Route path="/biblioteca/gerenciar" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BibliotecaManagePage />
              </AuthGuard>
            } />

            {/* B.I. Module - Admin and Coordinator only */}
            <Route path="/bi" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIHomePage />
              </AuthGuard>
            } />
            <Route path="/bi/visao-executiva" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIExecutivePage />
              </AuthGuard>
            } />
            <Route path="/bi/planejamentos" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIPlanningPage />
              </AuthGuard>
            } />
            <Route path="/bi/frequencia" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIAttendancePage />
              </AuthGuard>
            } />
            <Route path="/bi/riscos-alertas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIRisksPage />
              </AuthGuard>
            } />
            <Route path="/bi/professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIProfessorListPage />
              </AuthGuard>
            } />
            <Route path="/bi/professores/:id" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIProfessorDetailPage />
              </AuthGuard>
            } />

            {/* BI Phase 2 Routes */}
            <Route path="/bi/notas-aprendizagem" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIGradesLearningPage />
              </AuthGuard>
            } />
            <Route path="/bi/escolas-bi" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BISchoolsPage />
              </AuthGuard>
            } />
            <Route path="/bi/escolas-bi/:id" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BISchoolDetailPage2 />
              </AuthGuard>
            } />
            <Route path="/bi/cidades" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BICitiesPage />
              </AuthGuard>
            } />
            <Route path="/bi/cidades/:cidade" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BICityDetailPage />
              </AuthGuard>
            } />
            <Route path="/bi/rankings" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIRankingsPage />
              </AuthGuard>
            } />
            <Route path="/bi/relatorios" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIReportsPage />
              </AuthGuard>
            } />

            {/* BI Phase 3 Routes */}
            <Route path="/bi/insights" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIInsightsPage />
              </AuthGuard>
            } />
            <Route path="/bi/tendencias" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BITrendsPage />
              </AuthGuard>
            } />
            <Route path="/bi/previsao-risco" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIPredictionRiskPage />
              </AuthGuard>
            } />
            <Route path="/bi/recomendacoes" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIRecommendationsPage />
              </AuthGuard>
            } />
            <Route path="/bi/monitoramento" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIMonitoringRoomPage />
              </AuthGuard>
            } />
            <Route path="/bi/auditoria" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIAuditQualityPage />
              </AuthGuard>
            } />
            <Route path="/bi/documentos-professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <BIProfessorDocumentsPage />
              </AuthGuard>
            } />

            {/* Acompanhamento Escolar */}
            <Route path="/acompanhamento" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AcompanhamentoHomePage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/visitas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <VisitasPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/visitas/:visitId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <VisitDetailPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/rotas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <RotasListaPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/rotas/dashboard" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <RotasDashboardPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/rotas/nova" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <NovaRotaPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/rotas/:routeId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <RotaDetalhePage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/rotas/:routeId/execucao" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <RotaExecucaoPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/entregas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <EntregasPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/entregas/:deliveryId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <DeliveryDetailPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/painel" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <PainelGeralPage />
              </AuthGuard>
            } />
            <Route path="/acompanhamento/relatorios" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <RelatoriosAcompPage />
              </AuthGuard>
            } />

            {/* Acompanhamento Escolar - Contexto da Escola */}
            <Route path="/escolas/:schoolId/acompanhamento" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AcompanhamentoHomePage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/acompanhamento/visitas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <VisitasPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/acompanhamento/visitas/:visitId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <VisitDetailPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/acompanhamento/entregas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <EntregasPage />
              </AuthGuard>
            } />
            <Route path="/escolas/:schoolId/acompanhamento/entregas/:deliveryId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <DeliveryDetailPage />
              </AuthGuard>
            } />

            {/* Central de Pendências */}
            <Route path="/pendencias" element={
              <AuthGuard>
                <PendenciasPage />
              </AuthGuard>
            } />

            {/* Tickets */}
            <Route path="/tickets" element={
              <AuthGuard>
                <TicketsPage />
              </AuthGuard>
            } />
            <Route path="/tickets/kanban" element={
              <AuthGuard>
                <TicketsKanbanPage />
              </AuthGuard>
            } />
            <Route path="/tickets/novo" element={
              <AuthGuard>
                <TicketCreatePage />
              </AuthGuard>
            } />
            <Route path="/tickets/:id" element={
              <AuthGuard>
                <TicketDetailPage />
              </AuthGuard>
            } />
            <Route path="/tickets/:id/editar" element={
              <AuthGuard>
                <TicketEditPage />
              </AuthGuard>
            } />
            <Route path="/tickets/categorias" element={
              <AuthGuard>
                <TicketCategoriesPage />
              </AuthGuard>
            } />

            {/* Chat Institucional */}
            <Route path="/chat" element={
              <AuthGuard>
                <ChatPage />
              </AuthGuard>
            } />
            <Route path="/chat/salvas" element={
              <AuthGuard>
                <ChatPage mode="saved" />
              </AuthGuard>
            } />
            <Route path="/chat/inbox" element={
              <AuthGuard>
                <ChatPage mode="inbox" />
              </AuthGuard>
            } />
            <Route path="/chat/:channelId" element={
              <AuthGuard>
                <ChatPage />
              </AuthGuard>
            } />

            {/* Auditoria de Acesso */}
            <Route path="/auditoria" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AuditoriaDashboardPage />
              </AuthGuard>
            } />
            <Route path="/auditoria/usuarios" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AuditoriaUsuariosPage />
              </AuthGuard>
            } />
            <Route path="/auditoria/usuarios/:userId" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <AuditoriaUsuarioDetailPage />
              </AuthGuard>
            } />

            {/* Presença dos Professores */}
            <Route path="/presenca-professores" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <PresencaHubPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/folhas" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <PresencaProfessoresPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/folhas/:sheetId" element={
              <AuthGuard>
                <PresencaSheetDetailPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/bi" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <PresencaBiPage />
              </AuthGuard>
            } />
            <Route path="/minha-presenca" element={
              <AuthGuard allowedRoles={['professor']}>
                <MinhaPresencaPage />
              </AuthGuard>
            } />
            <Route path="/configuracoes/presenca-professores" element={
              <AuthGuard allowedRoles={['admin']}>
                <PresencaSettingsPage />
              </AuthGuard>
            } />

            {/* Substituição (Hub Presença dos Professores) */}
            <Route path="/presenca-professores/substituicao" element={
              <AuthGuard>
                <SubstituicaoHubPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/coordenacao" element={
              <AuthGuard allowedRoles={['admin', 'coordenador']}>
                <SubstituicaoCoordenacaoPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/rh" element={
              <AuthGuard allowedRoles={['admin', 'rh']}>
                <SubstituicaoRhPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/nova" element={
              <AuthGuard allowedRoles={['admin', 'coordenador', 'rh']}>
                <SubstituicaoNovaPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/financeiro" element={
              <AuthGuard allowedRoles={['admin', 'rh']}>
                <SubstituicaoFinanceiroPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/financeiro/acessos" element={
              <AuthGuard allowedRoles={['admin']}>
                <SubstituicaoFinanceiroAcessosPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/configuracoes" element={
              <AuthGuard allowedRoles={['admin']}>
                <SubstituicaoConfiguracoesPage />
              </AuthGuard>
            } />
            <Route path="/presenca-professores/substituicao/:id" element={
              <AuthGuard>
                <SubstituicaoDetailPage />
              </AuthGuard>
            } />
            </Route>

            <Route path="*" element={<NotFound />} />

            </Route>
          </Routes>
          </Suspense>
      </BrowserRouter>
      </ConfirmProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
