import { useState, lazy, Suspense, forwardRef } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Lazy load para não pesar o bundle inicial.
// Encapsulamos com forwardRef para que o Radix Popover possa anexar a ref no nó DOM raiz.
const Picker = lazy(async () => {
  const [{ default: PickerComp }, data] = await Promise.all([
    import('@emoji-mart/react'),
    import('@emoji-mart/data'),
  ]);
  const Wrapped = forwardRef<HTMLDivElement, any>((props, ref) => (
    <div ref={ref}>
      <PickerComp {...props} data={data.default} />
    </div>
  ));
  Wrapped.displayName = 'LazyEmojiPicker';
  return { default: Wrapped };
});

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  triggerClassName?: string;
  triggerSize?: 'icon' | 'sm';
  iconClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  title?: string;
  variant?: 'ghost' | 'outline';
}

export function EmojiPicker({
  onSelect,
  triggerClassName,
  triggerSize = 'icon',
  iconClassName,
  align = 'end',
  side = 'top',
  title = 'Inserir emoji',
  variant = 'ghost',
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size={triggerSize}
          variant={variant}
          className={cn('shrink-0', triggerClassName)}
          title={title}
          aria-label={title}
        >
          <Smile className={cn('h-4 w-4', iconClassName)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-auto p-0 border-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Suspense
          fallback={
            <div className="w-[352px] h-[400px] flex items-center justify-center bg-card text-xs text-muted-foreground">
              Carregando emojis…
            </div>
          }
        >
          <Picker
            theme="auto"
            locale="pt"
            previewPosition="none"
            skinTonePosition="search"
            navPosition="bottom"
            perLine={8}
            maxFrequentRows={2}
            onEmojiSelect={(e: any) => {
              onSelect(e.native || e.shortcodes || '');
              setOpen(false);
            }}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
