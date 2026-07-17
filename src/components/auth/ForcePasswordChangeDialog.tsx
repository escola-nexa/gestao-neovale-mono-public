import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Lock, Eye, EyeOff, Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_PASSWORD = '12345678';

interface Props {
  open: boolean;
  onSuccess: () => void;
}

/** Logotipo Neovale: três barras inclinadas (assinatura visual da marca) */
function NeovaleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="hsl(48 100% 64%)">
        <rect x="6" y="14" width="10" height="36" rx="2" transform="rotate(-15 11 32)" />
        <rect x="22" y="14" width="10" height="36" rx="2" transform="rotate(-15 27 32)" />
        <rect x="38" y="14" width="10" height="36" rx="2" transform="rotate(-15 43 32)" />
      </g>
    </svg>
  );
}

export function ForcePasswordChangeDialog({ open, onSuccess }: Props) {
  const { toast } = useToast();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const validate = (): string | null => {
    if (!newPwd || !confirmPwd) return 'Preencha os dois campos.';
    if (newPwd.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (newPwd === DEFAULT_PASSWORD) return 'Não é permitido usar a senha padrão. Crie uma senha pessoal.';
    if (!/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) return 'A senha deve conter letras e números.';
    if (newPwd !== confirmPwd) return 'As senhas não coincidem.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: 'Senha inválida', description: err, variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      // Confere sessão sem destruí-la em caso de instabilidade transitória.
      // Se a sessão estiver mesmo ausente, orientamos o usuário sem chamar
      // signOut() global (que poderia revogar sessões em outros dispositivos).
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: 'Sessão indisponível',
          description: 'Recarregue a página e tente novamente. Se persistir, faça login novamente.',
          variant: 'destructive',
        });
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: newPwd });
      if (updErr) {
        if (/session/i.test(updErr.message) && /missing|expired|invalid/i.test(updErr.message)) {
          toast({
            title: 'Sessão expirada',
            description: 'Recarregue a página e tente novamente para concluir a troca de senha.',
            variant: 'destructive',
          });
          return;
        }
        throw updErr;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      toast({ title: 'Senha alterada', description: 'Sua nova senha foi definida com sucesso.' });
      onSuccess();
    } catch (e: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* obrigatório — não pode fechar */ }}>
      <DialogContent
        className="max-w-[480px] p-0 overflow-hidden border border-white/10 bg-[hsl(228_27%_9%)] text-white [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* ===== CAPA NEOVALE ===== */}
        <div className="relative px-6 pt-6 pb-5 bg-[hsl(228_27%_8%)] overflow-hidden">
          {/* glow amarelo de fundo */}
          <div className="absolute -top-16 -right-10 w-[260px] h-[260px] bg-[hsl(48_100%_64%)]/15 blur-[100px] rounded-full pointer-events-none" />
          {/* Camada amarela diagonal */}
          <div
            className="absolute -bottom-16 -right-12 w-[180px] h-[180px] bg-[hsl(48_100%_64%)] opacity-90"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          />
          {/* 3 barras decorativas */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-90">
            <div className="w-1.5 h-10 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
            <div className="w-1.5 h-10 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
            <div className="w-1.5 h-10 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
          </div>

          <div className="relative z-10 flex items-center gap-3 mb-4">
            <NeovaleMark className="w-7 h-7" />
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">
                Neovale<span className="text-[hsl(48_100%_64%)]">.</span>
              </p>
              <p className="text-[9px] tracking-[0.25em] uppercase text-white/55 font-medium">
                Educação · Tecnologia · Inovação
              </p>
            </div>
          </div>

          <div className="relative z-10 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[hsl(48_100%_64%)]/10 border border-[hsl(48_100%_64%)]/25 mb-3">
            <ShieldAlert className="w-3 h-3 text-[hsl(48_100%_64%)]" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[hsl(48_100%_64%)] font-bold">
              Ação obrigatória
            </span>
          </div>

          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              Defina sua senha pessoal
            </DialogTitle>
            <DialogDescription className="text-sm text-white/65 leading-relaxed">
              Detectamos que você ainda usa a <strong className="text-[hsl(48_100%_64%)]">senha padrão</strong> da
              plataforma. Por segurança, é necessário criar uma senha pessoal antes de continuar.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ===== FORMULÁRIO ===== */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 bg-[hsl(228_27%_9%)]">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              Nova senha
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[hsl(48_100%_64%)] transition-colors" />
              <input
                type={show ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={busy}
                autoFocus
                className="w-full h-11 pl-11 pr-12 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 text-sm outline-none transition-all duration-300 focus:border-[hsl(48_100%_64%)]/70 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_hsl(48_100%_64%/0.12)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                tabIndex={-1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[hsl(48_100%_64%)] transition-colors"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              Confirmar nova senha
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[hsl(48_100%_64%)] transition-colors" />
              <input
                type={show ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repita a senha"
                disabled={busy}
                className="w-full h-11 pl-11 pr-4 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 text-sm outline-none transition-all duration-300 focus:border-[hsl(48_100%_64%)]/70 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_hsl(48_100%_64%/0.12)] disabled:opacity-50"
              />
            </div>
          </div>

          <ul className="text-[11px] text-white/55 space-y-1 pl-1">
            <li>• Mínimo de 8 caracteres</li>
            <li>• Deve conter letras e números</li>
            <li>• Não pode ser a senha padrão (12345678)</li>
          </ul>

          <button
            type="submit"
            disabled={busy}
            className="group w-full h-11 rounded-lg font-bold text-sm uppercase tracking-[0.15em] text-[hsl(228_24%_14%)] bg-[hsl(48_100%_64%)] hover:bg-[hsl(48_100%_70%)] shadow-[0_10px_30px_-10px_hsl(48_100%_64%/0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Definir nova senha
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
