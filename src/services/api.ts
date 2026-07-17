import {
  User, CreateUserDTO, UpdateUserDTO,
  DashboardStats,
  EntityStatus,
  UserRole
} from '@/types';
import { supabase } from "@/integrations/supabase/client";

// ============== USERS API ==============
// Uses Supabase Edge Function for secure user creation with proper auth

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        email,
        full_name,
        organization_id,
        is_active,
        created_at,
        updated_at
      `);
    
    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Erro ao buscar usuários');
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    return (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id);
      return {
        id: profile.user_id,
        nomeCompleto: profile.full_name,
        email: profile.email,
        perfil: (userRole?.role || 'professor') as UserRole,
        status: 'ativo' as EntityStatus,
        isActive: (profile as any).is_active !== false,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    });
  },

  getById: async (id: string): Promise<User | undefined> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();
    
    if (error || !profile) return undefined;

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .single();

    return {
      id: profile.user_id,
      nomeCompleto: profile.full_name,
      email: profile.email,
      perfil: (role?.role || 'professor') as UserRole,
      status: 'ativo' as EntityStatus,
      isActive: (profile as any).is_active !== false,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  },

  create: async (data: { nomeCompleto: string; email: string; perfil: UserRole; organizationId: string; password: string }): Promise<User> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Não autenticado. Faça login para criar usuários.');
    }

    const response = await supabase.functions.invoke('create-user', {
      body: {
        email: data.email,
        password: data.password,
        fullName: data.nomeCompleto,
        role: data.perfil,
        organizationId: data.organizationId,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro ao criar usuário');
    }

    const result = response.data;
    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar usuário');
    }

    return {
      id: result.user.id,
      nomeCompleto: result.user.fullName,
      email: result.user.email,
      perfil: result.user.role,
      status: 'ativo' as EntityStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  update: async (data: UpdateUserDTO): Promise<User> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Não autenticado. Faça login para atualizar usuários.');
    }

    if (data.novaSenha && data.novaSenha.length > 0 && data.novaSenha.length < 8) {
      throw new Error('Senha deve ter no mínimo 8 caracteres');
    }

    const response = await supabase.functions.invoke('update-user', {
      body: {
        userId: data.id,
        fullName: data.nomeCompleto,
        email: data.email,
        role: data.perfil,
        newPassword: data.novaSenha || undefined,
      },
    });

    // Handle non-2xx errors (body lives inside response.error.context)
    let payload: any = response.data;
    if (response.error) {
      try {
        const ctx: any = (response.error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          payload = await ctx.json();
        }
      } catch { /* ignore */ }
    }

    if (!payload?.success) {
      throw new Error(payload?.error || response.error?.message || 'Erro ao atualizar usuário');
    }

    const updated = await usersApi.getById(data.id);
    if (!updated) throw new Error('Usuário não encontrado após atualização');
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Não autenticado. Faça login para excluir usuários.');
    }

    const response = await supabase.functions.invoke('delete-user', {
      body: { userId: id },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro ao excluir usuário');
    }

    const result = response.data;
    if (!result.success) {
      throw new Error(result.error || 'Erro ao excluir usuário');
    }
  },

  setActive: async (id: string, active: boolean): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Não autenticado.');
    }
    const response = await supabase.functions.invoke('set-user-active', {
      body: { userId: id, active },
    });
    let payload: any = response.data;
    if (response.error) {
      try {
        const ctx: any = (response.error as any).context;
        if (ctx && typeof ctx.json === 'function') payload = await ctx.json();
      } catch { /* ignore */ }
    }
    if (!payload?.success) {
      throw new Error(payload?.error || response.error?.message || 'Erro ao alterar status do usuário');
    }
  },
};

// ============== DASHBOARD API ==============
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [schoolsResult, studentsResult, professorsResult, classGroupsResult] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('professors').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('deleted_at', null),
      supabase.from('class_groups').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    ]);

    return {
      totalEscolas: schoolsResult.count ?? 0,
      totalProfessores: professorsResult.count ?? 0,
      totalAlunos: studentsResult.count ?? 0,
      totalTurmas: classGroupsResult.count ?? 0,
    };
  },
};
