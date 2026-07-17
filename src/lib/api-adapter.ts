import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

export const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';
const NEST_URL = import.meta.env.VITE_NEST_API_URL || 'http://localhost:3000';

export const nestApi = axios.create({ baseURL: NEST_URL });

// Attach JWT token to every NestJS request
nestApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('nest_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const nest = {
  get: async (path: string, params?: any) => {
    const { data } = await nestApi.get(path, { params });
    return { data, error: null };
  },
  post: async (path: string, body?: any) => {
    const { data } = await nestApi.post(path, body);
    return { data, error: null };
  },
  patch: async (path: string, body?: any) => {
    const { data } = await nestApi.patch(path, body);
    return { data, error: null };
  },
  delete: async (path: string) => {
    const { data } = await nestApi.delete(path);
    return { data, error: null };
  },
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

const authAdapter = {
  login: async (email: string, password: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.post('/auth/login', { email, password });
        if (data?.access_token) {
          localStorage.setItem('nest_access_token', data.access_token);
        }
        
        const nestUser = data?.user || {};
        const mappedUser = {
          id: nestUser.id || data?.sub,
          email,
          app_metadata: { role: nestUser.role || data?.role },
          user_metadata: { full_name: nestUser.fullName || data?.fullName }
        };

        return { data: { user: mappedUser }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e?.response?.data?.message || 'Login failed' } };
      }
    }
    return supabase.auth.signInWithPassword({ email, password });
  },
  logout: async () => {
    localStorage.removeItem('nest_access_token');
    if (API_PROVIDER !== 'nestjs') await supabase.auth.signOut();
  },
};

// ─── ESCOLAS ─────────────────────────────────────────────────────────────────

const escolasAdapter = {
  getAll: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/schools')).data;
    const { data, error } = await supabase.from('schools').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  getById: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/schools/${id}`)).data;
    const { data, error } = await supabase.from('schools').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/schools', body)).data;
    const { data, error } = await supabase.from('schools').insert(body).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/schools/${id}`, body)).data;
    const { data, error } = await supabase.from('schools').update(body).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/schools/${id}`)).data;
    const { error } = await supabase.from('schools').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── CURSOS ──────────────────────────────────────────────────────────────────

const cursosAdapter = {
  getAll: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/courses')).data;
    const { data, error } = await supabase.from('courses').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  getById: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/courses/${id}`)).data;
    const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/courses', body)).data;
    const { data, error } = await supabase.from('courses').insert(body).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/courses/${id}`, body)).data;
    const { data, error } = await supabase.from('courses').update(body).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/courses/${id}`)).data;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── TURMAS ──────────────────────────────────────────────────────────────────

const turmasAdapter = {
  getAll: async (params?: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/class-groups', { params })).data;
    let q = supabase.from('class_groups').select('*').order('nome');
    if (params?.schoolId) q = q.eq('school_id', params.schoolId) as any;
    if (params?.status) q = q.eq('status', params.status) as any;
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  getById: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/class-groups/${id}`)).data;
    const { data, error } = await supabase.from('class_groups').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/class-groups', body)).data;
    const { data, error } = await supabase.from('class_groups').insert(body).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/class-groups/${id}`, body)).data;
    const { data, error } = await supabase.from('class_groups').update(body).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/class-groups/${id}`)).data;
    const { error } = await supabase.from('class_groups').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── ALUNOS ──────────────────────────────────────────────────────────────────

const alunosAdapter = {
  getFiltered: async (params: any) => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/students', { params });
      return { data: Array.isArray(data) ? data : data?.data || [], count: data?.count || 0, error: null };
    }
    let q = supabase.from('students').select('*', { count: 'exact' });
    if (params?.search) q = q.ilike('nome_completo', `%${params.search}%`) as any;
    if (params?.status) q = q.eq('status', params.status) as any;
    if (params?.page && params?.pageSize) {
      const from = (params.page - 1) * params.pageSize;
      q = q.range(from, from + params.pageSize - 1) as any;
    }
    const { data, count, error } = await q;
    return { data: data || [], count: count || 0, error };
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') {
      const { data, error } = await nest.post('/students', body);
      return { data, error };
    }
    const { data, error } = await supabase.from('students').insert(body).select().single();
    return { data, error };
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') {
      const { data, error } = await nest.patch(`/students/${id}`, body);
      return { data, error };
    }
    const { data, error } = await supabase.from('students').update(body).eq('id', id).select().single();
    return { data, error };
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return nest.delete(`/students/${id}`);
    const { error } = await supabase.from('students').delete().eq('id', id);
    return { error };
  },
};

// ─── ENROLLMENTS ─────────────────────────────────────────────────────────────

const enrollmentsAdapter = {
  getByStudent: async (studentId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/enrollments`, { params: { studentId } })).data;
    const { data, error } = await supabase.from('enrollments').select('*, students(*), schools(*), courses(*), class_groups(*)').eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/enrollments', body)).data;
    const { data, error } = await supabase.from('enrollments').insert(body).select().single();
    if (error) throw error;
    return data;
  },
};

