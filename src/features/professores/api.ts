import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';

const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const professoresApi = {
  getAuthUser: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/auth/me')).data;
    const { data } = await supabase.auth.getUser();
    return data?.user;
  },
  
  createSignedUrl: async (bucket: string, path: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/storage/${bucket}/signed-url?path=${path}`)).data.signedUrl;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl;
  },
  // Stub para os Canais Real-Time do Kanban
  stubChannel: () => ({
    on: function() { return this; },
    subscribe: function() { return this; },
    unsubscribe: function() {}
  }),
  removeChannel: () => {},

  getAll: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/professors')).data;
    const { data, error } = await supabase.from('professors').select('*').eq('status', 'ACTIVE').is('deleted_at', null).order('full_name');
    if (error) throw error;
    return data || [];
  },
  
  getById: async (id: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/professors/${id}`)).data;
    const { data, error } = await supabase.from('professors').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  client: supabase
};
export const professorsApi = professoresApi;
