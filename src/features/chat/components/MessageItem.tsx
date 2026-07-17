import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import {
  Pin, Trash2, Megaphone, Download, FileImage, MoreHorizontal,
  Ticket as TicketIcon, MessagesSquare, Tag, Eye,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChatMessage } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/features/chat/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isManagerRole } from '@/lib/roles';
import { CreateTicketFromMessageDialog } from './CreateTicketFromMessageDialog';
import { MessageLabelPicker } from './MessageLabelPicker';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { RenderMessageBody, isCurrentUserMentioned } from '../utils/parseMentions';
import { useSavedMessages } from '../hooks/useSavedMessages';
import { Bookmark, BookmarkCheck, Forward } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageReadReceiptsDialog } from './MessageReadReceiptsDialog';
import { MessageReactions, MessageReactionMenu } from './MessageReactions';

interface MessageItemProps {
  message: ChatMessage;
  grouped?: boolean;
  organizationId: string;
  onOpenTicket?: (msgId: string) => void;
  onOpenThread?: (msgId: string) => void;
  inThread?: boolean;
  highlight?: boolean;
}

export function MessageItem({
  message, grouped = false, organizationId, onOpenTicket, onOpenThread, inThread, highlight,
}: MessageItemProps) {
  const { user } = useAuth();
  const isAdmin = isManagerRole(user?.perfil);
  const isMine = user?.id === message.author_id;
  const [busy, setBusy] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [readReceiptsOpen, setReadReceiptsOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const { savedIds, save, unsave } = useSavedMessages();
  const isSaved = savedIds.has(message.id);
  const mentionedMe = isCurrentUserMentioned(message.body, user?.id);


  const handlePin = async () => {
    setBusy(true);
    await chatApi.client.from('chat_messages').update({ is_pinned: !message.is_pinned }).eq('id', message.id);
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!confirm('Excluir mensagem?')) return;
    setBusy(true);
    await supabase
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', message.id);
    setBusy(false);
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await chatApi.client.storage.from('chat-attachments').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { toast.error('Erro ao gerar link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const initials = (message.author_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const labelIds = (message.labels || []).map(l => l.id);

  // signed-url cache for inline previews handled via createSignedUrl on demand
  const renderAttachment = (a: any) => {
    if (a.kind === 'link' && a.url) {
      return (
        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
          🔗 {a.url}
        </a>
      );
    }
    const isAudio = (a.mime_type || '').startsWith('audio/');
    const isPdf = (a.mime_type || '') === 'application/pdf';
    const isImage = a.kind === 'image' || (a.mime_type || '').startsWith('image/');

    if (isImage && a.file_path) {
      return <ImagePreview key={a.id} path={a.file_path} name={a.file_name || 'imagem'} />;
    }
    if (isAudio && a.file_path) {
      return <AudioPreview key={a.id} path={a.file_path} name={a.file_name || 'áudio'} />;
    }
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => a.file_path && downloadAttachment(a.file_path)}
        className="inline-flex min-w-0 items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors max-w-full sm:max-w-[260px]"
      >
        {isPdf
          ? <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1 rounded">PDF</span>
          : <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="truncate font-medium">{a.file_name || 'arquivo'}</span>
      </button>
    );
  };

  // Soft-deleted messages: only admins can see them, rendered as red placeholder
  if (message.deleted_at) {
    if (!isAdmin) return null;
    return (
      <div
        id={`msg-${message.id}`}
        className={cn(
          'group relative flex gap-3 px-2 rounded-md transition-colors',
          grouped ? 'py-0.5' : 'pt-2 pb-1 mt-0.5',
          'hover:bg-destructive/5'
        )}
      >
        <div className="w-9 shrink-0">
          {!grouped && (
            <Avatar className="h-9 w-9 mt-0.5 opacity-60">
              {message.author_avatar && <AvatarImage src={message.author_avatar} />}
              <AvatarFallback className="text-[11px] bg-muted text-muted-foreground font-semibold">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {!grouped && (
            <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-semibold leading-tight text-muted-foreground line-through">
                {message.author_name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(message.created_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 italic">
            <Trash2 className="h-3.5 w-3.5" />
            Mensagem deletada por {message.deleted_by_name || 'usuário'}
            {message.deleted_at && (
              <span className="text-[10px] font-normal opacity-80 not-italic">
                · {format(parseISO(message.deleted_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
            (Visível apenas para administradores)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group relative flex min-w-0 gap-2 sm:gap-3 px-2 rounded-md transition-colors',
        grouped ? 'py-0.5' : 'pt-2 pb-1 mt-0.5',
        !highlight && 'hover:bg-muted/40',
        message.is_announcement && !inThread && 'bg-primary/8 hover:bg-primary/10 border-l-[3px] border-primary px-3 py-2 mt-2',
        mentionedMe && !highlight && 'bg-primary/10 border-l-[3px] border-primary',
        highlight && 'bg-primary/15 ring-2 ring-primary/40'
      )}
    >
      <div className="w-8 sm:w-9 shrink-0">
        {!grouped ? (
          <Avatar className="h-9 w-9 mt-0.5">
            {message.author_avatar && <AvatarImage src={message.author_avatar} />}
            <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/80 flex items-center justify-center h-5 mt-0.5">
            {format(parseISO(message.created_at), 'HH:mm', { locale: ptBR })}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold leading-tight">{message.author_name}</span>
            <span className="text-[10px] text-muted-foreground">
              {format(parseISO(message.created_at), "HH:mm", { locale: ptBR })}
            </span>
            {message.is_pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <Pin className="h-3 w-3" /> Fixado
              </span>
            )}
            {message.is_announcement && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wide">
                <Megaphone className="h-3 w-3" /> Comunicado
              </span>
            )}
          </div>
        )}

        {message.body && (
          <div className="max-w-full text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-foreground">
            <RenderMessageBody body={message.body} currentUserId={user?.id} />
          </div>
        )}

        {(message.attachments || []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.attachments!.map(renderAttachment)}
          </div>
        )}

        {/* Labels */}
        {(message.labels || []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.labels!.map(l => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${l.color}20`, color: l.color }}
              >
                <Tag className="h-2.5 w-2.5" />
                {l.name}
              </span>
            ))}
          </div>
        )}

        {/* Reações */}
        <MessageReactions messageId={message.id} showInlineAdd={false} />

        {/* Linked tickets */}
        {(message.linked_tickets || []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.linked_tickets!.map(t => (
              <a
                key={t.ticket_id}
                href={`/tickets/${t.ticket_id}`}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <TicketIcon className="h-3 w-3" />
                Ticket vinculado
              </a>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {!inThread && (message.reply_count ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            <MessagesSquare className="h-3 w-3" />
            {message.reply_count} {message.reply_count === 1 ? 'resposta' : 'respostas'}
            {message.last_reply_at && (
              <span className="text-muted-foreground font-normal">
                · última {formatDistanceToNow(parseISO(message.last_reply_at), { locale: ptBR, addSuffix: false })}
              </span>
            )}
          </button>
        )}

        {(() => {
          const readers = (message.read_by || []).filter(r => r.user_id !== message.author_id);
          if (grouped) return null;

          // Autor: botão dedicado para abrir painel de confirmações de leitura
          if (isMine) {
            const sorted = [...readers].sort((a, b) => (a.read_at < b.read_at ? -1 : 1));
            const lastRead = sorted[sorted.length - 1];
            return (
              <button
                type="button"
                onClick={() => setReadReceiptsOpen(true)}
                className={cn(
                  'mt-1 inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border transition-colors',
                  readers.length > 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-muted-foreground/20 bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
                title="Ver quem leu esta mensagem"
              >
                <Eye className="h-3 w-3" />
                <span className="font-semibold">
                  {readers.length === 0
                    ? 'Aguardando leitura'
                    : `Lido por ${readers.length}`}
                </span>
                {lastRead && (
                  <span className="opacity-70 font-normal">
                    · {formatDistanceToNow(parseISO(lastRead.read_at), { locale: ptBR, addSuffix: true })}
                  </span>
                )}
              </button>
            );
          }

          // Outros usuários: indicador compacto com avatares + tooltip
          if (readers.length === 0) return null;
          const sorted = [...readers].sort((a, b) => (a.read_at < b.read_at ? -1 : 1));
          const shown = sorted.slice(0, 3);
          const extra = sorted.length - shown.length;
          const lastRead = sorted[sorted.length - 1];
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  <div className="flex -space-x-1.5">
                    {shown.map(r => {
                      const ini = (r.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <Avatar key={r.user_id} className="h-4 w-4 ring-1 ring-background">
                          {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                          <AvatarFallback className="text-[8px] bg-muted text-foreground/70">{ini}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                  <span className="font-medium">
                    Visto {extra > 0 ? `por ${sorted.length}` : ''}
                  </span>
                  <span className="text-muted-foreground/60">
                    · {formatDistanceToNow(parseISO(lastRead.read_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Lido por {sorted.length} {sorted.length === 1 ? 'pessoa' : 'pessoas'}
                  </div>
                  {sorted.slice(0, 12).map(r => (
                    <div key={r.user_id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium">{r.full_name || 'Usuário'}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(parseISO(r.read_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  {sorted.length > 12 && (
                    <div className="text-[10px] text-muted-foreground pt-1">
                      +{sorted.length - 12} outros
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })()}
      </div>

      {/* Hover actions */}
      <div className={cn(
        "absolute -top-3 right-3 items-center gap-0.5 bg-card border rounded-md shadow-md p-0.5 z-10",
        (labelPickerOpen || actionsMenuOpen) ? "flex" : "hidden group-hover:flex"
      )}>
        <MessageReactionMenu messageId={message.id} />
        {!inThread && onOpenThread && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenThread(message.id)} title="Responder em thread">
            <MessagesSquare className="h-3.5 w-3.5" />
          </Button>
        )}
        <MessageLabelPicker
          organizationId={organizationId}
          messageId={message.id}
          appliedIds={labelIds}
          onOpenChange={setLabelPickerOpen}
        />
        {isAdmin && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePin} disabled={busy} title={message.is_pinned ? 'Desfixar' : 'Fixar'}>
            <Pin className={cn("h-3.5 w-3.5", message.is_pinned && "fill-current text-amber-500")} />
          </Button>
        )}
        <DropdownMenu open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => isSaved ? unsave(message.id) : save(message.id)}>
              {isSaved
                ? <><BookmarkCheck className="h-3.5 w-3.5 mr-2 text-primary" /> Remover dos salvos</>
                : <><Bookmark className="h-3.5 w-3.5 mr-2" /> Salvar mensagem</>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setForwardOpen(true)}>
              <Forward className="h-3.5 w-3.5 mr-2" /> Encaminhar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTicketDialogOpen(true)}>
              <TicketIcon className="h-3.5 w-3.5 mr-2" /> Abrir ticket desta mensagem
            </DropdownMenuItem>
            {!inThread && onOpenThread && (
              <DropdownMenuItem onClick={() => onOpenThread(message.id)}>
                <MessagesSquare className="h-3.5 w-3.5 mr-2" /> Responder em thread
              </DropdownMenuItem>
            )}
            {(isMine || user?.perfil === 'admin') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir mensagem
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateTicketFromMessageDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        message={message}
        channelId={message.channel_id}
        organizationId={organizationId}
      />

      <ForwardMessageDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        message={{ id: message.id, body: message.body, channel_id: message.channel_id, author_name: message.author_name }}
      />

      {isMine && (
        <MessageReadReceiptsDialog
          open={readReceiptsOpen}
          onOpenChange={setReadReceiptsOpen}
          messageId={message.id}
          channelId={message.channel_id}
          authorId={message.author_id}
          messageCreatedAt={message.created_at}
          readBy={message.read_by || []}
        />
      )}
    </div>
  );
}

/** Small inline preview for image attachments */
function ImagePreview({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    chatApi.client.storage.from('chat-attachments').createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl || null);
    });
    return () => { active = false; };
  }, [path]);

  if (!url) {
    return (
      <div className="h-32 w-44 rounded border bg-muted flex items-center justify-center">
        <FileImage className="h-5 w-5 text-muted-foreground animate-pulse" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-[280px]">
      <img
        src={url} alt={name}
        loading="lazy"
        className="rounded border max-h-60 object-cover hover:opacity-90 transition-opacity"
      />
    </a>
  );
}

/** Inline audio player */
function AudioPreview({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    chatApi.client.storage.from('chat-attachments').createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl || null);
    });
    return () => { active = false; };
  }, [path]);

  if (!url) {
    return (
      <div className="text-xs px-2 py-1.5 rounded border bg-muted text-muted-foreground">
        Carregando áudio…
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 p-2 rounded-md border bg-card max-w-[320px]">
      <span className="text-[10px] text-muted-foreground truncate" title={name}>{name}</span>
      <audio src={url} controls className="h-8 w-full" />
    </div>
  );
}
