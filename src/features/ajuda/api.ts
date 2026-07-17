import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';
const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const ajudaApi = {} as any;