// ─── LOCAIS (estados e cidades) ──────────────────────────────────────────────

const locaisAdapter = {
  getStates: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/states')).data;
    const { data } = await supabase.from('states').select('*').order('nome');
    return data || [];
  },
  getCities: async (stateId?: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/cities', { params: { stateId } })).data;
    let q = supabase.from('cities').select('*').order('nome');
    if (stateId) q = q.eq('state_id', stateId) as any;
    const { data } = await q;
    return data || [];
  },
  createState: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/states', body)).data;
    const { data, error } = await supabase.from('states').insert(body).select().single();
    if (error) throw error; return data;
  },
  updateState: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/states/${id}`, body)).data;
    const { data, error } = await supabase.from('states').update(body).eq('id', id).select().single();
    if (error) throw error; return data;
  },
  deleteState: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/states/${id}`)).data;
    const { error } = await supabase.from('states').delete().eq('id', id);
    if (error) throw error;
  },
  createCity: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/cities', body)).data;
    const { data, error } = await supabase.from('cities').insert(body).select().single();
    if (error) throw error; return data;
  },
  deleteCity: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/cities/${id}`)).data;
    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── STORAGE ─────────────────────────────────────────────────────────────────

const storageAdapter = {
  upload: async (bucket: string, path: string, file: File, opts?: any) => {
    if (API_PROVIDER === 'nestjs') {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', bucket);
      fd.append('path', path);
      try { const { data } = await nestApi.post('/storage/upload', fd); return { data, error: null }; }
      catch (e: any) { return { data: null, error: e }; }
    }
    return supabase.storage.from(bucket).upload(path, file, opts);
  },
  download: async (bucket: string, path: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get('/storage/download', { params: { bucket, path }, responseType: 'blob' });
        return { data, error: null };
      } catch (e: any) { return { data: null, error: e }; }
    }
    return supabase.storage.from(bucket).download(path);
  },
  remove: async (bucket: string, paths: string[]) => {
    if (API_PROVIDER === 'nestjs') {
      try { const { data } = await nestApi.post('/storage/remove', { bucket, paths }); return { data, error: null }; }
      catch (e: any) { return { data: null, error: e }; }
    }
    return supabase.storage.from(bucket).remove(paths);
  },
};

// ─── KANBAN LISTS ─────────────────────────────────────────────────────────────

const kanbanListsAdapter = {
  getAll: async (params?: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/kanban/lists', { params })).data;
    const { data } = await supabase.from('kanban_lists').select('*').order('position');
    return data || [];
  },
  initialize: async (params?: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/kanban/lists/initialize', params)).data;
    return [];
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/kanban/lists', body)).data;
    const { data, error } = await supabase.from('kanban_lists').insert(body).select().single();
    if (error) throw error; return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/kanban/lists/${id}`, body)).data;
    const { data, error } = await supabase.from('kanban_lists').update(body).eq('id', id).select().single();
    if (error) throw error; return data;
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`/kanban/lists/${id}`)).data;
    const { error } = await supabase.from('kanban_lists').delete().eq('id', id);
    if (error) throw error;
  },
};

const kanbanCardsAdapter = {
  reorder: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/kanban/cards/reorder', body)).data;
    return body;
  },
};

// ─── TICKETS ─────────────────────────────────────────────────────────────────

const ticketsAdapter = {
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post('/tickets', body)).data;
    const { data, error } = await supabase.from('tickets').insert(body).select().single();
    if (error) throw error; return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`/tickets/${id}`, body)).data;
    const { data, error } = await supabase.from('tickets').update(body).eq('id', id).select().single();
    if (error) throw error; return data;
  },
};

