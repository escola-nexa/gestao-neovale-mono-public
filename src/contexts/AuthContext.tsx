import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AuthUser, LoginCredentials, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { ApiAdapter } from '@/lib/api-adapter';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { ForcePasswordChangeDialog } from '@/components/auth/ForcePasswordChangeDialog';
import { forceGlobalSignOut, hardPurgeSupabaseStorage } from '@/lib/authSessionReset';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  canCreateUser: (targetRole: UserRole) => boolean;
  canAccessModule: (module: string) => boolean;
  mustChangePassword: boolean;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PASSWORD = '12345678';

interface MappedAuth {
  authUser: AuthUser;
  organizationId: string | null;
  passwordChangedAt: string | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const queryClient = useQueryClient();

  // Última identidade mapeada — evita refazer o mapping para o mesmo user.
  const lastMappedUserId = useRef<string | null>(null);
  // Promessas em voo por user.id — dedupe APENAS para o mesmo usuário.
  // CRÍTICO: nunca compartilhar promessa entre user.ids diferentes (race condition
  // anterior fazia o usuário B receber dados mapeados do usuário A).
  const mappingByUser = useRef<Map<string, Promise<MappedAuth | null>>>(new Map());
  // Sequência monotônica para ignorar respostas obsoletas.
  const mapSeqRef = useRef(0);
  // Sinaliza que houve um login explícito recente (formulário) e qual senha
  // foi usada — base para decidir se a troca obrigatória deve abrir.
  const explicitLoginRef = useRef<{ usedDefaultPassword: boolean } | null>(null);

  const clearMustChangePassword = useCallback(() => setMustChangePassword(false), []);

  const mapSupabaseUserToAuthUser = useCallback(
    async (supabaseUser: User): Promise<MappedAuth | null> => {
      // Dedupe POR user.id — nunca devolve uma promessa de outro usuário.
      const existing = mappingByUser.current.get(supabaseUser.id);
      if (existing) return existing;

      const fetchOnce = async () =>
        await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, password_changed_at')
            .eq('user_id', supabaseUser.id)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role, organization_id')
            .eq('user_id', supabaseUser.id)
            .limit(1)
            .maybeSingle(),
        ]);

