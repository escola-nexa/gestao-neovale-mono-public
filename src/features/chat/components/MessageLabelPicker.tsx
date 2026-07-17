import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tag, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageLabels, toggleMessageLabel } from '../hooks/useMessageLabels';

interface Props {
  organizationId: string;
  messageId: string;
  appliedIds: string[];
  trigger?: React.ReactNode;
  onChange?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function MessageLabelPicker({ organizationId, messageId, appliedIds, trigger, onChange, onOpenChange }: Props) {
  const { user } = useAuth();
  const { labels, loading } = useMessageLabels(organizationId);
  const [local, setLocal] = useState<string[]>(appliedIds);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setLocal(appliedIds); }, [appliedIds.join(',')]); // eslint-disable-line

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const toggle = async (labelId: string) => {
    if (!user) return;
    const isApplied = local.includes(labelId);
    setBusy(labelId);
    // Optimistic update
    setLocal(prev => isApplied ? prev.filter(x => x !== labelId) : [...prev, labelId]);
    const { error } = await toggleMessageLabel(messageId, labelId, isApplied, user.id);
    setBusy(null);
    if (error) {
      // Revert on failure
      setLocal(prev => isApplied ? [...prev, labelId] : prev.filter(x => x !== labelId));
      toast.error('Não foi possível atualizar a etiqueta: ' + error.message);
      return;
    }
    onChange?.();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Adicionar etiqueta">
            <Tag className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1 z-50"
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        avoidCollisions
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          Etiquetas
        </div>
        {loading ? (
          <div className="py-3 flex justify-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
        ) : labels.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3 px-2">Nenhuma etiqueta disponível.</p>
        ) : (
          <ul className="space-y-px">
            {labels.map(l => {
              const applied = local.includes(l.id);
              return (
                <li key={l.id}>
                  <button
                    onClick={() => toggle(l.id)}
                    disabled={busy === l.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-left"
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="flex-1 text-xs truncate">{l.name}</span>
                    {busy === l.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : applied ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
