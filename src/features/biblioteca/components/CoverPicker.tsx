import { cn } from '@/lib/utils';
import { COVER_COLORS, COVER_ICONS, getCoverColor, getCoverIcon } from '../coverPresets';

interface CoverPickerProps {
  color: string;
  icon: string;
  onColorChange: (key: string) => void;
  onIconChange: (key: string) => void;
}

export function CoverPicker({ color, icon, onColorChange, onIconChange }: CoverPickerProps) {
  const c = getCoverColor(color);
  const Icon = getCoverIcon(icon);

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className={cn('h-32 rounded-xl flex items-center justify-center shadow-sm', c.bg)}>
        <Icon className={cn('h-14 w-14', c.fg)} />
      </div>

      {/* Colors */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cor da capa</p>
        <div className="grid grid-cols-10 gap-2">
          {COVER_COLORS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onColorChange(opt.key)}
              title={opt.label}
              className={cn(
                'h-9 w-9 rounded-lg transition-all',
                opt.bg,
                color === opt.key ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
              )}
            />
          ))}
        </div>
      </div>

      {/* Icons */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ícone</p>
        <div className="grid grid-cols-6 gap-2">
          {COVER_ICONS.map((opt) => {
            const I = opt.icon;
            const active = icon === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onIconChange(opt.key)}
                className={cn(
                  'h-10 rounded-lg border flex items-center justify-center transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-input'
                )}
              >
                <I className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
