import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Paperclip, MessageSquare, Building2, Clock, AlertCircle, UserX, Flame } from 'lucide-react';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TicketActivity } from '../hooks/useTicketActivity';
import { TicketRowActions } from './TicketRowActions';

interface Props {
  ticket: any;
  activity?: TicketActivity;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  priorityLabels: Record<string, string>;
  priorityColors: Record<string, string>;
  selected?: boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  selectionActive?: boolean;
}

const CLOSED = ['resolvido', 'cancelado'];

const PRIORITY_DOT: Record<string, string> = {
  critica: 'bg-red-500',
  alta: 'bg-orange-500',
  media: 'bg-blue-500',
  baixa: 'bg-muted-foreground/40',
};

const PRIORITY_BORDER: Record<string, string> = {
  critica: 'border-l-red-500',
  alta: 'border-l-orange-500',
  media: 'border-l-blue-500',
  baixa: 'border-l-muted',
};

const STATUS_PILL: Record<string, string> = {
  aberto: 'bg-blue-500 text-white',
  em_atendimento: 'bg-amber-500 text-white',
  aguardando_escola: 'bg-purple-500 text-white',
  resolvido: 'bg-green-500 text-white',
  cancelado: 'bg-muted text-muted-foreground',
};

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function TicketListItem({
  ticket, activity, statusLabels, priorityLabels,
  selected, onToggleSelect, selectionActive,
}: Props) {
  const updatedAt = ticket.updated_at || ticket.created_at;
  const hoursStale = differenceInHours(new Date(), new Date(updatedAt));
  const isStale = !CLOSED.includes(ticket.status) && hoursStale >= 72;
  const isWarn = !CLOSED.includes(ticket.status) && hoursStale >= 24 && hoursStale < 72;

  const shortId = ticket.id.slice(0, 4).toUpperCase();
  const isInternal = ticket.type === 'interno';
  const isExternal = !!ticket.external_author_name;

  const responsibleName = ticket.external_author_name || (isInternal ? 'Interno' : ticket.schools?.nome);
  const assigneeName = ticket.nexa_responsible_name || ticket.school_responsible_name;
  const hasAssignee = !!(ticket.nexa_responsible_id || ticket.school_responsible_id);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleSelect?.(ticket.id, e.shiftKey);
  };

  return (
    <Card className={cn(
      'group hover:shadow-md hover:border-primary/30 transition-all border-l-4 relative overflow-hidden',
      PRIORITY_BORDER[ticket.priority] || 'border-l-muted',
      selected && 'ring-2 ring-primary bg-primary/5',
    )}>
      <CardContent className="py-3 px-3 sm:px-4">
        <div className="flex items-start gap-3">
          {/* Checkbox de seleção */}
          {onToggleSelect && (
            <div
              className={cn(
                'pt-1 transition-opacity',
                selectionActive || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
              )}
              onClick={handleCheckboxClick}
            >
              <Checkbox checked={selected} aria-label={`Selecionar ${ticket.title}`} />
            </div>
          )}

          {/* Conteúdo principal */}
          <Link to={`/tickets/${ticket.id}`} className="flex-1 min-w-0 block">
            {/* Linha 1 — meta superior */}
            <div className="flex items-center gap-2 mb-1.5 text-[11px]">
              <span className="font-mono text-muted-foreground">#{shortId}</span>
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT[ticket.priority])} />
              <span className="text-muted-foreground capitalize">{priorityLabels[ticket.priority]}</span>
              {ticket.priority === 'critica' && (
                <Flame className="h-3 w-3 text-red-500" />
              )}
              <span className="text-muted-foreground/40">•</span>
              {isInternal && <span className="text-muted-foreground">Interno</span>}
              {isExternal && <span className="text-muted-foreground">Externo</span>}
              {!isInternal && !isExternal && <span className="text-muted-foreground">Escola</span>}
              <span className={cn(
                'ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                STATUS_PILL[ticket.status] || 'bg-muted text-muted-foreground',
              )}>
                {statusLabels[ticket.status]}
              </span>
            </div>

            {/* Linha 2 — título grande */}
            <p className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 mb-2">
              {ticket.title}
            </p>

            {/* Linha 3 — meta inferior */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {/* Responsável */}
              <div className="flex items-center gap-1.5 min-w-0">
                {hasAssignee ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                        {getInitials(assigneeName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[140px] text-foreground/80">{assigneeName || 'Atribuído'}</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    <UserX className="h-3 w-3" /> Sem responsável
                  </span>
                )}
              </div>

              {/* Origem */}
              {responsibleName && (
                <span className="flex items-center gap-1 min-w-0 max-w-[200px]">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{responsibleName}</span>
                </span>
              )}

              {/* Atividade */}
              {activity && activity.messages > 0 && (
                <span className="flex items-center gap-1" title="Mensagens">
                  <MessageSquare className="h-3 w-3" />
                  {activity.messages}
                </span>
              )}
              {activity && activity.attachments > 0 && (
                <span className="flex items-center gap-1" title="Anexos">
                  <Paperclip className="h-3 w-3" />
                  {activity.attachments}
                </span>
              )}

              {/* Tempo — sempre à direita, com semáforo */}
              <span className={cn(
                'flex items-center gap-1 ml-auto',
                isStale && 'text-red-600 dark:text-red-400 font-medium',
                isWarn && 'text-amber-600 dark:text-amber-400',
              )}>
                {isStale && <AlertCircle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(updatedAt), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          </Link>

          {/* Ações — sempre visíveis */}
          <div className="shrink-0 flex items-center">
            <TicketRowActions ticket={ticket} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
