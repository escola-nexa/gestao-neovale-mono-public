import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { hrApi } from '../api';
import { useSearchParams } from 'react-router-dom';
import { SimuladorTab } from './tabs/SimuladorTab';

export default function RhDemandaCalcPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') ?? '');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') ?? '');

  const updateUrl = (next: { schoolId?: string; courseId?: string }) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    setSearchParams(p, { replace: true });
  };

  const schoolsQuery = useQuery({
    queryKey: ['rh-demanda', 'schools'],
    queryFn: async () => {
      return hrApi.listSchools();
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['rh-demanda', 'courses', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      return hrApi.listCoursesBySchool(schoolId);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Calculadora de Demanda' }]}
        title="Calculadora de Demanda"
        description="Estime quantos professores são necessários para atender um curso, dado o número de turmas e período."
        icon={Users}
        backTo="/rh"
      />

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Escola</Label>
            <SearchableSelect
              value={schoolId}
              onValueChange={(v) => { setSchoolId(v); setCourseId(''); updateUrl({ schoolId: v, courseId: '' }); }}
              options={(schoolsQuery.data ?? []).map((s) => ({ value: s.id, label: s.nome }))}
              placeholder="Selecione uma escola"
              searchPlaceholder="Buscar escola..."
              emptyMessage="Nenhuma escola"
            />
          </div>
          <div>
            <Label>Curso</Label>
            <SearchableSelect
              value={courseId}
              onValueChange={(v) => { setCourseId(v); updateUrl({ courseId: v }); }}
              options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
              placeholder={schoolId ? 'Selecione um curso' : 'Escolha a escola antes'}
              searchPlaceholder="Buscar curso..."
              emptyMessage="Nenhum curso vinculado"
              disabled={!schoolId}
            />
          </div>
        </CardContent>
      </Card>

      {schoolId && courseId ? (
        <SimuladorTab schoolId={schoolId} courseId={courseId} />
      ) : (
        <Card><CardContent className="py-10 text-sm text-muted-foreground text-center">Selecione escola e curso para iniciar a simulação.</CardContent></Card>
      )}
    </div>
  );
}
