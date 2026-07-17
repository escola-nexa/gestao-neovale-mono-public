/**
 * Role helpers — centralized so adding/removing managerial roles
 * (admin / coordenador / rh) is a one-line change.
 *
 * R.H. é equiparado a Coordenador para fins de operação pedagógica
 * (planejamento, orientações, frequência, tickets, calendário, etc.).
 * A diferença está apenas nas regras de criação/exclusão de outros
 * usuários (apenas admin pode criar admin/RH/Financeiro) — vide
 * AuthContext e edge functions create-user / update-user-password.
 *
 * Financeiro é um perfil GLOBAL, isolado dos módulos pedagógicos e de R.H.
 * Não é "manager" e não pode criar outros usuários.
 */
export type ManagerRole = 'admin' | 'coordenador' | 'rh';

export const MANAGER_ROLES: ManagerRole[] = ['admin', 'coordenador', 'rh'];

export function isManagerRole(role?: string | null): boolean {
  return !!role && (MANAGER_ROLES as string[]).includes(role);
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function isCoordinatorOrAbove(role?: string | null): boolean {
  return isManagerRole(role);
}

export function isFinanceiroRole(role?: string | null): boolean {
  return role === 'financeiro';
}
