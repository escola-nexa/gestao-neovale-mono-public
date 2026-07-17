import { SchoolData } from '@/services/supabaseApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Clock, MessageCircle } from 'lucide-react';

function formatWhatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function ViewPersonRow({ label, name, phone, email, turno }: { label: string; name?: string | null; phone?: string | null; email?: string | null; turno?: string | null }) {
  const hasData = name || phone || email;
  if (!hasData) return (
    <div className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm text-muted-foreground/60 italic">Não informado</p>
    </div>
  );
  const turnoLabel: Record<string, string> = { matutino: 'Matutino', vespertino: 'Vespertino', noturno: 'Noturno', integral: 'Integral' };
  return (
    <div className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {name && <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="font-medium">{name}</span></div>}
        {phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span>{phone}</span><button type="button" onClick={() => window.open(formatWhatsAppUrl(phone), '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer" title="Abrir no WhatsApp"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</button></div>}
        {email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a></div>}
        {turno && <div className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><Badge variant="outline" className="text-xs">{turnoLabel[turno] || turno}</Badge></div>}
      </div>
    </div>
  );
}

interface SchoolViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolData | null;
}

export function SchoolViewDialog({ open, onOpenChange, school }: SchoolViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" />Responsáveis — {school?.nome}</DialogTitle>
        </DialogHeader>
        {school && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Direção</p>
              <ViewPersonRow label="Diretor(a)" name={school.diretor} phone={school.diretor_telefone} email={school.diretor_email} />
              <ViewPersonRow label="Diretor(a) Adjunto(a)" name={school.diretor_adjunto} phone={school.diretor_adjunto_telefone} email={school.diretor_adjunto_email} />
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Supervisão Técnica</p>
              <ViewPersonRow label="Supervisor(a) Técnico(a) 1" name={school.supervisor_tecnico_1} phone={school.supervisor_tecnico_1_telefone} email={school.supervisor_tecnico_1_email} turno={school.supervisor_tecnico_1_turno} />
              <ViewPersonRow label="Supervisor(a) Técnico(a) 2" name={school.supervisor_tecnico_2} phone={school.supervisor_tecnico_2_telefone} email={school.supervisor_tecnico_2_email} turno={school.supervisor_tecnico_2_turno} />
              <ViewPersonRow label="Supervisor(a) Técnico(a) 3" name={school.supervisor_tecnico_3} phone={school.supervisor_tecnico_3_telefone} email={school.supervisor_tecnico_3_email} turno={school.supervisor_tecnico_3_turno} />
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Coordenação Pedagógica</p>
              <ViewPersonRow label="Coordenador(a) Pedagógico(a)" name={school.coordenador_pedagogico} phone={school.coordenador_pedagogico_telefone} email={school.coordenador_pedagogico_email} turno={school.coordenador_pedagogico_turno} />
            </div>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
