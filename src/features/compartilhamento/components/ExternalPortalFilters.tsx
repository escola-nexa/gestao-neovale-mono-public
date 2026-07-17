import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Search, X } from 'lucide-react';
import type { ExternalFilters, FilterOptions, FilterOption } from '../hooks/useExternalFilters';

interface ActiveChip {
  key: keyof ExternalFilters;
  label: string;
  value: string;
}

interface ExternalPortalFiltersProps {
  filters: ExternalFilters;
  options: FilterOptions;
  activeChips: ActiveChip[];
  resultCount: number;
  hasActiveFilters: boolean;
  isNotas: boolean;
  isPlanejamentos: boolean;
  isFaltas: boolean;
  onFilterChange: (key: keyof ExternalFilters, value: string) => void;
  onClear: () => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <SearchableSelect
        value={value || '__all__'}
        onValueChange={(v) => onChange(v === '__all__' ? '' : v)}
        disabled={disabled}
        placeholder="Todos(as)"
        searchPlaceholder={`Buscar ${label.toLowerCase()}...`}
        triggerClassName="h-8 text-xs"
        options={[
          { value: '__all__', label: 'Todos(as)' },
          ...options.map(opt => ({ value: opt.id, label: opt.name })),
        ]}
      />
    </div>
  );
}

export function ExternalPortalFilters({
  filters,
  options,
  activeChips,
  resultCount,
  hasActiveFilters,
  isNotas,
  isPlanejamentos,
  isFaltas,
  onFilterChange,
  onClear,
}: ExternalPortalFiltersProps) {
  return (
    <Card className="shadow-sm border-primary/20">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Filtros</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {resultCount} resultado(s)
            </Badge>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome de aluno, disciplina ou professor..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>

        {/* Filter selects grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {isNotas && options.anosLetivos.length > 1 && (
            <FilterSelect
              label="Ano Letivo"
              value={filters.anoLetivo}
              options={options.anosLetivos}
              onChange={(v) => onFilterChange('anoLetivo', v)}
            />
          )}

          {options.bimestres.length > 1 && (
            <FilterSelect
              label="Bimestre"
              value={filters.bimestre}
              options={options.bimestres}
              onChange={(v) => onFilterChange('bimestre', v)}
            />
          )}

          {options.cursos.length > 1 && (
            <FilterSelect
              label="Curso"
              value={filters.curso}
              options={options.cursos}
              onChange={(v) => onFilterChange('curso', v)}
            />
          )}

          {options.turmas.length > 0 && (
            <FilterSelect
              label="Turma"
              value={filters.turma}
              options={options.turmas}
              onChange={(v) => onFilterChange('turma', v)}
            />
          )}

          {(isPlanejamentos || isFaltas) && options.disciplinas.length > 1 && (
            <FilterSelect
              label="Disciplina"
              value={filters.disciplina}
              options={options.disciplinas}
              onChange={(v) => onFilterChange('disciplina', v)}
            />
          )}

          {(isPlanejamentos || isFaltas) && options.professores.length > 1 && (
            <FilterSelect
              label="Professor"
              value={filters.professor}
              options={options.professores}
              onChange={(v) => onFilterChange('professor', v)}
            />
          )}

          {(isNotas || isFaltas) && options.alunos.length > 0 && (
            <FilterSelect
              label="Aluno"
              value={filters.aluno}
              options={options.alunos}
              onChange={(v) => onFilterChange('aluno', v)}
            />
          )}
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="outline"
                className="text-xs gap-1 pl-2 pr-1 py-0.5 cursor-pointer hover:bg-destructive/10"
                onClick={() => onFilterChange(chip.key, '')}
              >
                <span className="text-muted-foreground">{chip.label}:</span>
                <span className="font-medium">{chip.value}</span>
                <X className="h-3 w-3 ml-0.5" />
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