      const p = (async () => {
        // Retry — em PWA mobile a primeira request pode falhar por
        // instabilidade de rede no cold-start. Sem retry, o usuário fica
        // "logado no Supabase mas travado" na UI (sem redirect para Dashboard).
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const [profileRes, roleRes] = await fetchOnce();
            if (profileRes.error && roleRes.error) {
              lastErr = profileRes.error;
              throw profileRes.error;
            }
            const role = (roleRes.data?.role as UserRole) || 'professor';
            const authUser: AuthUser = {
              id: supabaseUser.id,
              email: supabaseUser.email || '',
              nomeCompleto: profileRes.data?.full_name || supabaseUser.email || '',
              perfil: role,
            };
            return {
              authUser,
              organizationId: roleRes.data?.organization_id || null,
              passwordChangedAt: (profileRes.data as any)?.password_changed_at || null,
            };
          } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          }
        }
        console.error('Error mapping user after retries:', lastErr);
        // Fallback: mantém o usuário logado com perfil padrão para não
        // travar a UI. A próxima request bem-sucedida reidrata os dados.
        const fallback: AuthUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          nomeCompleto: supabaseUser.email || '',
          perfil: 'professor',
        };
        return {
          authUser: fallback,
          organizationId: null,
          passwordChangedAt: null,
        };
      })();

      mappingByUser.current.set(supabaseUser.id, p);
      try {
        return await p;
      } finally {
        mappingByUser.current.delete(supabaseUser.id);
      }
    },
    []
  );

  // Limpa todo o estado em memória do usuário anterior (caches, refs, queries).
  // Chamado em SIGNED_OUT e em qualquer troca de user.id.
  const purgePreviousUserState = useCallback(
    (reason: 'signout' | 'switch') => {
      try {
        queryClient.removeQueries();
        queryClient.clear();
      } catch (e) {
        console.error('Error clearing query cache:', e);
      }
      mappingByUser.current.clear();
      if (reason === 'signout') {
        lastMappedUserId.current = null;
        explicitLoginRef.current = null;
        // Garante que nenhum token Supabase residual sobreviva.
        hardPurgeSupabaseStorage();
      }
    },
    [queryClient]
  );

  // Listener único do estado de autenticação. Fonte da verdade.
  useEffect(() => {
    let mounted = true;
    let initialResolved = false;

    const handleSession = async (event: string, session: any) => {
      if (!mounted) return;

      if (import.meta.env.VITE_API_PROVIDER === 'nestjs') {
        const token = localStorage.getItem('nest_access_token');
        if (token) {
          try {
            const payload: any = jwtDecode(token);
            if (payload && payload.exp * 1000 > Date.now()) {
              const nestUser: AuthUser = {
                id: payload.sub,
                email: payload.email,
                nomeCompleto: payload.fullName || payload.email,
                perfil: payload.role as UserRole,
              };
              setUser(nestUser);
              setUserRole(nestUser.perfil);
              lastMappedUserId.current = payload.sub;
              if (!initialResolved) {
                initialResolved = true;
                setIsLoading(false);
              }
              return;
            } else {
              // Token expirado
              localStorage.removeItem('nest_access_token');
            }
          } catch (e) {
            console.error('Erro ao decodificar token do NestJS', e);
            localStorage.removeItem('nest_access_token');
          }
        }
      }

      if (!session?.user) {
        const wasLoggedIn = !!lastMappedUserId.current;
        setUser(null);
        setUserRole(null);
        setMustChangePassword(false);
        if (wasLoggedIn) {
          purgePreviousUserState('signout');
        } else {
          lastMappedUserId.current = null;
          explicitLoginRef.current = null;
        }
        if (!initialResolved) {
          initialResolved = true;
          setIsLoading(false);
        }
        return;
      }

      const incomingUserId = session.user.id;

      // Mesmo usuário já mapeado? Apenas garantir loading=false e sair.
      if (lastMappedUserId.current === incomingUserId) {
        if (!initialResolved) {
          initialResolved = true;
          setIsLoading(false);
        }
        return;
      }

      // Troca de usuário detectada (A -> B). Limpar cache do usuário anterior
      // ANTES de carregar os dados do novo, para evitar exibir dados cruzados.
      if (lastMappedUserId.current && lastMappedUserId.current !== incomingUserId) {
        // Zera o usuário em memória imediatamente e força o AuthGuard a mostrar
        // tela de carregamento durante a hidratação do novo usuário.
        setUser(null);
        setUserRole(null);
        setMustChangePassword(false);
        setIsLoading(true);
        lastMappedUserId.current = null;
        purgePreviousUserState('switch');
      }

      const seq = ++mapSeqRef.current;
      let mapped: MappedAuth | null = null;
      try {
        mapped = await mapSupabaseUserToAuthUser(session.user);
      } catch (e) {
        console.error('[Auth] mapping threw unexpectedly', e);
      }
      if (!mounted) return;
      // Resposta obsoleta — outra sequência mais recente já está em curso.
      if (seq !== mapSeqRef.current) return;
      // Sanity check: o dado mapeado tem que pertencer ao usuário da sessão atual.
      if (!mapped || mapped.authUser.id !== incomingUserId) {
        console.warn('[Auth] mapped user mismatch — discarding', {
          incoming: incomingUserId,
          mapped: mapped?.authUser.id,
        });
        // CRÍTICO: mesmo descartando, liberar o loading para o AuthGuard
        // não ficar preso em spinner eterno.
        if (!initialResolved) {
          initialResolved = true;
          setIsLoading(false);
        }
        return;
      }

      setUser(mapped.authUser);
      setUserRole(mapped.authUser.perfil as UserRole);
      lastMappedUserId.current = incomingUserId;

      // Decidir abertura do modal de troca obrigatória de senha.
      const fromForm = explicitLoginRef.current;
      if (fromForm) {
        const needs = fromForm.usedDefaultPassword || !mapped.passwordChangedAt;
        setMustChangePassword(needs);

        if (mapped.organizationId) {
          supabase
            .rpc('record_user_login', {
              p_org_id: mapped.organizationId,
              p_user_id: session.user.id,
              p_email: mapped.authUser.email,
              p_name: mapped.authUser.nomeCompleto,
              p_role: mapped.authUser.perfil,
              p_user_agent: navigator.userAgent,
            })
            .then(
              () => {},
              () => {}
            );
        }
        explicitLoginRef.current = null;
      } else {
        setMustChangePassword(false);
      }

      initialResolved = true;
      setIsLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Defere para o próximo tick — recomendação oficial para evitar
      // travar a máquina de estado da auth com awaits no callback.
      setTimeout(() => {
        handleSession(event, session);
      }, 0);
    });

    // Safety net: caso o INITIAL_SESSION nunca chegue.
    const safety = setTimeout(() => {
      if (mounted && !initialResolved) {
        initialResolved = true;
        setIsLoading(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [mapSupabaseUserToAuthUser, purgePreviousUserState]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setIsLoading(true);
      try {
        // 1) Defensivo: se já existir QUALQUER sessão cujo email seja diferente
        // do digitado, fazer hard reset GLOBAL para evitar herdar o usuário
        // anterior (caso típico de máquina compartilhada).
        try {
          const { data: existing } = await supabase.auth.getSession();
          const existingEmail = existing.session?.user?.email;
          if (
            existingEmail &&
            existingEmail.toLowerCase() !== credentials.email.toLowerCase()
          ) {
            await forceGlobalSignOut(supabase);
            purgePreviousUserState('signout');
            setUser(null);
            setUserRole(null);
          }
        } catch {
          // não-fatal
        }

        // 2) Marca o login explícito SOMENTE depois do reset (purge limpa o ref).
        explicitLoginRef.current = { usedDefaultPassword: credentials.senha === DEFAULT_PASSWORD };

        const { data, error } = await ApiAdapter.auth.login(
          credentials.email,
          credentials.senha
        );

        if (error || !data?.user) {
          explicitLoginRef.current = null;
          setIsLoading(false);
          if (error) console.error('Login error:', error.message);
          return false;
        }

        // 3) Verificação pós-login: a sessão devolvida tem que ser do email
        // que o usuário digitou. Se divergir, abortar e limpar tudo.
        const returnedEmail = data.user.email?.toLowerCase() || '';
        if (returnedEmail !== credentials.email.toLowerCase()) {
          console.warn('[Auth] post-login email mismatch — forcing signout', {
            typed: credentials.email,
            returned: data.user.email,
          });
          explicitLoginRef.current = null;
          await forceGlobalSignOut(supabase);
          purgePreviousUserState('signout');
          setUser(null);
          setUserRole(null);
          setIsLoading(false);
          return false;
        }

        // O onAuthStateChange (SIGNED_IN) cuidará de mapear e setar user no Supabase.
        // No NestJS, injetamos manualmente para evitar dependência do listener.
        if (import.meta.env.VITE_API_PROVIDER === 'nestjs' && data?.user) {
          const role = data.user.app_metadata?.role || 'professor';
          const nestUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            nomeCompleto: data.user.user_metadata?.full_name || '',
            perfil: role as UserRole,
          };
          setUser(nestUser);
          setUserRole(role as UserRole);
          lastMappedUserId.current = data.user.id;
          setIsLoading(false);
        }
        return true;
      } catch (e) {
        explicitLoginRef.current = null;
        setIsLoading(false);
        console.error('Login exception:', e);
        return false;
      }
    },
    [purgePreviousUserState]
  );

  const logout = useCallback(async () => {
    try {
      await ApiAdapter.auth.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setUserRole(null);
    setMustChangePassword(false);
    purgePreviousUserState('signout');
  }, [purgePreviousUserState]);

  // Sentinela: ao voltar o foco da janela, valida se a sessão ativa ainda
  // pertence ao usuário que está no estado React. Se outra aba trocou o
  // login, força logout + redirect para evitar exibir dados de outro usuário.
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data.session?.user?.id || null;
        const stateUserId = lastMappedUserId.current;
        if (stateUserId && sessionUserId && stateUserId !== sessionUserId) {
          console.warn('[Auth] sentinel detected session mismatch — forcing logout');
          await forceGlobalSignOut(supabase);
          purgePreviousUserState('signout');
          setUser(null);
          setUserRole(null);
          if (typeof window !== 'undefined') {
            window.location.replace('/login?reason=session_mismatch');
          }
        }
      } catch {
        /* ignore */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [purgePreviousUserState]);

  const canCreateUser = useCallback(
    (targetRole: UserRole): boolean => {
      if (!user || !userRole) return false;
      if (userRole === 'admin') return true;
      if (userRole === 'coordenador' || userRole === 'rh') {
        return targetRole === 'coordenador' || targetRole === 'professor';
      }
      // Financeiro nunca cria outros usuários.
      return false;
    },
    [user, userRole]
  );

  const canAccessModule = useCallback(
    (module: string): boolean => {
      if (!user || !userRole) return false;
      // Módulo financeiro global: admin + financeiro.
      if (module === 'financeiro') {
        return userRole === 'admin' || userRole === 'financeiro';
      }
      const restrictedModules = ['usuarios', 'administracao'];
      if (restrictedModules.includes(module)) {
        return userRole === 'admin' || userRole === 'coordenador' || userRole === 'rh';
      }
      // Financeiro é isolado: não acessa módulos pedagógicos/RH por padrão.
      if (userRole === 'financeiro') return false;
      return true;
    },
    [user, userRole]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      canCreateUser,
      canAccessModule,
      mustChangePassword,
      clearMustChangePassword,
    }),
    [user, isLoading, login, logout, canCreateUser, canAccessModule, mustChangePassword, clearMustChangePassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ForcePasswordChangeDialog
        open={!!user && mustChangePassword}
        onSuccess={clearMustChangePassword}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
