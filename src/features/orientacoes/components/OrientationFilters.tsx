import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Search, X } from 'lucide-react';
import { ORIENTATION_TYPE_LABELS } from '@/types/academic';

interface OrientationFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  filterSchool: string;
  setFilterSchool: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterProfessor: string;
  setFilterProfessor: (v: string) => void;
  filterDateStart: string;
  setFilterDateStart: (v: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (v: string) => void;
  schools: { id: string; nome: string }[];
  professorsInOrientations: { id: string; name: string }[];
  isCoordinator: boolean;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

export function OrientationFilters({
  search, setSearch,
  filterSchool, setFilterSchool,
  filterType, setFilterType,
  filterProfessor, setFilterProfessor,
  filterDateStart, setFilterDateStart,
  filterDateEnd, setFilterDateEnd,
  schools, professorsInOrientations,
  isCoordinator, hasActiveFilters, clearFilters,
}: OrientationFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar professor, escola..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            {isCoordinator && (
              <SearchableSelect
                value={filterProfessor}
                onValueChange={setFilterProfessor}
                placeholder="Professor"
                searchPlaceholder="Buscar professor..."
                triggerClassName="w-full sm:w-[200px] h-9"
                options={[
                  { value: 'all', label: 'Todos Professores' },
                  ...professorsInOrientations.map(p => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
            <SearchableSelect
              value={filterSchool}
              onValueChange={setFilterSchool}
              placeholder="Escola"
              searchPlaceholder="Buscar escola..."
              triggerClassName="w-full sm:w-[200px] h-9"
              options={[
                { value: 'all', label: 'Todas Escolas' },
                ...schools.map(s => ({ value: s.id, label: s.nome })),
              ]}
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[190px] h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(ORIENTATION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="flex-1 sm:w-[140px] h-9" title="Data início" />
              <span className="text-xs text-muted-foreground">a</span>
              <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="flex-1 sm:w-[140px] h-9" title="Data fim" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9 gap-1 w-full sm:w-auto">
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
