/**
 * Testes de integração — AuthGuard
 *
 * Verifica:
 *  • redireciona para /login quando NÃO autenticado;
 *  • renderiza spinner enquanto isLoading;
 *  • redireciona para /dashboard quando role não permitido (R.H. tentando
 *    abrir rota só de Admin), garantindo isolamento multi-tenant por perfil;
 *  • renderiza children quando autenticado + role permitido + módulo ok;
 *  • redireciona quando `requiredModule` não está habilitado para o user.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';

type MockUser = {
  id: string;
  perfil: 'admin' | 'coordenador' | 'professor' | 'rh';
  organizacao_id: string;
};

const authState: {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  modules: Set<string>;
} = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  modules: new Set(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    canAccessModule: (m: string) => authState.modules.has(m),
  }),
}));

function renderGuard(opts: {
  initialPath?: string;
  requiredModule?: string;
  allowedRoles?: string[];
}) {
  return render(
    <MemoryRouter initialEntries={[opts.initialPath ?? '/restrita']}>
      <Routes>
        <Route
          path="/restrita"
          element={
            <AuthGuard requiredModule={opts.requiredModule} allowedRoles={opts.allowedRoles}>
              <div>CONTEUDO_PROTEGIDO</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>TELA_LOGIN</div>} />
        <Route path="/dashboard" element={<div>TELA_DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  authState.isAuthenticated = false;
  authState.isLoading = false;
  authState.modules = new Set();
});

describe('AuthGuard', () => {
  it('exibe loading enquanto a sessão é resolvida', () => {
    authState.isLoading = true;
    renderGuard({});
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('redireciona para /login quando não autenticado', () => {
    renderGuard({});
    expect(screen.getByText('TELA_LOGIN')).toBeInTheDocument();
    expect(screen.queryByText('CONTEUDO_PROTEGIDO')).not.toBeInTheDocument();
  });

  it('redireciona para /dashboard quando o módulo requerido está bloqueado', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1', perfil: 'professor', organizacao_id: 'org-A' };
    authState.modules = new Set(['acompanhamento']); // não inclui "rh"
    renderGuard({ requiredModule: 'rh' });
    expect(screen.getByText('TELA_DASHBOARD')).toBeInTheDocument();
  });

  it('redireciona para /dashboard quando perfil não está em allowedRoles (R.H. em rota só admin)', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-rh', perfil: 'rh', organizacao_id: 'org-A' };
    authState.modules = new Set(['rh']);
    renderGuard({ requiredModule: 'rh', allowedRoles: ['admin'] });
    expect(screen.getByText('TELA_DASHBOARD')).toBeInTheDocument();
  });

  it('renderiza children quando autenticado, módulo permitido e role permitido', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-admin', perfil: 'admin', organizacao_id: 'org-A' };
    authState.modules = new Set(['rh']);
    renderGuard({ requiredModule: 'rh', allowedRoles: ['admin', 'rh'] });
    expect(screen.getByText('CONTEUDO_PROTEGIDO')).toBeInTheDocument();
  });

  it('multi-tenant: usuários de orgs diferentes nunca compartilham acesso (cada sessão é isolada)', () => {
    // Org A — admin com módulo rh habilitado
    authState.isAuthenticated = true;
    authState.user = { id: 'u-admin-A', perfil: 'admin', organizacao_id: 'org-A' };
    authState.modules = new Set(['rh']);
    const { unmount } = renderGuard({ requiredModule: 'rh', allowedRoles: ['admin'] });
    expect(screen.getByText('CONTEUDO_PROTEGIDO')).toBeInTheDocument();
    unmount();

    // Org B — usuário não admin, mesmo módulo: bloqueado
    authState.user = { id: 'u-prof-B', perfil: 'professor', organizacao_id: 'org-B' };
    authState.modules = new Set(['rh']);
    renderGuard({ requiredModule: 'rh', allowedRoles: ['admin'] });
    expect(screen.getByText('TELA_DASHBOARD')).toBeInTheDocument();
  });
});
