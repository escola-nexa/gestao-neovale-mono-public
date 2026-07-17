import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { financeiroApi } from '@/features/financeiro/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, ArrowRight, Loader2, Wand2, Sparkles, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Check = { key: string; label: string; ok: boolean; path: string };
type Status = {
  checks: Check[];
  completed: number;
  total: number;
  percent: number;
  ready: boolean;
};

export default function AssistenteConfiguracaoPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('get_financial_setup_status');
    if (error) {
      toast.error('Erro ao carregar status: ' + error.message);
    } else {
      setStatus(data as Status);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedDefaults = async () => {
    setSeeding(true);
    const { error } = await (supabase as any).rpc('seed_financial_defaults');
    setSeeding(false);
    if (error) {
      toast.error('Falha na carga inicial: ' + error.message);
    } else {
      toast.success('Dados padrão aplicados (sem duplicar existentes).');
      load();
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Financeiro', href: '/administracao/financeiro' },
          { label: 'Assistente de Configuração' },
        ]}
        title="Assistente de Configuração Financeira"
        description="Prepare os dados mínimos antes de liberar operações financeiras."
        icon={Wand2}
      />

      <Card className={cn(
        'border-0 shadow-lg text-white',
        status.ready ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-nexa-gradient',
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {status.ready ? <Sparkles className="h-5 w-5" /> : <Wand2 className="h-5 w-5" />}
                <h2 className="text-xl font-bold">
                  {status.ready ? 'Módulo financeiro pronto para uso!' : 'Configuração em andamento'}
                </h2>
              </div>
              <p className="text-sm opacity-90">
                {status.completed} de {status.total} requisitos atendidos.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={status.percent} className="flex-1 h-2.5 bg-white/20" />
                <span className="text-sm font-bold">{status.percent}%</span>
              </div>
            </div>
            <Button variant="secondary" onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Aplicar dados recomendados
            </Button>
          </div>
        </CardContent>
      </Card>

      {!status.ready && (
        <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Operações financeiras bloqueadas</AlertTitle>
          <AlertDescription>
            Lançamentos, pagamentos e baixas só serão habilitados após todos os requisitos abaixo.
            Você pode concluir o assistente em etapas — o progresso fica salvo automaticamente.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requisitos mínimos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status.checks.map((c, i) => (
            <div
              key={c.key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-3',
                c.ok ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {c.ok
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {i + 1}. {c.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.ok ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Pendente
                  </Badge>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to={c.path}>
                    {c.ok ? 'Revisar' : 'Configurar'} <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
