import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { useAttendanceSettings, useSaveAttendanceSettings } from './hooks/useTeacherAttendance';

const DEFAULTS = {
  auto_generate_enabled: true,
  auto_compute_on_student_call: true,
  allowed_early_minutes: 20,
  allowed_late_minutes: 20,
  max_call_after_class_minutes: 120,
  require_adjustment_reason: true,
  allow_professor_view_own_sheet: true,
  allow_professor_request_adjustment: true,
  require_rh_final_closure: true,
  closure_day_limit: 10,
};

export default function PresencaSettingsPage() {
  const { data: settings, isLoading } = useAttendanceSettings();
  const save = useSaveAttendanceSettings();
  const [form, setForm] = useState<any>(DEFAULTS);

  useEffect(() => {
    if (settings) setForm({ ...DEFAULTS, ...settings });
  }, [settings]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Presença dos Professores' }]}
        title="Configurações — Presença dos Professores"
        description="Defina tolerâncias, prazos e automações da folha de ponto"
      />

      <Card>
        <CardContent className="pt-5 space-y-6">
          <Section title="Automação">
            <Toggle label="Gerar folhas automaticamente" checked={form.auto_generate_enabled}
              onChange={(v) => setForm({ ...form, auto_generate_enabled: v })}/>
            <Toggle label="Computar presença na chamada do aluno" checked={form.auto_compute_on_student_call}
              onChange={(v) => setForm({ ...form, auto_compute_on_student_call: v })}/>
          </Section>

          <Section title="Tolerâncias de horário (minutos)">
            <Field label="Adiantamento permitido" value={form.allowed_early_minutes}
              onChange={(v) => setForm({ ...form, allowed_early_minutes: v })}/>
            <Field label="Atraso permitido" value={form.allowed_late_minutes}
              onChange={(v) => setForm({ ...form, allowed_late_minutes: v })}/>
            <Field label="Janela máxima após o fim da aula" value={form.max_call_after_class_minutes}
              onChange={(v) => setForm({ ...form, max_call_after_class_minutes: v })}/>
          </Section>

          <Section title="Workflow e governança">
            <Toggle label="Exigir motivo em ajustes" checked={form.require_adjustment_reason}
              onChange={(v) => setForm({ ...form, require_adjustment_reason: v })}/>
            <Toggle label="Professor pode ver a própria folha" checked={form.allow_professor_view_own_sheet}
              onChange={(v) => setForm({ ...form, allow_professor_view_own_sheet: v })}/>
            <Toggle label="Professor pode solicitar ajuste" checked={form.allow_professor_request_adjustment}
              onChange={(v) => setForm({ ...form, allow_professor_request_adjustment: v })}/>
            <Toggle label="Exigir fechamento final do R.H." checked={form.require_rh_final_closure}
              onChange={(v) => setForm({ ...form, require_rh_final_closure: v })}/>
            <Field label="Prazo de fechamento (dia do mês seguinte)" value={form.closure_day_limit}
              onChange={(v) => setForm({ ...form, closure_day_limit: v })}/>
          </Section>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-foreground">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange}/>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}/>
    </div>
  );
}
