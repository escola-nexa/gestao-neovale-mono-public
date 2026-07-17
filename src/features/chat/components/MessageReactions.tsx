import { useMessageReactions } from '../hooks/useMessageReactions';
import { EmojiPicker } from './EmojiPicker';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageReactionsProps {
  messageId: string;
  /** Mostrar botão "+" inline para adicionar reação rápida */
  showInlineAdd?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '🔥'];

export function MessageReactions({ messageId, showInlineAdd = true }: MessageReactionsProps) {
  const { groups, toggle } = useMessageReactions(messageId);

  if (groups.length === 0 && !showInlineAdd) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
      {groups.map((g) => (
        <Tooltip key={g.emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(g.emoji)}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 h-6 rounded-full border text-xs transition-colors',
                g.reactedByMe
                  ? 'bg-primary/15 border-primary/40 text-foreground hover:bg-primary/25'
                  : 'bg-muted/60 border-border hover:bg-muted',
              )}
            >
              <span className="text-sm leading-none">{g.emoji}</span>
              <span className="font-semibold tabular-nums text-[11px]">{g.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-[11px] font-semibold mb-0.5">
              Reagiu com {g.emoji}
            </div>
            <div className="space-y-0.5">
              {g.users.slice(0, 10).map((u) => (
                <div key={u.user_id} className="text-xs">
                  {u.user_name || 'Usuário'}
                </div>
              ))}
              {g.users.length > 10 && (
                <div className="text-[10px] text-muted-foreground">
                  +{g.users.length - 10} outros
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

interface MessageReactionMenuProps {
  messageId: string;
}

/** Menu compacto com atalhos rápidos + picker completo. Renderizado na barra de hover. */
export function MessageReactionMenu({ messageId }: MessageReactionMenuProps) {
  const { toggle } = useMessageReactions(messageId);

  return (
    <div className="flex items-center">
      {QUICK_EMOJIS.slice(0, 3).map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => toggle(e)}
          className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-base"
          title={`Reagir com ${e}`}
        >
          {e}
        </button>
      ))}
      <EmojiPicker
        onSelect={(emoji) => toggle(emoji)}
        triggerClassName="h-7 w-7"
        iconClassName="h-3.5 w-3.5"
        title="Mais reações"
        align="end"
        side="top"
      />
    </div>
  );
}
