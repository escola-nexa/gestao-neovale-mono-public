import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MessagesSquare, Loader2 } from 'lucide-react';
import { useThreadMessages } from '../hooks/useThreadMessages';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import type { ChatChannel } from '../types';

interface Props {
  channel: ChatChannel;
  parentMessageId: string;
  onClose: () => void;
  onOpenTicket?: (msgId: string) => void;
}

export function ThreadPanel({ channel, parentMessageId, onClose, onOpenTicket }: Props) {
  const { parent, replies, loading } = useThreadMessages(parentMessageId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [replies.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight">Thread</div>
            <div className="text-[10px] text-muted-foreground truncate"># {channel.name}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {parent && (
                <div className="border-l-[3px] border-primary/60 bg-muted/30 rounded-r-md mb-3 pl-1 py-1">
                  <MessageItem
                    message={parent}
                    organizationId={channel.organization_id}
                    onOpenTicket={onOpenTicket}
                    inThread
                  />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {replies.map(r => (
                <MessageItem
                  key={r.id}
                  message={r}
                  organizationId={channel.organization_id}
                  onOpenTicket={onOpenTicket}
                  inThread
                />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </ScrollArea>

      <MessageComposer
        channelId={channel.id}
        organizationId={channel.organization_id}
        replyToId={parentMessageId}
        channelName={channel.name + ' (thread)'}
        compact
      />
    </div>
  );
}
