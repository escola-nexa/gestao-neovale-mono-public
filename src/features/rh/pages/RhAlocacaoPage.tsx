import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { hrApi } from '../api';
import { CoberturaTab } from './tabs/CoberturaTab';
import { ProfessoresTab } from './tabs/ProfessoresTab';
import { SimuladorTab } from './tabs/SimuladorTab';

export default function RhAlocacaoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear().toString();

  const initialTab = searchParams.get('tab') ?? 'cobertura';
  const [tab, setTab] = useState(initialTab);
  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') ?? '');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') ?? '');
  const [anoLetivo, setAnoLetivo] = useState(searchParams.get('ano') ?? currentYear);

  const handleTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const schoolsQuery = useQuery({
    queryKey: ['rh-aloc', 'schools'],
    queryFn: async () => {
      const data = await hrApi.listSchools();
      return data.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['rh-aloc', 'courses', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const data = await hrApi.listCoursesBySchool(schoolId);
      return data.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Alocação' }]}
        title="Alocação de Professores"
        description="Cobertura curricular, carga horária dos professores e simulador de demanda — tudo em um só lugar."
        icon={LayoutGrid}
        backTo="/rh"
      />

      {/* Filtros globais (escola/curso/ano) — usados pelas abas Cobertura e Simulador */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contexto</CardTitle>
          <CardDescription>Escola, curso e ano definem o escopo das abas Cobertura e Simulador. A aba Professores mostra todos da organização.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Escola</Label>
              <SearchableSelect
                value={schoolId}
                onValueChange={(v) => { setSchoolId(v); setCourseId(''); }}
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
                onValueChange={setCourseId}
                options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
                placeholder={schoolId ? 'Selecione um curso' : 'Escolha a escola antes'}
                searchPlaceholder="Buscar curso..."
                emptyMessage="Nenhum curso vinculado"
                disabled={!schoolId}
              />
            </div>
            <div>
              <Label>Ano letivo</Label>
              <Select value={anoLetivo} onValueChange={setAnoLetivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[Number(currentYear) - 1, Number(currentYear), Number(currentYear) + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
          <TabsTrigger value="professores">Professores</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="cobertura" className="mt-6">
          <CoberturaTab schoolId={schoolId} courseId={courseId} anoLetivo={anoLetivo} />
        </TabsContent>

        <TabsContent value="professores" className="mt-6">
          <ProfessoresTab />
        </TabsContent>

        <TabsContent value="simulador" className="mt-6">
          <SimuladorTab schoolId={schoolId} courseId={courseId} />
        </TabsContent>
      </Tabs>

      {/* Histórico oculto */}
      <div className="text-xs text-muted-foreground text-center">
        <button
          type="button"
          className="underline hover:text-foreground inline-flex items-center gap-1"
          onClick={() => navigate('/rh/planos')}
        >
          Histórico de planos antigos <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
