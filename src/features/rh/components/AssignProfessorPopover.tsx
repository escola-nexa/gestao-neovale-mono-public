import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search, Users, Sparkles, Inbox } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { hrApi } from '../api';

export interface AssignSelection {
  source: 'PROFESSOR' | 'TALENTO' | 'INDICACAO';
  professor_id?: string;
  talent_id?: string;
  indication_id?: string;
  display_name: string;
}

interface Props {
  schoolId: string;
  courseId: string;
  trigger: React.ReactNode;
  onSelect: (sel: AssignSelection) => void;
  disabled?: boolean;
}

export function AssignProfessorPopover({ schoolId, courseId, trigger, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'professor' | 'talento' | 'indicacao'>('professor');

  // Professores elegíveis (vinculados à escola+curso) — fonte oficial
  const profsQuery = useQuery({
    queryKey: ['rh-assign', 'profs', schoolId, courseId],
    enabled: open && !!schoolId && !!courseId,
    queryFn: () => hrApi.listEligibleProfessors(schoolId, courseId),
  });

  // Banco de Talentos
  const talentsQuery = useQuery({
    queryKey: ['rh-assign', 'talents'],
    enabled: open,
    queryFn: async () => {
      return hrApi.listTalentPoolCandidates();
    },
  });

  // Indicações aprovadas no contexto
  const indicationsQuery = useQuery({
    queryKey: ['rh-assign', 'indications', schoolId, courseId],
    enabled: open && !!schoolId,
    queryFn: () =>
      hrApi.listIndicationsByContext({
        school_id: schoolId,
        course_id: courseId || undefined,
        status: ['APROVADA', 'PENDENTE', 'EM_ANALISE'],
      }),
  });

  const filterText = search.trim().toLowerCase();

  const profs = useMemo(
    () => (profsQuery.data ?? []).filter((p) => !filterText || p.nome_completo.toLowerCase().includes(filterText)),
    [profsQuery.data, filterText],
  );
  const talents = useMemo(
    () => (talentsQuery.data ?? []).filter((t: any) => !filterText || t.full_name.toLowerCase().includes(filterText)),
    [talentsQuery.data, filterText],
  );
  const indications = useMemo(
    () => (indicationsQuery.data ?? []).filter((i: any) => !filterText || i.candidato_nome.toLowerCase().includes(filterText)),
    [indicationsQuery.data, filterText],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
            <TabsTrigger value="professor" className="text-xs gap-1">
              <Users className="h-3 w-3" /> Existente
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{profs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="talento" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" /> Talentos
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{talents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="indicacao" className="text-xs gap-1">
              <Inbox className="h-3 w-3" /> Indicações
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{indications.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="professor" className="m-0">
            <ScrollArea className="h-[280px]">
              {profs.length === 0 ? (
                <p className="p-6 text-xs text-center text-muted-foreground">Nenhum professor vinculado a esta escola+curso.</p>
              ) : (
                <ul className="divide-y">
                  {profs.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                        onClick={() => {
                          onSelect({ source: 'PROFESSOR', professor_id: p.id, display_name: p.nome_completo });
                          setOpen(false);
                        }}
                      >
                        <Check className="h-3 w-3 opacity-0" />
                        {p.nome_completo}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="talento" className="m-0">
            <ScrollArea className="h-[280px]">
              {talents.length === 0 ? (
                <p className="p-6 text-xs text-center text-muted-foreground">Nenhum candidato no banco.</p>
              ) : (
                <ul className="divide-y">
                  {talents.map((t: any) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          onSelect({ source: 'TALENTO', talent_id: t.id, display_name: t.full_name });
                          setOpen(false);
                        }}
                      >
                        <div className="font-medium">{t.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.formation_area || 'Sem área'} {t.classification ? `· ${t.classification}` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="indicacao" className="m-0">
            <ScrollArea className="h-[280px]">
              {indications.length === 0 ? (
                <p className="p-6 text-xs text-center text-muted-foreground">Nenhuma indicação no contexto.</p>
              ) : (
                <ul className="divide-y">
                  {indications.map((i: any) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          onSelect({ source: 'INDICACAO', indication_id: i.id, display_name: i.candidato_nome });
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{i.candidato_nome}</span>
                          <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Indicado por {i.indicado_por_nome}
                          {i.candidato_disciplinas ? ` · ${i.candidato_disciplinas}` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
