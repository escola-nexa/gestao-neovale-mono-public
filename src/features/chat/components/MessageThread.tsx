import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { MessageItem } from './MessageItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  channelId: string;
  organizationId: string;
  onOpenThread?: (msgId: string) => void;
  highlightMessageId?: string | null;
}

const GROUP_THRESHOLD_MINUTES = 5;
const NEAR_BOTTOM_PX = 160;

import { useTypingPresence } from '../hooks/useTypingPresence';
import { TypingIndicator } from './TypingIndicator';

export function MessageThread({ channelId, organizationId, onOpenThread, highlightMessageId }: MessageThreadProps) {
  const { messages, loading } = useChannelMessages(channelId);
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { typing } = useTypingPresence(channelId, (user as any)?.nome || (user as any)?.email);

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const lastChannelRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const userScrolledRef = useRef(false);

  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Localiza o viewport interno do Radix ScrollArea
  useEffect(() => {
    if (!scrollRootRef.current) return;
    viewportRef.current = scrollRootRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
  }, [loading]);

  const scrollToBottom = useCallback((smooth = false) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Rastreia distância do fim
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => {
      const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      const near = distance < NEAR_BOTTOM_PX;
      isNearBottomRef.current = near;
      userScrolledRef.current = true;
      setShowJumpToBottom(!near);
      if (near) setUnreadCount(0);
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    return () => vp.removeEventListener('scroll', onScroll);
  }, [loading]);

  // Auto-scroll ao abrir canal (resiliente a mídia carregando depois)
  useEffect(() => {
    if (loading) return;
    const vp = viewportRef.current;
    if (!vp || messages.length === 0) return;

    const channelChanged = lastChannelRef.current !== channelId;
    const lastMsg = messages[messages.length - 1];
    const newLastMessage = lastMsg && lastMsg.id !== lastMessageIdRef.current;

    if (channelChanged) {
      // Se há highlight (deep-link), prioridade do scrollIntoView; pula auto-scroll ao fim
      if (highlightMessageId) {
        lastChannelRef.current = channelId;
        lastMessageIdRef.current = lastMsg?.id ?? null;
        userScrolledRef.current = false;
        setUnreadCount(0);
        return;
      }

      userScrolledRef.current = false;
      setUnreadCount(0);
      setShowJumpToBottom(false);

      // Múltiplas tentativas pós-render (imagens/anexos podem expandir layout depois)
      requestAnimationFrame(() => scrollToBottom(false));
      const t1 = window.setTimeout(() => scrollToBottom(false), 80);
      const t2 = window.setTimeout(() => scrollToBottom(false), 350);

      // Observa crescimento do conteúdo por ~1.5s; só re-scrolla se o usuário não rolou
      const content = scrollRootRef.current?.querySelector(
        '[data-radix-scroll-area-viewport] > *'
      ) as HTMLElement | null;
      let ro: ResizeObserver | null = null;
      if (content && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (!userScrolledRef.current) scrollToBottom(false);
        });
        ro.observe(content);
      }
      const tStop = window.setTimeout(() => {
        ro?.disconnect();
      }, 1500);

      lastChannelRef.current = channelId;
      lastMessageIdRef.current = lastMsg?.id ?? null;

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(tStop);
        ro?.disconnect();
      };
    }

    // Nova mensagem no mesmo canal
    if (newLastMessage) {
      const isOwn = !!currentUserId && lastMsg.author_id === currentUserId;
      if (isNearBottomRef.current || isOwn) {
        requestAnimationFrame(() => scrollToBottom(true));
        setUnreadCount(0);
      } else {
        setUnreadCount((c) => c + 1);
      }
    }
    lastMessageIdRef.current = lastMsg?.id ?? null;
  }, [messages, channelId, loading, highlightMessageId, currentUserId, scrollToBottom]);

  // Preserva posição do scroll em refreshes silenciosos (poll/leituras/etiquetas)
  // Captura distância até o fim ANTES da re-renderização e restaura DEPOIS,
  // evitando o "salto para o topo" quando a lista é re-criada.
  const preservedDistanceRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (lastChannelRef.current !== channelId) return; // troca de canal usa fluxo próprio
    if (isNearBottomRef.current) return; // se está no fim, deixa o auto-scroll cuidar
    preservedDistanceRef.current = vp.scrollHeight - vp.scrollTop;
  });
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const dist = preservedDistanceRef.current;
    if (dist == null) return;
    const target = vp.scrollHeight - dist;
    if (Math.abs(vp.scrollTop - target) > 1) {
      vp.scrollTop = target;
    }
    preservedDistanceRef.current = null;
  }, [messages]);

  // scroll to highlighted message (deep-link)
  useEffect(() => {
    if (!highlightMessageId || messages.length === 0) return;
    const el = document.getElementById(`msg-${highlightMessageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightMessageId, messages.length]);

  const handleJumpToBottom = () => {
    scrollToBottom(true);
    setUnreadCount(0);
    setShowJumpToBottom(false);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-3/4 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Nenhuma mensagem ainda</p>
        <p className="text-xs text-muted-foreground">Seja o primeiro a iniciar a conversa.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea className="h-full" ref={scrollRootRef as any}>
        <div className="min-w-0 py-4 px-2 sm:px-4">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDay = !prev || !isSameDay(parseISO(m.created_at), parseISO(prev.created_at));
            const isGrouped =
              !showDay &&
              !!prev &&
              prev.author_id === m.author_id &&
              !prev.is_announcement &&
              !m.is_announcement &&
              differenceInMinutes(parseISO(m.created_at), parseISO(prev.created_at)) <= GROUP_THRESHOLD_MINUTES;

            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3 my-4 sticky top-0 z-[1]">
                    <div className="flex-1 h-px bg-border" />
                    <span className="min-w-0 max-w-[70%] text-center text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border whitespace-normal break-words [overflow-wrap:anywhere]">
                      {format(parseISO(m.created_at), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <MessageItem
                  message={m}
                  grouped={isGrouped}
                  organizationId={organizationId}
                  onOpenThread={onOpenThread}
                  highlight={highlightMessageId === m.id}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {showJumpToBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            type="button"
            size="sm"
            onClick={handleJumpToBottom}
            className={cn(
              'rounded-full shadow-lg gap-1.5 pl-3 pr-3 h-9',
              'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
            aria-label="Ir para a última mensagem"
          >
            <ArrowDown className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="text-xs font-bold tabular-nums">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <TypingIndicator typing={typing} />
      </div>
    </div>
  );
}
