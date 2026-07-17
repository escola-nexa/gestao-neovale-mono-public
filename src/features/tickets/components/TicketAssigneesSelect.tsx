import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCheck, X } from 'lucide-react';

interface StaffMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface TicketAssigneesSelectProps {
  label: string;
  description?: string;
  staff: StaffMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TicketAssigneesSelect({
  label,
  description,
  staff,
  selectedIds,
  onChange,
  disabled = false,
}: TicketAssigneesSelectProps) {
  const toggle = (userId: string) => {
    if (disabled) return;
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const selectedStaff = staff.filter(s => selectedIds.includes(s.user_id));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {selectedStaff.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStaff.map(s => (
            <Badge key={s.user_id} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
              <span>{s.full_name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(s.user_id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="max-h-[180px] border rounded-lg">
        <div className="divide-y">
          {staff.map(s => (
            <label
              key={s.user_id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selectedIds.includes(s.user_id)}
                onCheckedChange={() => toggle(s.user_id)}
                disabled={disabled}
              />
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {s.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </div>
              <span className="text-foreground flex-1">{s.full_name}</span>
              <Badge variant="outline" className="text-[10px]">
                {s.role === 'admin' ? 'Admin' : 'Coordenador'}
              </Badge>
            </label>
          ))}
          {staff.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum membro encontrado</p>
          )}
        </div>
      </ScrollArea>
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
