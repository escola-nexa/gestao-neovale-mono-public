import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export interface CascadingFilterField {
  key: string;
  label: string;
  icon: LucideIcon;
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Extra content below the select */
  footer?: React.ReactNode;
}

interface CascadingFilterBarProps {
  fields: CascadingFilterField[];
  /** Badge shown next to the "Filtros" header */
  resultCount?: number;
  resultLabel?: string;
}

export function CascadingFilterBar({ fields, resultCount, resultLabel }: CascadingFilterBarProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 sm:pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Filtros</span>
          {resultCount !== undefined && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {resultCount} {resultLabel || 'resultado(s)'}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="space-y-1.5 min-w-0">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon className="h-3.5 w-3.5" /> {field.label}
                </Label>
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={field.disabled}
                  placeholder="Selecione..."
                  searchPlaceholder={`Buscar ${field.label.toLowerCase()}...`}
                  options={field.options.map((opt) => ({ value: opt.id, label: opt.name }))}
                  triggerClassName="h-9 sm:h-10"
                />
                {field.footer}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
