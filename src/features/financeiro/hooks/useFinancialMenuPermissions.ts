import { useQuery } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Mapeia cada URL do menu Financeiro para a permissão mínima de visualização.
 * Quando o backend não retornar a permissão, o item é ocultado do menu
 * (a página em si continua protegida pelo FinanceiroGuard + RLS).
 */
export const FINANCEIRO_MENU_PERMISSION_MAP: Record<string, string> = {
  '/financeiro': 'financeiro.dashboard.visualizar',
  '/financeiro/contas-a-pagar': 'financeiro.contas_pagar.visualizar',
  '/financeiro/contas-a-receber': 'financeiro.contas_receber.visualizar',
  '/financeiro/pagamentos': 'financeiro.contas_pagar.pagar',
  '/financeiro/tesouraria': 'financeiro.tesouraria.visualizar',
  '/financeiro/conciliacao': 'financeiro.conciliacao.visualizar',
  '/financeiro/orcamentos': 'financeiro.orcamento.visualizar',
  '/financeiro/relatorios': 'financeiro.relatorios.visualizar',
};

/**
 * Resolve, em paralelo, todas as permissões usadas para gatear o menu lateral
 * do Financeiro. Admin recebe carta branca; demais perfis dependem do RPC
 * has_financial_permission, evitando exibir links que o backend bloquearia.
 */
export function useFinancialMenuPermissions() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';

  return useQuery({
    queryKey: ['fin-menu-perms', user?.id, isAdmin],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const urls = Object.keys(FINANCEIRO_MENU_PERMISSION_MAP);
      if (isAdmin) {
        return Object.fromEntries(urls.map((u) => [u, true]));
      }
      const entries = await Promise.all(
        urls.map(async (url) => {
          const key = FINANCEIRO_MENU_PERMISSION_MAP[url];
          const { data, error } = await financeiroApi.client.rpc('has_financial_permission', {
            _user_id: user!.id,
            _permission_key: key,
            _context: {} as any,
          });
          return [url, !error && !!data] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });
}
