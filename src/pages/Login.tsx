import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { forceGlobalSignOut } from '@/lib/authSessionReset';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import nexaLogo from '@/assets/nexa-logo.svg';
import loginHero from '@/assets/login-hero.jpg';

function FieldInput({
  icon: Icon,
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  showToggle,
  onToggle,
  toggleState,
}: {
  icon: React.ElementType;
  label: string;
  id: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  toggleState?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[hsl(48_100%_64%)] transition-colors" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 pl-11 pr-12 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 text-sm outline-none transition-all duration-300 focus:border-[hsl(48_100%_64%)]/70 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_hsl(48_100%_64%/0.12)] disabled:opacity-50"
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[hsl(48_100%_64%)] transition-colors"
            tabIndex={-1}
            aria-label={toggleState ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {toggleState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Logotipo Neovale: três barras inclinadas (assinatura visual da marca) */
function NeovaleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="hsl(48 100% 64%)">
        <rect x="6"  y="14" width="10" height="36" rx="2" transform="rotate(-15 11 32)" />
        <rect x="22" y="14" width="10" height="36" rx="2" transform="rotate(-15 27 32)" />
        <rect x="38" y="14" width="10" height="36" rx="2" transform="rotate(-15 43 32)" />
      </g>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionMismatch = searchParams.get('reason') === 'session_mismatch';
  const [otherSessionEmail, setOtherSessionEmail] = useState<string | null>(null);

  // Detecta se já existe uma sessão ativa de OUTRO usuário neste navegador.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const e = data.session?.user?.email || null;
      setOtherSessionEmail(e);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleClearSession = async () => {
    await forceGlobalSignOut(supabase);
    setOtherSessionEmail(null);
    if (sessionMismatch) {
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
    toast({ title: 'Sessão limpa', description: 'Pode fazer login normalmente agora.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha e-mail e senha.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const success = await login({ email, senha });
      if (success) {
        toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
        navigate('/dashboard');
      } else {
        toast({ title: 'Erro no login', description: 'E-mail ou senha incorretos.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao fazer login.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="lg:h-screen lg:overflow-hidden min-h-screen w-full bg-[hsl(228_27%_8%)] text-white grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ============== COLUNA ESQUERDA - HERO INSTITUCIONAL ============== */}
      <aside className="relative hidden lg:flex flex-col justify-between p-8 xl:p-12 overflow-hidden">
        {/* Background com foto */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginHero})` }}
        />
        {/* Overlay azul-escuro institucional */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(228_27%_8%)] via-[hsl(228_27%_10%)]/85 to-[hsl(228_27%_8%)]/60" />
        {/* Camada amarela diagonal — assinatura gráfica Neovale */}
        <div
          className="absolute -bottom-24 -right-20 w-[420px] h-[420px] bg-[hsl(48_100%_64%)] opacity-95"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        />
        {/* Linhas diagonais decorativas (motivo das 3 barras) */}
        <div className="absolute bottom-10 right-8 flex gap-2 opacity-90">
          <div className="w-2 h-20 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
          <div className="w-2 h-20 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
          <div className="w-2 h-20 bg-[hsl(228_27%_8%)] rotate-[-15deg]" />
        </div>

        {/* Topo: logo */}
        <header className="relative z-10 flex items-center gap-3">
          <NeovaleMark className="w-8 h-8" />
          <div className="leading-tight">
            <p className="text-xl font-bold tracking-tight">Neovale<span className="text-[hsl(48_100%_64%)]">.</span></p>
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/60 font-medium">
              Educação · Tecnologia · Inovação
            </p>
          </div>
        </header>

        {/* Centro: Manifesto — posicionado abaixo para não cobrir o rosto */}
        <div className="relative z-10 max-w-lg mt-auto mb-8">
          <p className="text-[hsl(48_100%_64%)] text-xs font-bold tracking-[0.3em] uppercase mb-3">
            Plataforma de Gestão Acadêmica
          </p>
          <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Aqui você
            <br />
            <span className="text-white/95">não estuda</span>
            <br />
            <span className="text-[hsl(48_100%_64%)]">o futuro.</span>
          </h1>
          <p className="mt-4 text-base xl:text-lg text-white/70 max-w-md leading-relaxed">
            Você <span className="text-[hsl(48_100%_64%)] font-semibold">entra nele.</span> Gestão
            inteligente para escolas que decidem agir.
          </p>
        </div>

        {/* Rodapé: assinatura */}
        <footer className="relative z-10 flex items-center justify-between text-xs text-white/50">
          <span>© {new Date().getFullYear()} Neovale</span>
          <span className="tracking-widest uppercase">neovale.edu.br</span>
        </footer>
      </aside>

      {/* ============== COLUNA DIREITA - FORMULÁRIO ============== */}
      <section className="relative flex items-center justify-center px-4 py-6 sm:p-8 lg:p-6 xl:p-10 bg-[hsl(228_27%_9%)] lg:h-screen lg:overflow-y-auto">
        {/* glow amarelo sutil de fundo */}
        <div className="absolute top-1/3 right-1/4 w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] bg-[hsl(48_100%_64%)]/10 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] bg-[hsl(48_100%_64%)]/[0.06] blur-[80px] sm:blur-[120px] rounded-full pointer-events-none" />

        <div className="relative w-full max-w-[440px]">
          {/* Logo mobile (visível somente no mobile) */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <NeovaleMark className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                Neovale<span className="text-[hsl(48_100%_64%)]">.</span>
              </span>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium text-center">
              Educação · Tecnologia · Inovação
            </p>
          </div>

          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(48_100%_64%)]/10 border border-[hsl(48_100%_64%)]/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(48_100%_64%)] animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[hsl(48_100%_64%)] font-bold">
              Acesso seguro
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-white/55 mb-5">
            Faça login para continuar gerenciando sua instituição.
          </p>

          {sessionMismatch && (
            <div className="mb-4 rounded-lg border border-[hsl(48_100%_64%)]/40 bg-[hsl(48_100%_64%)]/10 px-4 py-3 text-xs text-[hsl(48_100%_82%)]">
              Sua sessão foi encerrada porque outro acesso foi detectado neste navegador. Faça login novamente.
            </div>
          )}

          {otherSessionEmail && (
            <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 flex items-start justify-between gap-3">
              <div className="text-xs text-white/70 leading-snug">
                <p className="font-semibold text-white/85">Outro usuário ainda está conectado neste navegador:</p>
                <p className="mt-0.5 truncate">{otherSessionEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleClearSession}
                className="shrink-0 text-[10px] uppercase tracking-[0.15em] font-bold text-[hsl(48_100%_64%)] hover:text-[hsl(48_100%_75%)] transition-colors"
              >
                Limpar sessão
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldInput
              icon={Mail}
              label="E-mail institucional"
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={setEmail}
              disabled={isLoading}
            />

            <FieldInput
              icon={Lock}
              label="Senha"
              id="senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={senha}
              onChange={setSenha}
              disabled={isLoading}
              showToggle
              onToggle={() => setShowPassword(!showPassword)}
              toggleState={showPassword}
            />

            <div className="flex justify-end">
              <Link
                to="/esqueci-senha"
                className="text-xs text-white/55 hover:text-[hsl(48_100%_64%)] transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full h-12 rounded-lg font-bold text-sm uppercase tracking-[0.15em] text-[hsl(228_24%_14%)] bg-[hsl(48_100%_64%)] hover:bg-[hsl(48_100%_70%)] shadow-[0_10px_30px_-10px_hsl(48_100%_64%/0.6)] hover:shadow-[0_15px_40px_-10px_hsl(48_100%_64%/0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar na plataforma
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
