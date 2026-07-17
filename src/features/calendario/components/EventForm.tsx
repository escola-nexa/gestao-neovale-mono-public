import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Trash2, Edit2, MapPin } from 'lucide-react';
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar';
import { AcademicCalendar, CalendarEvent, CalendarEventType, EVENT_TYPE_OPTIONS, EVENT_TYPE_LABELS } from '@/types/academic';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calendarioApi } from '@/features/calendario/api';
import { useConfirm } from '@/hooks/useConfirm';
import { useOrganization } from '@/hooks/useOrganization';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  calendar: AcademicCalendar;
  onSuccess?: () => void;
}

const eventTypeColors: Record<CalendarEventType, string> = {
  LETIVO: 'bg-green-100 text-green-800',
  FERIADO: 'bg-red-100 text-red-800',
  RECESSO: 'bg-amber-100 text-amber-800',
  EVENTO: 'bg-blue-100 text-blue-800',
};

const CITY_SCOPED_TYPES: CalendarEventType[] = ['FERIADO', 'RECESSO'];
const ALLOWED_EVENT_TYPES: CalendarEventType[] = ['FERIADO', 'RECESSO'];
const ALL_CITIES_VALUE = '__ALL__';

export function EventForm({ open, onClose, calendar, onSuccess }: EventFormProps) {
  const { createEvent, updateEvent, deleteEvent } = useAcademicCalendar(calendar.organization_id);
  const { organizationId } = useOrganization();
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('FERIADO');
  const [description, setDescription] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES_VALUE);
  
  // Load cities from schools
  const [cities, setCities] = useState<string[]>([]);
  
  useEffect(() => {
    if (!organizationId) return;
    const loadCities = async () => {
      const data = await calendarioApi.getCities(organizationId);
      if (data) {
        const unique = [...new Set(data.map((c: any) => c.nome).filter(Boolean))].sort() as string[];
        setCities(unique);
      }
    };
    loadCities();
  }, [organizationId]);

  const showCitySelector = true; // Always show since only FERIADO/RECESSO are allowed

  const resetForm = () => {
    setEventDate('');
    setEventType('FERIADO');
    setDescription('');
    setSelectedCity(ALL_CITIES_VALUE);
    setEditingEvent(null);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventDate(event.event_date);
    setEventType(event.event_type);
    setDescription(event.description || '');
    setSelectedCity(event.city || ALL_CITIES_VALUE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventDate) return;

    const cityValue = showCitySelector && selectedCity !== ALL_CITIES_VALUE ? selectedCity : null;

    setIsSubmitting(true);
    try {
      let success = false;
      if (editingEvent) {
        success = await updateEvent(editingEvent.id, {
          event_date: eventDate,
          event_type: eventType,
          description: description || undefined,
          city: cityValue,
        });
      } else {
        const result = await createEvent({
          calendar_id: calendar.id,
          event_date: eventDate,
          event_type: eventType,
          description: description || undefined,
          city: cityValue,
        });
        success = !!result;
      }
      if (success) {
        onSuccess?.();
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    const ok = await confirm({
      title: 'Excluir evento',
      description: 'Deseja excluir este evento?',
      confirmText: 'Excluir',
      variant: 'destructive',
    });
    if (ok) {
      setIsSubmitting(true);
      try {
        const success = await deleteEvent(event.id);
        if (success) {
          onSuccess?.();
          if (editingEvent?.id === event.id) {
            resetForm();
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const allEvents = calendar.events || [];
  const events = allEvents.filter(e => ALLOWED_EVENT_TYPES.includes(e.event_type));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Eventos do Calendário — {calendar.academic_year}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* Form */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
              {editingEvent ? '✏️ Editar Evento' : '➕ Novo Evento'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={eventType} onValueChange={(v) => {
                    setEventType(v as CalendarEventType);
                    if (!CITY_SCOPED_TYPES.includes(v as CalendarEventType)) {
                      setSelectedCity(ALL_CITIES_VALUE);
                    }
                  }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.filter(opt => ALLOWED_EVENT_TYPES.includes(opt.value)).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showCitySelector && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    Cidade
                  </Label>
                  <SearchableSelect
                    value={selectedCity}
                    onValueChange={setSelectedCity}
                    placeholder="Selecione a cidade"
                    searchPlaceholder="Buscar cidade..."
                    triggerClassName="h-9 text-sm"
                    options={[
                      { value: ALL_CITIES_VALUE, label: '🌐 Todas as cidades' },
                      ...cities.map((city) => ({ value: city, label: city })),
                    ]}
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {selectedCity === ALL_CITIES_VALUE
                      ? 'Aplicado a todas as escolas'
                      : `Apenas escolas de ${selectedCity}`}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aniversário da cidade, Conselho de Classe..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={isSubmitting || !eventDate}>
                  {editingEvent ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingEvent && (
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Events List */}
          <div className="space-y-2 min-h-0 flex flex-col">
            <h4 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
              📋 Eventos Cadastrados ({events.length})
            </h4>
            <ScrollArea className="flex-1 min-h-0 max-h-[420px] border rounded-lg">
              {events.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-8 px-3">Data</TableHead>
                      <TableHead className="h-8 px-3">Tipo</TableHead>
                      <TableHead className="h-8 px-3">Cidade</TableHead>
                      <TableHead className="h-8 px-3">Descrição</TableHead>
                      <TableHead className="h-8 px-3 w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const [y, m, d] = event.event_date.split('-');
                      return (
                        <TableRow key={event.id} className="text-xs">
                          <TableCell className="font-medium whitespace-nowrap px-3 py-1.5">
                            {`${d}/${m}/${y}`}
                          </TableCell>
                          <TableCell className="px-3 py-1.5">
                            <Badge className={`${eventTypeColors[event.event_type]} text-[10px] px-1.5 py-0`}>
                              {EVENT_TYPE_LABELS[event.event_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-1.5">
                            {event.city ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                {event.city}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Todas</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate px-3 py-1.5">
                            {event.description || '—'}
                          </TableCell>
                          <TableCell className="px-3 py-1.5">
                            <div className="flex gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEdit(event)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDelete(event)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhum evento cadastrado
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