const makeSupabaseCrud = (table: string, nestPath: string) => ({
  getAll: async (params?: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(nestPath, { params })).data;
    const { data } = await supabase.from(table as any).select('*');
    return data || [];
  },
  getByTicketId: async (ticketId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(nestPath, { params: { ticketId } })).data;
    const { data } = await supabase.from(table as any).select('*').eq('ticket_id', ticketId);
    return data || [];
  },
  getByTicketIds: async (ticketIds: string[]) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/by-ids`, { ticketIds })).data;
    const { data } = await supabase.from(table as any).select('*').in('ticket_id', ticketIds);
    return data || [];
  },
  getByChecklistIds: async (ids: string[]) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/by-checklist-ids`, { ids })).data;
    const { data } = await supabase.from(table as any).select('*').in('checklist_id', ids);
    return data || [];
  },
  getProgress: async (checklistId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`${nestPath}/progress/${checklistId}`)).data;
    const { data } = await supabase.from(table as any).select('*').eq('checklist_id', checklistId);
    const items = data || [];
    return { total: items.length, completed: items.filter((i: any) => i.completed).length };
  },
  create: async (body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(nestPath, body)).data;
    const { data, error } = await supabase.from(table as any).insert(body).select().single();
    if (error) throw error; return data;
  },
  createMany: async (rows: any[]) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/bulk`, rows)).data;
    const { data, error } = await supabase.from(table as any).insert(rows).select();
    if (error) throw error; return data;
  },
  update: async (id: string, body: any) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.patch(`${nestPath}/${id}`, body)).data;
    const { data, error } = await supabase.from(table as any).update(body).eq('id', id).select().single();
    if (error) throw error; return data;
  },
  updatePositions: async (positions: any[]) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/positions`, positions)).data;
    return positions;
  },
  delete: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.delete(`${nestPath}/${id}`)).data;
    const { error } = await supabase.from(table as any).delete().eq('id', id);
    if (error) throw error;
  },
  deleteUsers: async (ticketId: string, userIds: string[]) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/remove-users`, { ticketId, userIds })).data;
    const { error } = await supabase.from(table as any).delete().eq('ticket_id', ticketId).in('user_id', userIds);
    if (error) throw error;
  },
  attach: async (ticketId: string, labelId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/attach`, { ticketId, labelId })).data;
    const { data, error } = await supabase.from(table as any).insert({ ticket_id: ticketId, label_id: labelId }).select().single();
    if (error) throw error; return data;
  },
  detach: async (ticketId: string, labelId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/detach`, { ticketId, labelId })).data;
    const { error } = await supabase.from(table as any).delete().eq('ticket_id', ticketId).eq('label_id', labelId);
    if (error) throw error;
  },
  watch: async (ticketId: string, userId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/watch`, { ticketId, userId })).data;
    const { data, error } = await supabase.from(table as any).insert({ ticket_id: ticketId, user_id: userId }).select().single();
    if (error) throw error; return data;
  },
  unwatch: async (ticketId: string, userId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.post(`${nestPath}/unwatch`, { ticketId, userId })).data;
    const { error } = await supabase.from(table as any).delete().eq('ticket_id', ticketId).eq('user_id', userId);
    if (error) throw error;
  },
});

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export const ApiAdapter = {
  auth: authAdapter,
  escolas: escolasAdapter,
  cursos: cursosAdapter,
  turmas: turmasAdapter,
  alunos: alunosAdapter,
  enrollments: enrollmentsAdapter,
  locais: locaisAdapter,
  storage: storageAdapter,
  kanbanLists: kanbanListsAdapter,
  kanbanCards: kanbanCardsAdapter,
  tickets: ticketsAdapter,
  ticketMessages: makeSupabaseCrud('ticket_messages', '/tickets/messages'),
  ticketAssignees: makeSupabaseCrud('ticket_assignees', '/tickets/assignees'),
  ticketCategories: makeSupabaseCrud('ticket_categories', '/tickets/categories'),
  ticketChecklists: makeSupabaseCrud('ticket_checklists', '/tickets/checklists'),
  ticketChecklistItems: makeSupabaseCrud('ticket_checklist_items', '/tickets/checklist-items'),
  ticketLabels: makeSupabaseCrud('ticket_labels', '/tickets/labels'),
  ticketLabelAssignments: makeSupabaseCrud('ticket_label_assignments', '/tickets/label-assignments'),
  ticketWatchers: makeSupabaseCrud('ticket_watchers', '/tickets/watchers'),
};

// Legacy named exports for files that import them directly
export const coursesApi = cursosAdapter;
export const subjectsApi = {
  getAll: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/subjects')).data;
    const { data } = await supabase.from('subjects').select('*').is('deleted_at', null).order('nome');
    return data || [];
  },
};
