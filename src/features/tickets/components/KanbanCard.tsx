import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Clock, MessageSquare, Paperclip, CheckSquare, Eye, Hash, Folder, Building2, UserX, Flame, Lock } from 'lucide-react';
import { format, formatDistanceToNowStrict, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TicketRowActions } from './TicketRowActions';
import type { TicketsEnrichment } from '../hooks/useTicketsEnrichment';
import type { TicketActivity } from '../hooks/useTicketActivity';

const priorityConfig: Record<string, { label: string; class: string; dot: string }> = {
  baixa: { label: 'Baixa', class: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  media: { label: 'Média', class: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' },
  alta: { label: 'Alta', class: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', dot: 'bg-orange-500' },
  critica: { label: 'Crítica', class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
};

const STATUS_PILL: Record<string, { label: string; class: string }> = {
  aberto: { label: 'Aberto', class: 'bg-blue-500 text-white' },
  em_atendimento: { label: 'Em Atendimento', class: 'bg-amber-500 text-white' },
  aguardando_escola: { label: 'Aguardando', class: 'bg-purple-500 text-white' },
  resolvido: { label: 'Resolvido', class: 'bg-green-500 text-white' },
  cancelado: { label: 'Cancelado', class: 'bg-muted text-muted-foreground' },
};

interface KanbanCardProps {
  ticket: any;
  isDragging?: boolean;
  onOpen?: (ticket: any) => void;
  labelMap?: Record<string, string[]>;
  progressMap?: Record<string, { total: number; done: number }>;
  labelsCatalog?: Array<{ id: string; name: string; color: string }>;
  enrichment?: TicketsEnrichment;
  activity?: TicketActivity;
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function stripHtml(s?: string | null): string {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function KanbanCard({
  ticket, isDragging, onOpen, labelMap, progressMap, labelsCatalog, enrichment, activity,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: ticket.id, data: { type: 'card', ticket }
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSortableDragging ? 0.3 : 1 };

  const isInternal = ticket.type === 'interno';
  const isExternal = !!ticket.external_author_name;
  const priority = priorityConfig[ticket.priority] || priorityConfig.media;
  const status = STATUS_PILL[ticket.status] || { label: ticket.status, class: 'bg-muted text-muted-foreground' };
  const isResolved = ['resolvido', 'cancelado'].includes(ticket.status);

  const hasDueDate = !!ticket.due_date;
  const dueDate = hasDueDate ? new Date(ticket.due_date) : null;
  const isOverdue = dueDate ? isPast(dueDate) : false;
  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
  const isSlaWarning = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 2;

  // Stale semaphore (mesma regra da lista)
  const updatedAt = ticket.updated_at || ticket.created_at;
  const hoursStale = differenceInHours(new Date(), new Date(updatedAt));
  const isStale = !isResolved && hoursStale >= 72;
  const isWarn = !isResolved && hoursStale >= 24 && hoursStale < 72;

  // Short ID
  const shortId = ticket.id.slice(0, 4).toUpperCase();

  // Categoria
  const category = ticket.category_id ? enrichment?.categoryById?.[ticket.category_id] : null;

  // Responsável principal (Nexa primeiro, depois escola)
  const responsibleId = ticket.nexa_responsible_id || ticket.school_responsible_id;
  const responsibleName = responsibleId
    ? enrichment?.profileById?.[responsibleId]?.full_name
    : null;
  const responsibleInitials = getInitials(responsibleName);

  // Origem (escola/interno/externo)
  const originLabel = isExternal
    ? ticket.external_author_name
    : (ticket.schools?.nome || (isInternal ? 'Interno' : null));

  // Assignees adicionais
  const allAssignees = enrichment?.assigneesByTicket?.[ticket.id] || [];
  // Remover o responsável principal da pilha para não duplicar
  const extraAssignees = allAssignees.filter(a => a.user_id !== responsibleId);

  // Labels (estruturadas)
  const ticketLabelIds = labelMap?.[ticket.id] || [];
  const ticketLabels = ticketLabelIds
    .map(id => labelsCatalog?.find(l => l.id === id))
    .filter(Boolean) as Array<{ id: string; name: string; color: string }>;
  const legacyTags: string[] = ticket.tags || [];

  // Checklist progress
  const progress = progressMap?.[ticket.id];
  const hasChecklists = !!progress && progress.total > 0;

  // Cover
  const coverUrl: string | null = ticket.cover_url || null;
  const coverColor: string | null = ticket.cover_color || null;
  const hasCover = !!coverUrl || !!coverColor;

  // Descrição (preview)
  const descriptionPreview = stripHtml(ticket.description).slice(0, 160);

  // Anexos / mensagens (atividade real)
  const messageCount = activity?.messages ?? ticket.message_count ?? 0;
  const attachmentCount = activity?.attachments ?? 0;
  const hasAttachments = attachmentCount > 0 || !!ticket.has_attachments;
  const watcherCount = ticket.watcher_count || 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isSortableDragging) { e.preventDefault(); return; }
    e.preventDefault();
    onOpen?.(ticket);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full min-w-0">
      <div
        onClick={handleClick}
        className={`bg-card rounded-lg border cursor-pointer transition-all duration-200 group overflow-hidden ${
          isDragging ? 'shadow-xl ring-2 ring-primary/30 scale-[1.02]' : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
        } ${ticket.priority === 'critica' ? 'border-destructive/40' : 'border-border/60'} ${
          isOverdue && !isResolved ? 'border-l-[3px] border-l-destructive' : ''
        } ${isSlaWarning && !isOverdue && !isResolved ? 'border-l-[3px] border-l-amber-400' : ''}`}
      >
        {/* Cover */}
        {hasCover && (
          coverUrl ? (
            <div className="h-20 w-full bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />
          ) : (
            <div className="h-8 w-full" style={{ backgroundColor: coverColor! }} />
          )
        )}

        {/* Labels estruturadas (pílulas) */}
        {ticketLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-2.5">
            {ticketLabels.slice(0, 6).map(l => (
              <Tooltip key={l.id}>
                <TooltipTrigger asChild>
                  <span
                    className="text-[10px] font-medium px-1.5 py-[2px] rounded-sm text-white truncate max-w-[120px]"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{l.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Tags legadas */}
        {ticketLabels.length === 0 && legacyTags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-2.5">
            {legacyTags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-[10px] font-medium px-1.5 py-[2px] rounded-sm bg-primary/10 text-primary">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="p-3 space-y-2">
          {/* Linha topo: #ID • tipo • status pill */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-mono text-muted-foreground inline-flex items-center">
              <Hash className="h-2.5 w-2.5" />{shortId}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-muted-foreground capitalize">
              {isInternal ? 'Interno' : isExternal ? 'Externo' : 'Escola'}
            </span>
            <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${status.class}`}>
              {status.label}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground leading-snug break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
            {ticket.title}
          </p>

          {/* Descrição preview */}
          {descriptionPreview && (
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]">
              {descriptionPreview}
            </p>
          )}

          {/* Comentários (preview — últimas 2 mensagens) */}
          {activity?.recentMessages && activity.recentMessages.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-2.5 w-2.5" />
                Comentários
                <span className="ml-auto font-normal tabular-nums opacity-70">
                  {activity.messages} no total
                </span>
              </div>
              {activity.recentMessages.map((lm, idx) => {
                const authorName = lm.authorId
                  ? enrichment?.profileById?.[lm.authorId]?.full_name || 'Usuário'
                  : (ticket.external_author_name || 'Externo');
                const previewText = stripHtml(lm.text).slice(0, 140);
                const timeAgo = formatDistanceToNowStrict(new Date(lm.createdAt), { locale: ptBR, addSuffix: true });
                return (
                  <Tooltip key={`${lm.createdAt}-${idx}`}>
                    <TooltipTrigger asChild>
                      <div className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${
                        lm.isInternal
                          ? 'bg-amber-50/70 dark:bg-amber-900/15 border-amber-200/70 dark:border-amber-700/40'
                          : 'bg-muted/40 border-border/60'
                      }`}>
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-muted-foreground">
                          <Avatar className="h-3.5 w-3.5">
                            <AvatarFallback className="text-[7px] bg-primary/15 text-primary font-semibold">
                              {getInitials(authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground/80 truncate max-w-[110px]">{authorName}</span>
                          {lm.isInternal && (
                            <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300">
                              <Lock className="h-2.5 w-2.5" /> interna
                            </span>
                          )}
                          <span className="ml-auto shrink-0">{timeAgo}</span>
                        </div>
                        <p className="text-foreground/80 line-clamp-2 break-words [overflow-wrap:anywhere]">
                          {previewText || (lm.attachments > 0 ? `📎 ${lm.attachments} anexo(s)` : '—')}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      {format(new Date(lm.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · {authorName}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {activity.messages > activity.recentMessages.length && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpen?.(ticket); }}
                  className="w-full text-[10px] text-primary hover:underline text-left px-1"
                >
                  Ver todos os {activity.messages} comentários →
                </button>
              )}
            </div>
          )}



          {/* Badges row: prioridade • categoria */}
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-[18px] gap-1 font-medium ${priority.class}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </Badge>
            {ticket.priority === 'critica' && <Flame className="h-3 w-3 text-destructive animate-pulse" />}
            {category && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-[18px] gap-1 font-medium max-w-[140px]"
                    style={category.color ? { borderColor: category.color, color: category.color } : undefined}
                  >
                    <Folder className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{category.name}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Categoria: {category.name}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Origem (escola / autor externo) */}
          {originLabel && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{originLabel}</span>
            </div>
          )}

          {/* Datas / checklist */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
            {hasDueDate && dueDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${
                    isResolved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : isOverdue ? 'bg-destructive/10 text-destructive font-semibold'
                    : isSlaWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium'
                    : ''
                  }`}>
                    <Calendar className="h-2.5 w-2.5" />
                    {format(dueDate, 'dd/MM', { locale: ptBR })}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isResolved ? 'Concluído' : isOverdue ? 'Vencido!' : `Vence em ${daysUntilDue} dia(s)`}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`flex items-center gap-0.5 ${
                  isStale ? 'text-red-600 dark:text-red-400 font-medium'
                  : isWarn ? 'text-amber-600 dark:text-amber-400'
                  : 'opacity-70'
                }`}>
                  {isStale && <AlertCircle className="h-2.5 w-2.5" />}
                  <Clock className="h-2.5 w-2.5" />
                  {format(new Date(updatedAt), 'dd/MM HH:mm', { locale: ptBR })}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Última atualização
              </TooltipContent>
            </Tooltip>

            {hasChecklists && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${
                    progress!.done === progress!.total ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''
                  }`}>
                    <CheckSquare className="h-2.5 w-2.5" />
                    {progress!.done}/{progress!.total}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Checklist</TooltipContent>
              </Tooltip>
            )}

            {messageCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                {messageCount}
              </span>
            )}
            {hasAttachments && (
              <span className="flex items-center gap-0.5">
                <Paperclip className="h-2.5 w-2.5" />
                {attachmentCount > 0 ? attachmentCount : ''}
              </span>
            )}
            {watcherCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                {watcherCount}
              </span>
            )}
          </div>

          {/* Mini progress bar checklist */}
          {hasChecklists && (
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${progress!.done === progress!.total ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${(progress!.done / progress!.total) * 100}%` }}
              />
            </div>
          )}

          {/* Footer: responsáveis + ações */}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              {responsibleId ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                          {responsibleInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-foreground/80 truncate max-w-[110px]">
                        {responsibleName || 'Atribuído'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Responsável: {responsibleName || '—'}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                  <UserX className="h-2.5 w-2.5" /> Sem responsável
                </span>
              )}

              {/* Pilha de assignees extras */}
              {extraAssignees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {extraAssignees.slice(0, 3).map(a => (
                    <Tooltip key={a.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-5 w-5 ring-2 ring-background">
                          <AvatarFallback className="text-[8px] bg-muted text-foreground/70 font-semibold">
                            {getInitials(a.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">{a.full_name || 'Usuário'}</TooltipContent>
                    </Tooltip>
                  ))}
                  {extraAssignees.length > 3 && (
                    <span className="h-5 min-w-[20px] px-1 rounded-full bg-muted text-[9px] text-muted-foreground font-semibold flex items-center justify-center ring-2 ring-background">
                      +{extraAssignees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ações rápidas (mesmas da lista) */}
            <TicketRowActions ticket={ticket} compact className="shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
