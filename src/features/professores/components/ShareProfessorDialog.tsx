import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { professoresApi } from '@/features/professores/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, KeyRound, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';

interface ShareProfessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professorId: string;
  professorName: string;
}

export function ShareProfessorDialog({ open, onOpenChange, professorId, professorName }: ShareProfessorDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [days, setDays] = useState('30');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);



  // Find a school_id to attach the link to (any active vínculo; fallback: any school of the org)
  const { data: professorSchool, isLoading: loadingSchool } = useQuery({
    queryKey: ['professor-link-school', professorId, organizationId],
    queryFn: async () => {
      // 1) any vínculo of this professor (active first, then any)
      const { data: link } = await supabase
        .from('professor_school_courses')
        .select('school_id, status')
        .eq('professor_id', professorId)
        .order('status', { ascending: true }) // 'ACTIVE' first alphabetically
        .limit(1)
        .maybeSingle();
      if (link?.school_id) return link.school_id as string;

      // 2) fallback: first school of the organization
      const { data: anySchool } = await supabase
        .from('schools')
        .select('id')
        .eq('organization_id', organizationId!)
        .order('nome', { ascending: true })
        .limit(1)
        .maybeSingle();
      return (anySchool?.id as string | undefined) ?? null;
    },
    enabled: !!professorId && !!organizationId && open,
  });

  // Último link gerado para este professor
  const { data: latestLink, refetch: refetchLatest } = useQuery({
    queryKey: ['professor-latest-share', professorId],
    enabled: open && !!professorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('external_links')
        .select('id, token, created_at, expires_at, is_active, scope_json')
        .eq('content_type', 'documentos_professor')
        .order('created_at', { ascending: false })
        .limit(50);
      const mine = (data ?? []).find((l: any) => l.scope_json?.professor_id === professorId);
      return mine ?? null;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!professorSchool) {
        throw new Error('Nenhuma escola encontrada na organização. Cadastre ao menos uma escola antes de gerar o link.');
      }
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const expiresAt = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await professoresApi.client.from('external_links').insert({
        organization_id: organizationId!,
        school_id: professorSchool,
        created_by: user?.id || '',
        content_type: 'documentos_professor',
        scope_json: { professor_id: professorId },
        token,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      const url = `${PUBLISHED_URL}/acesso-externo/${token}`;
      setGeneratedUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link gerado e copiado para a área de transferência!');
      queryClient.invalidateQueries({ queryKey: ['external-links'] });
      queryClient.invalidateQueries({ queryKey: ['professor-latest-share', professorId] });
      queryClient.invalidateQueries({ queryKey: ['professores-share-map'] });
      refetchLatest();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleClose = () => {
    setGeneratedUrl(null);
    setDays('30');
    onOpenChange(false);
  };

  const copyUrl = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    toast.success('Link copiado!');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar Documentos do Professor</DialogTitle>
          <DialogDescription>
            Gere um link externo restrito aos documentos de <strong>{professorName}</strong>. Este link <strong>não exige palavra-chave</strong> — o professor acessa direto para preencher seus dados.
          </DialogDescription>
        </DialogHeader>


        {latestLink && !generatedUrl && (() => {
          const url = `${PUBLISHED_URL}/acesso-externo/${latestLink.token}`;
          const expired = latestLink.expires_at ? new Date(latestLink.expires_at) < new Date() : false;
          const status = !latestLink.is_active ? 'Inativo' : expired ? 'Expirado' : 'Ativo';
          const statusClass = !latestLink.is_active
            ? 'bg-muted text-muted-foreground'
            : expired
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-emerald-600 text-white hover:bg-emerald-600/90';
          return (
            <div className="rounded-md border border-[#1B1E2C]/15 bg-[#FFDA45]/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[#1B1E2C] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Link2 className="h-3.5 w-3.5" />
                  Último link gerado
                </Label>
                <Badge className={statusClass}>{status}</Badge>
              </div>
              <div className="flex items-center gap-1 rounded-md border bg-background p-1.5">
                <code className="flex-1 break-all text-[11px] px-1">{url}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado!'); }}
                  title="Copiar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Abrir">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                <span>Gerado: {format(new Date(latestLink.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                {latestLink.expires_at && (
                  <span>Expira: {format(new Date(latestLink.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                )}
              </div>
            </div>
          );
        })()}

        {!generatedUrl && (
          <div className="space-y-4">
            <div>
              <Label>Validade do link</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias (recomendado)</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>
                Acesso direto, sem palavra-chave. Compartilhe o link apenas com o professor de destino — você pode revogá-lo a qualquer momento em Compartilhamento › Links Externos.
                {!loadingSchool && !professorSchool && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Este professor ainda não tem escola vinculada — o link será gerado mesmo assim e dará acesso apenas aos documentos dele.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {generatedUrl && (
          <div className="space-y-3">
            <Label>Link gerado</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <code className="flex-1 break-all text-xs">{generatedUrl}</code>
              <Button size="icon" variant="ghost" onClick={copyUrl} title="Copiar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" asChild title="Abrir">
                <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compartilhe este link com o professor. O acesso é direto, sem palavra-chave. Você pode revogá-lo a qualquer momento em Compartilhamento › Links Externos.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {generatedUrl ? 'Concluir' : 'Cancelar'}
          </Button>
          {!generatedUrl && (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Gerando...' : 'Gerar Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
