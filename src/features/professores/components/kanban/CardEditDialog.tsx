import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KanbanCard } from '../../hooks/useProfessorsKanban';
import { PRESET_LABELS, KanbanLabel } from '../../hooks/useProfessorsKanban';
import { useKanbanLabels } from '../../hooks/useKanbanLabels';

const COLOR_CLASSES: Record<KanbanLabel['color'], string> = {
  gray:   'bg-gray-200 text-gray-800 border-gray-300',
  blue:   'bg-sky-100 text-sky-800 border-sky-300',
  green:  'bg-emerald-100 text-emerald-800 border-emerald-300',
  yellow: 'bg-amber-100 text-amber-900 border-amber-300',
  red:    'bg-red-100 text-red-800 border-red-300',
  purple: 'bg-violet-100 text-violet-800 border-violet-300',
};

interface Props {
  card: KanbanCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: { description: string | null; labels: KanbanLabel[] }) => Promise<void>;
  saving: boolean;
}

export function CardEditDialog({ card, open, onOpenChange, onSave, saving }: Props) {
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState<KanbanLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<KanbanLabel['color']>('blue');
  const { labels: customLabels, create: createLabel, remove: removeLabel } = useKanbanLabels();

  const allLabels: KanbanLabel[] = [
    ...PRESET_LABELS,
    ...customLabels.map(l => ({ id: l.id, name: l.name, color: l.color })),
  ];

  useEffect(() => {
    if (card) {
      setDescription(card.description ?? '');
      setLabels(card.labels ?? []);
    }
  }, [card]);

  const toggle = (label: KanbanLabel) => {
    setLabels(prev => prev.find(l => l.id === label.id)
      ? prev.filter(l => l.id !== label.id)
      : [...prev, label]);
  };

  const handleSave = async () => {
    await onSave({
      description: description.trim() ? description.trim() : null,
      labels,
    });
    onOpenChange(false);
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar card · {card.full_name}</DialogTitle>
          <DialogDescription>
            Adicione observações internas e etiquetas para acompanhamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {allLabels.map(l => {
                const active = labels.some(x => x.id === l.id);
                const isCustom = customLabels.some(c => c.id === l.id);
                return (
                  <span key={l.id} className="inline-flex items-center group">
                    <button
                      type="button"
                      onClick={() => toggle(l)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition',
                        COLOR_CLASSES[l.color],
                        active ? 'ring-2 ring-offset-1 ring-foreground/40' : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {l.name}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => removeLabel.mutate(l.id)}
                        title="Excluir etiqueta da organização"
                        className="ml-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                placeholder="Nova etiqueta..."
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <select
                value={newLabelColor}
                onChange={e => setNewLabelColor(e.target.value as KanbanLabel['color'])}
                className="h-8 text-xs rounded-md border border-input bg-background px-2"
              >
                <option value="gray">Cinza</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="yellow">Amarelo</option>
                <option value="red">Vermelho</option>
                <option value="purple">Roxo</option>
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!newLabelName.trim() || createLabel.isPending}
                onClick={async () => {
                  await createLabel.mutateAsync({ name: newLabelName.trim(), color: newLabelColor });
                  setNewLabelName('');
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Criar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição / observações</Label>
            <Textarea
              id="desc"
              rows={5}
              placeholder="Ex.: Pendente reenviar comprovante de residência atualizado."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { COLOR_CLASSES };
