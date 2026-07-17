import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Calendar as CalendarIcon,
  Settings,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Lock,
  XCircle,
  CalendarDays,
  Layers,
  FileText as FileTextIcon
} from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { useOrganization } from '@/hooks/useOrganization';
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar';
import { CalendarForm } from './components/CalendarForm';
import { BimesterForm } from './components/BimesterForm';
import { EventForm } from './components/EventForm';
import { CalendarView } from './components/CalendarView';
import { AcademicCalendar, EVENT_TYPE_LABELS } from '@/types/academic';
import { isManagerRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/hooks/useConfirm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Parse YYYY-MM-DD as local date to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarioPage() {
  const { organization, userRole, isLoading: orgLoading, error: orgError } = useOrganization();
  const {
    calendars,
    activeCalendar,
    isLoading,
    error,
    createCalendar,
    updateCalendar,
    activateCalendar,
    closeCalendar,
    deleteCalendar,
    populateLetivoDays,
    refetch
  } = useAcademicCalendar(organization?.id);

  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [showBimesterForm, setShowBimesterForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<AcademicCalendar | null>(null);

  // Get the current calendar from the updated list to ensure fresh data
  const selectedCalendar = selectedCalendarId
    ? calendars.find(c => c.id === selectedCalendarId) || null
    : null;

  const isAdmin = userRole === 'admin';
  const canManage = isManagerRole(userRole);

  const handleEditCalendar = (calendar: AcademicCalendar) => {
    setEditingCalendar(calendar);
    setShowCalendarForm(true);
  };

  const handleAddBimesters = (calendar: AcademicCalendar) => {
    setSelectedCalendarId(calendar.id);
    setShowBimesterForm(true);
  };

  const handleAddEvent = (calendar: AcademicCalendar) => {
    setSelectedCalendarId(calendar.id);
    setShowEventForm(true);
  };

  const confirm = useConfirm();

  const handleActivate = async (calendar: AcademicCalendar) => {
    // Check if there's an active calendar that needs to be closed first
    if (activeCalendar && activeCalendar.id !== calendar.id) {
      const shouldClose = await confirm({
        title: 'Encerrar calendário ativo?',
        description: `Existe um calendário ativo (${activeCalendar.academic_year}). Deseja encerrá-lo e ativar o calendário ${calendar.academic_year}?`,
        confirmText: 'Encerrar e ativar',
      });
      if (!shouldClose) return;

      // Close the current active calendar first
      const closed = await closeCalendar(activeCalendar.id);
      if (!closed) return;
    }

    await activateCalendar(calendar.id);
  };

  const handleClose = async (calendar: AcademicCalendar) => {
    const ok = await confirm({
      title: 'Encerrar ano letivo',
      description: `Deseja encerrar o ano letivo ${calendar.academic_year}? Esta ação não pode ser desfeita.`,
      confirmText: 'Encerrar',
      variant: 'destructive',
    });
    if (ok) await closeCalendar(calendar.id);
  };

  const handleDelete = async (calendar: AcademicCalendar) => {
    const ok = await confirm({
      title: 'Excluir calendário',
      description: `Deseja excluir o calendário ${calendar.academic_year}? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'destructive',
    });
    if (ok) await deleteCalendar(calendar.id);
  };

  const handlePopulateLetivoDays = useCallback(async (calendarId: string) => {
    await populateLetivoDays(calendarId);
  }, [populateLetivoDays]);

  // Listen for repopulate event from CalendarForm after date changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.calendarId) {
        handlePopulateLetivoDays(detail.calendarId);
      }
    };
    window.addEventListener('repopulate-letivo-days', handler);
    return () => window.removeEventListener('repopulate-letivo-days', handler);
  }, [handlePopulateLetivoDays]);

  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (orgError || error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{orgError || error}</AlertDescription>
      </Alert>
    );
  }

  if (!organization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuração Necessária</AlertTitle>
        <AlertDescription>
          Você precisa estar vinculado a uma organização para acessar o calendário acadêmico.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar o Calendário Acadêmico" steps={[
        { icon: Plus, title: 'Criar calendário', description: 'Defina o ano letivo e as datas de início e fim.', color: 'blue' },
        { icon: Layers, title: 'Configurar bimestres', description: 'Divida o ano em 4 bimestres com datas de início e término.', color: 'green' },
        { icon: CalendarDays, title: 'Gerenciar eventos', description: 'Marque feriados, recesso e dias letivos no calendário.', color: 'purple' },
        { icon: FileTextIcon, title: 'Dias letivos', description: 'Popule automaticamente os dias letivos (segunda a sexta).', color: 'amber' },
      ]} />
      {/* Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Calendário' }]}
        title="Calendário Acadêmico"
        description="Gerencie anos letivos, bimestres e eventos"
        icon={CalendarIcon}
        actions={canManage && (
          <Button onClick={() => { setEditingCalendar(null); setShowCalendarForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ano Letivo
          </Button>
        )}
      />

      {!canManage && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary">Somente leitura</Badge>
          Você pode consultar o calendário, mas apenas a coordenação pode editar.
        </div>
      )}

      {/* Active Calendar Alert */}
      {activeCalendar && (
        <Alert className="bg-primary/10 border-primary/20">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Calendário Ativo: {activeCalendar.academic_year}</AlertTitle>
          <AlertDescription>
            Período: {format(parseLocalDate(activeCalendar.start_date), 'dd/MM/yyyy')} a{' '}
            {format(parseLocalDate(activeCalendar.end_date), 'dd/MM/yyyy')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="calendars" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="calendars">Anos Letivos</TabsTrigger>
          <TabsTrigger value="visualization">Visualização</TabsTrigger>
        </TabsList>

        <TabsContent value="calendars" className="space-y-4">
          {/* Calendars Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calendars.map((calendar) => (
              <Card
                key={calendar.id}
                className={cn(
                  calendar.status === 'ACTIVE' && 'border-primary',
                  calendar.status === 'CLOSED' && 'opacity-75'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{calendar.academic_year}</CardTitle>
                    <Badge
                      variant={
                        calendar.status === 'ACTIVE' ? 'default' :
                          calendar.status === 'CLOSED' ? 'outline' : 'secondary'
                      }
                      className={calendar.status === 'CLOSED' ? 'border-muted-foreground' : ''}
                    >
                      {calendar.status === 'ACTIVE' ? 'Ativo' :
                        calendar.status === 'CLOSED' ? 'Encerrado' : 'Inativo'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {format(parseLocalDate(calendar.start_date), 'dd/MM/yyyy')} - {' '}
                    {format(parseLocalDate(calendar.end_date), 'dd/MM/yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warning if no letivo days */}
                  {calendar.events?.filter(e => e.event_type === 'LETIVO').length === 0 && (
                    <Alert className="py-2 px-3 bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <div className="flex flex-col gap-1 ml-2">
                        <AlertTitle className="text-xs text-amber-800 mb-0">Sem dias letivos</AlertTitle>
                        <AlertDescription className="text-xs text-amber-700">
                          Nenhum dia letivo cadastrado.
                        </AlertDescription>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] w-fit mt-1 bg-white border-amber-300 hover:bg-amber-100"
                          onClick={() => handlePopulateLetivoDays(calendar.id)}
                        >
                          Popular Dias Letivos
                        </Button>
                      </div>
                    </Alert>
                  )}

                  {/* Bimesters */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Bimestres</h4>
                    {calendar.bimesters && calendar.bimesters.length > 0 ? (
                      <div className="space-y-1">
                        {calendar.bimesters.map((b) => {
                          const letivoCount = calendar.events?.filter(
                            e => e.event_type === 'LETIVO' && e.event_date >= b.start_date && e.event_date <= b.end_date
                          ).length || 0;
                          const feriadoCount = calendar.events?.filter(
                            e => (e.event_type === 'FERIADO' || e.event_type === 'RECESSO') && e.event_date >= b.start_date && e.event_date <= b.end_date
                          ).length || 0;
                          return (
                            <div key={b.id} className="text-xs text-muted-foreground flex justify-between items-center gap-2">
                              <span>{b.number}º Bimestre</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{letivoCount} letivos</Badge>
                                {feriadoCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">{feriadoCount} não-letivos</Badge>
                                )}
                                <span className="text-[10px]">
                                  {format(parseLocalDate(b.start_date), 'dd/MM')} - {format(parseLocalDate(b.end_date), 'dd/MM')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum bimestre cadastrado</p>
                    )}
                  </div>

                  {/* Events Summary */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Eventos</h4>
                    {calendar.events && calendar.events.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {['LETIVO', 'FERIADO', 'RECESSO', 'EVENTO'].map((type) => {
                          const count = calendar.events?.filter(e => e.event_type === type).length || 0;
                          if (count === 0) return null;
                          return (
                            <Badge key={type} variant="outline" className="text-xs">
                              {EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS]}: {count}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum evento cadastrado</p>
                    )}
                  </div>

                  {/* Actions */}
                  {canManage && calendar.status !== 'CLOSED' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCalendar(calendar)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddBimesters(calendar)}
                      >
                        Bimestres
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddEvent(calendar)}
                      >
                        Eventos
                      </Button>
                      {calendar.status === 'INACTIVE' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleActivate(calendar)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Ativar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(calendar)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        </>
                      )}
                      {calendar.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleClose(calendar)}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Encerrar
                        </Button>
                      )}

                      {(calendar.status as string) !== 'CLOSED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePopulateLetivoDays(calendar.id)}
                          className="text-amber-600 hover:text-amber-700 border-amber-200"
                        >
                          Popular Dias
                        </Button>
                      )}
                    </div>
                  )}
                  {calendar.status === 'CLOSED' && (
                    <div className="pt-2 border-t text-center">
                      <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Lock className="h-3 w-3" />
                        Ano letivo encerrado
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {calendars.length === 0 && (
            <Card className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum calendário cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie o primeiro ano letivo para começar
              </p>
              {canManage && (
                <Button onClick={() => setShowCalendarForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Ano Letivo
                </Button>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visualization">
          {activeCalendar ? (
            <CalendarView calendar={activeCalendar} canManage={canManage} />
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum calendário ativo</h3>
              <p className="text-muted-foreground">
                Ative um calendário para visualizar os eventos
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCalendarForm && organization && (
        <CalendarForm
          open={showCalendarForm}
          onClose={() => { setShowCalendarForm(false); setEditingCalendar(null); }}
          organizationId={organization.id}
          calendar={editingCalendar}
          onSuccess={refetch}
          createCalendar={createCalendar}
          updateCalendar={updateCalendar}
        />
      )}

      {showBimesterForm && selectedCalendar && (
        <BimesterForm
          open={showBimesterForm}
          onClose={() => { setShowBimesterForm(false); setSelectedCalendarId(null); }}
          calendar={selectedCalendar}
          onSuccess={refetch}
        />
      )}

      {showEventForm && selectedCalendar && (
        <EventForm
          open={showEventForm}
          onClose={() => { setShowEventForm(false); setSelectedCalendarId(null); }}
          calendar={selectedCalendar}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
