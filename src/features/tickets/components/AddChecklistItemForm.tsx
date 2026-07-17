import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface AddChecklistItemFormProps {
  onAdd: (content: string) => void;
  /** Texto do botão colapsado (padrão "Adicionar um item") */
  buttonLabel?: string;
}

/**
 * Formulário Trello-style para adicionar um item de checklist:
 * - Estado colapsado: botão "Adicionar um item"
 * - Estado aberto: textarea + botões Adicionar (primário) / Cancelar
 * - Enter envia, Esc cancela; persiste somente ao clicar Adicionar.
 */
export function AddChecklistItemForm({ onAdd, buttonLabel = 'Adicionar um item' }: AddChecklistItemFormProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (submitting) return;
    const v = value.trim();
    if (!v) return;
    setSubmitting(true);
    onAdd(v);
    setValue('');
    // Blur defensivo para evitar que um Enter "fantasma" caia em outro
    // elemento focável (ex.: checkbox) logo após o re-render.
    (document.activeElement as HTMLElement | null)?.blur?.();
    // Pequeno cooldown para impedir duplo-Enter / clique repetido
    // disparando 2 inserts do mesmo item.
    setTimeout(() => setSubmitting(false), 350);
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8"
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Adicionar um item"
        className="min-h-[64px] text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setValue('');
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={!value.trim() || submitting}>
          Adicionar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => { setOpen(false); setValue(''); }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
