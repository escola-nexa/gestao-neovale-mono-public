import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, Tag, Pencil, Check, X } from 'lucide-react';
import { useChannelLabels } from '../hooks/useChannelLabels';
import { useMessageLabels } from '../hooks/useMessageLabels';
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#14B8A6', '#EC4899', '#6B7280'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
}

export function ManageChatLabelsDialog({ open, onOpenChange, organizationId }: Props) {
  const channelL = useChannelLabels(organizationId);
  const msgL = useMessageLabels(organizationId);
  const [scope, setScope] = useState<'channel' | 'message'>('message');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  const labels = scope === 'channel' ? channelL.labels : msgL.labels;
  const loading = scope === 'channel' ? channelL.loading : msgL.loading;
  const updateFn = scope === 'channel' ? channelL.update : msgL.update;
  const removeFn = scope === 'channel' ? channelL.remove : msgL.remove;

  const submit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    if (scope === 'channel') await channelL.create(name, color);
    else await msgL.create(name, color);
    setName('');
    setCreating(false);
  };

  const startEdit = (id: string, currentName: string, currentColor: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditColor(currentColor);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    await updateFn(editingId, editName, editColor);
    setSavingEdit(false);
    cancelEdit();
  };

  const onSwitchScope = (s: 'channel' | 'message') => {
    setScope(s);
    cancelEdit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Gerenciar etiquetas do chat</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted/40 rounded-md text-xs">
          {(['message', 'channel'] as const).map(s => (
            <button
              key={s}
              onClick={() => onSwitchScope(s)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded font-medium transition-colors',
                scope === s ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'message' ? 'Mensagens' : 'Canais'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da etiqueta"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              maxLength={40}
              className="h-8 text-xs"
            />
            <Button onClick={submit} disabled={creating || !name.trim()} size="sm" className="h-8">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all',
                  color === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <ScrollArea className="h-[260px] -mx-6 px-3">
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : labels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma etiqueta criada.</p>
          ) : (
            <ul className="space-y-1">
              {labels.map(l => {
                const isEditing = editingId === l.id;
                return (
                  <li key={l.id} className="px-2 py-1.5 rounded hover:bg-muted/50">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            maxLength={40}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary"
                            onClick={saveEdit}
                            disabled={savingEdit || !editName.trim()}
                          >
                            {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-1.5 pl-5">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setEditColor(c)}
                              className={cn(
                                'h-5 w-5 rounded-full border-2 transition-all',
                                editColor === c ? 'border-foreground scale-110' : 'border-transparent'
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-xs font-medium flex-1 truncate">{l.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEdit(l.id, l.name, l.color)}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover etiqueta "${l.name}"?`)) removeFn(l.id);
                          }}
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
