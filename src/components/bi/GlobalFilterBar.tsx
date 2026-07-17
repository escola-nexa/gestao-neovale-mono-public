import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Filter, X } from 'lucide-react';
import { biApi as supabase } from '@/hooks/bi/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface BIFilters {
  schoolId?: string;
  bimester?: string;
  courseId?: string;
}

interface GlobalFilterBarProps {
  filters: BIFilters;
  onChange: (filters: BIFilters) => void;
}

export function GlobalFilterBar({ filters, onChange }: GlobalFilterBarProps) {
  const { organizationId } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState<{ id: string; nome: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; nome: string }[]>([]);

  // Sync from URL on mount
  useEffect(() => {
    const urlFilters: BIFilters = {};
    const s = searchParams.get('escola');
    const b = searchParams.get('bimestre');
    const c = searchParams.get('curso');
    if (s) urlFilters.schoolId = s;
    if (b) urlFilters.bimester = b;
    if (c) urlFilters.courseId = c;
    if (Object.keys(urlFilters).length > 0) onChange(urlFilters);
  }, []);

  // Load filter options
  useEffect(() => {
    if (!organizationId) return;
    supabase.from('schools').select('id, nome').eq('organization_id', organizationId).eq('status', 'ativo').order('nome').then(({ data }) => {
      if (data) setSchools(data);
    });
    supabase.from('courses').select('id, nome').eq('organization_id', organizationId).eq('status', 'ativo').order('nome').then(({ data }) => {
      if (data) setCourses(data);
    });
  }, [organizationId]);

  const handleChange = (key: keyof BIFilters, value: string | undefined) => {
    const next = { ...filters, [key]: value === '__all__' ? undefined : value };
    onChange(next);
    const params = new URLSearchParams(searchParams);
    if (next.schoolId) params.set('escola', next.schoolId); else params.delete('escola');
    if (next.bimester) params.set('bimestre', next.bimester); else params.delete('bimestre');
    if (next.courseId) params.set('curso', next.courseId); else params.delete('curso');
    setSearchParams(params, { replace: true });
  };

  const clearAll = () => {
    onChange({});
    setSearchParams({}, { replace: true });
  };

  const hasFilters = filters.schoolId || filters.bimester || filters.courseId;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border py-3 px-1">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide hidden sm:inline">Filtros</span>
        </div>

        <SearchableSelect
          value={filters.schoolId || '__all__'}
          onValueChange={(v) => handleChange('schoolId', v)}
          placeholder="Escola"
          searchPlaceholder="Buscar escola..."
          triggerClassName="w-[150px] sm:w-[180px] h-8 text-xs"
          options={[
            { value: '__all__', label: 'Todas as escolas' },
            ...schools.map(s => ({ value: s.id, label: s.nome })),
          ]}
        />

        <SearchableSelect
          value={filters.courseId || '__all__'}
          onValueChange={(v) => handleChange('courseId', v)}
          placeholder="Curso"
          searchPlaceholder="Buscar curso..."
          triggerClassName="w-[150px] sm:w-[180px] h-8 text-xs"
          options={[
            { value: '__all__', label: 'Todos os cursos' },
            ...courses.map(c => ({ value: c.id, label: c.nome })),
          ]}
        />

        <Select value={filters.bimester || '__all__'} onValueChange={(v) => handleChange('bimester', v)}>
          <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs"><SelectValue placeholder="Bimestre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="1">1º Bimestre</SelectItem>
            <SelectItem value="2">2º Bimestre</SelectItem>
            <SelectItem value="3">3º Bimestre</SelectItem>
            <SelectItem value="4">4º Bimestre</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs gap-1 flex-shrink-0">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
