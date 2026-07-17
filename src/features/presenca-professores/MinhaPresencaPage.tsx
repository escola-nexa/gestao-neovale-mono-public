import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, CheckCircle2, AlertCircle, MessageSquarePlus, Lock, FileDown } from 'lucide-react';
import {
  useMonthlySheets, useGenerateSheet, useSheetEntries,
  useAttendanceSettings, useRequestAdjustmentRpc, useAcknowledgeSheet,
  useGenerateSheetPdf,
  STATUS_LABEL, FINAL_STATUS_LABEL,
} from './hooks/useTeacherAttendance';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_OPTIONS = [
  { value: 'present', label: 'Presente' },
  { value: 'present_with_delay', label: 'Presente com atraso' },
  { value: 'absent', label: 'Ausente' },
  { value: 'justified_absence', label: 'Falta justificada' },
];

export default function MinhaPresencaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { professorId, isLoading: loadingProf } = useProfessorId();
  const { user } = useAuth();
  const userRole = user?.perfil;
  const canGenerate = userRole === 'admin' || userRole === 'rh';
  const isProfessor = userRole === 'professor';

  const { data: sheets = [], isLoading } = useMonthlySheets(year, month, professorId || undefined);
  const generate = useGenerateSheet();
  const sheet = sheets[0];
  const { data: entries = [] } = useSheetEntries(sheet?.id);
  const { data: settings } = useAttendanceSettings();
  const requestAdjustment = useRequestAdjustmentRpc();
  const acknowledge = useAcknowledgeSheet();
  const generatePdf = useGenerateSheetPdf();

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjEntry, setAdjEntry] = useState<any>(null);
  const [adjType, setAdjType] = useState('correct_status');
  const [adjStatus, setAdjStatus] = useState('present');
  const [adjReason, setAdjReason] = useState('');
  const [adjUrl, setAdjUrl] = useState('');

  const locked = sheet ? ['closed','approved_by_rh'].includes(sheet.status) : false;
  const canRequest = !!settings?.allow_professor_request_adjustment && !locked;
  const requireAck = false; // funcionalidade de ciência do professor desativada
  const alreadyAck = !!sheet?.professor_acknowledged_at;

  useEffect(() => {
    if (!professorId || isLoading || generate.isPending) return;
    if (sheets.length === 0 && canGenerate) generate.mutate({ professorId, year, month });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorId, isLoading, sheets.length, year, month, canGenerate]);

  function openAdjust(e: any) {
    setAdjEntry(e);
    setAdjType('correct_status');
    setAdjStatus(e.final_status === 'absent' ? 'present' : 'justified_absence');
    setAdjReason('');
    setAdjUrl('');
    setAdjOpen(true);
  }

  async function submitAdjust() {
    if (!adjEntry || !sheet) return;
    await requestAdjustment.mutateAsync({
      entryId: adjEntry.id,
      sheetId: sheet.id,
      requestType: adjType,
      requestedStatus: adjStatus,
      reason: adjReason,
      evidenceUrl: adjUrl || null,
    });
    setAdjOpen(false);
  }

  if (!loadingProf && !professorId) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Minha Rotina' }, { label: 'Minha Presença' }]}
          title="Minha Presença"
          description="Sua folha de ponto mensal, gerada automaticamente pelas chamadas que você realiza"
        />
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <p className="text-lg font-semibold">Perfil de professor não encontrado</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Seu usuário não está vinculado a um registro de professor. Solicite ao administrador a regularização do seu cadastro para acessar a folha de ponto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Minha Rotina' }, { label: 'Minha Presença' }]}
        title="Minha Presença"
        description="Sua folha de ponto mensal, gerada automaticamente pelas chamadas que você realiza"
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {professorId && canGenerate && (
              <Button variant="outline" onClick={() => generate.mutate({ professorId, year, month })} disabled={generate.isPending}>
                {generate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Plus className="h-4 w-4 mr-2"/>}
                Atualizar folha
              </Button>
            )}
            {sheet && (
              <Button variant="outline" onClick={() => generatePdf.mutate(sheet.id)} disabled={generatePdf.isPending}>
                {generatePdf.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <FileDown className="h-4 w-4 mr-2"/>}
                Baixar folha
              </Button>
            )}
          </div>

          {(isLoading || loadingProf || (sheets.length === 0 && generate.isPending)) && (
            <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>
          )}

          {!isLoading && sheet && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Aulas previstas" value={sheet.total_expected_entries}/>
                <Stat label="Presentes" value={sheet.total_present_entries} color="text-green-600"/>
                <Stat label="Ausências" value={sheet.total_absent_entries} color="text-red-600"/>
                <Stat label="Pendentes" value={sheet.total_pending_entries}/>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-between border rounded-lg p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Status da folha</p>
                    <Badge className="mt-1">{STATUS_LABEL[sheet.status]}</Badge>
                  </div>
                  {locked && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4"/> Folha fechada — não é possível solicitar ajustes.
                    </div>
                  )}
                  {requireAck && alreadyAck && (
                    <Badge variant="outline" className="gap-1 border-green-300 text-green-700">
                      <CheckCircle2 className="h-3 w-3"/> Ciência registrada em {format(new Date(sheet.professor_acknowledged_at!), "dd/MM/yyyy HH:mm")}
                    </Badge>
                  )}
                </div>
                {requireAck && !alreadyAck && !locked && (
                  <Button onClick={() => acknowledge.mutate({ sheetId: sheet.id })} disabled={acknowledge.isPending}>
                    {acknowledge.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>}
                    Dar ciência da folha
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {sheet && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold mb-3">Minhas aulas</h3>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Turma / Disciplina</TableHead>
                    <TableHead>Chamada</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nenhuma aula prevista neste mês.</TableCell></TableRow>
                  )}
                  {entries.map((e: any) => {
                    const isPlanning = e.slot_type === 'PLANNING';
                    return (
                    <TableRow key={e.id} className={isPlanning ? 'bg-blue-50/30' : ''}>
                      <TableCell className="text-xs">{format(new Date(e.scheduled_start_at), 'dd/MM EEE', { locale: ptBR })}</TableCell>
                      <TableCell className="text-xs">{format(new Date(e.scheduled_start_at), 'HH:mm')}–{format(new Date(e.scheduled_end_at), 'HH:mm')}</TableCell>
                      <TableCell className="text-sm">{e.schools?.nome || '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{e.class_groups?.nome || '—'}</div>
                        <div className="text-xs text-muted-foreground">{e.subjects?.nome || '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {isPlanning ? <span className="text-blue-600">auto</span> : e.actual_call_started_at ? format(new Date(e.actual_call_started_at), 'HH:mm') : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {isPlanning
                          ? <Badge className="text-xs bg-blue-100 text-blue-700" title="1/3 da carga, auto-confirmado pela grade">Planejamento</Badge>
                          : <Badge variant="outline" className="text-xs">Aula</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{FINAL_STATUS_LABEL[e.final_status] || e.final_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canRequest && !isPlanning ? (
                          <Button size="sm" variant="ghost" onClick={() => openAdjust(e)}>
                            <MessageSquarePlus className="h-4 w-4 mr-1"/> Ajustar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>
            {!canRequest && !locked && (
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3"/> Solicitações de ajuste estão desabilitadas. Procure a Coordenação.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste</DialogTitle>
            <DialogDescription>
              {adjEntry && (
                <>Aula de {format(new Date(adjEntry.scheduled_start_at), "dd/MM 'às' HH:mm")} • {adjEntry.subjects?.nome}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de ajuste</Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="correct_status">Corrigir status da aula</SelectItem>
                  <SelectItem value="register_absence_justification">Registrar justificativa</SelectItem>
                  
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status desejado</Label>
              <Select value={adjStatus} onValueChange={setAdjStatus}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justificativa <span className="text-red-500">*</span></Label>
              <Textarea value={adjReason} onChange={(e) => setAdjReason(e.target.value)} rows={3} placeholder="Explique o motivo da solicitação"/>
            </div>
            <div>
              <Label>Anexo (URL — opcional)</Label>
              <Input value={adjUrl} onChange={(e) => setAdjUrl(e.target.value)} placeholder="https://..."/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancelar</Button>
            <Button onClick={submitAdjust} disabled={!adjReason.trim() || requestAdjustment.isPending}>
              {requestAdjustment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card><CardContent className="pt-4 pb-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
    </CardContent></Card>
  );
}
