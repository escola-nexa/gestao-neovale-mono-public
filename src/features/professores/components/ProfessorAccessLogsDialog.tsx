import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, ShieldCheck, ShieldAlert, Smartphone, Monitor, MapPin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { professoresApi } from '@/features/professores/api';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professorId: string;
  professorName: string;
}

export function ProfessorAccessLogsDialog({ open, onOpenChange, professorId, professorName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['professor-access-logs', professorId],
    enabled: open && !!professorId,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('external_links')
        .select('id, token, created_at, expires_at, is_active, scope_json')
        .eq('content_type', 'documentos_professor')
        .order('created_at', { ascending: false });

      const myLinks = (links ?? []).filter(
        (l: any) => l.scope_json && l.scope_json.professor_id === professorId,
      );
      const linkIds = myLinks.map((l) => l.id);
      if (linkIds.length === 0) return { links: [], logs: [] };

      const { data: logs } = await supabase
        .from('external_access_logs')
        .select(
          'id, external_link_id, accessed_at, access_status, access_type, action_performed, ip_address, city_name, user_agent, device_type, failure_reason',
        )
        .in('external_link_id', linkIds)
        .order('accessed_at', { ascending: false })
        .limit(200);

      return { links: myLinks, logs: logs ?? [] };
    },
  });

  const logs = data?.logs ?? [];
  const links = data?.links ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#1B1E2C]" />
            Auditoria de Acesso — {professorName}
          </DialogTitle>
          <DialogDescription>
            Histórico de visitas e ações registradas nos links de Documentos do Professor.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Nenhum link de compartilhamento foi gerado para este professor ainda.
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Link(s) gerado(s), mas o professor ainda não acessou.
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-2">
              {logs.map((log: any) => {
                const ok = log.access_status === 'authorized';
                const isMobile = log.device_type === 'mobile';
                return (
                  <div key={log.id} className="rounded-md border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {ok ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {log.action_performed || log.access_type || '—'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(log.accessed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={ok ? 'default' : 'destructive'}
                        className={ok ? 'bg-emerald-600 hover:bg-emerald-600/90 shrink-0' : 'shrink-0'}
                      >
                        {ok ? 'Autorizado' : 'Negado'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                        {log.device_type || '—'}
                      </span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                      {log.city_name && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {log.city_name}
                        </span>
                      )}
                      {log.failure_reason && (
                        <span className="text-destructive">Motivo: {log.failure_reason}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="text-[11px] text-muted-foreground pt-2 border-t">
          {links.length} link(s) gerado(s) · {logs.length} acesso(s) registrado(s)
        </div>
      </DialogContent>
    </Dialog>
  );
}
