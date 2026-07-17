import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';
const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const gradeHorariaApi = {} as any;
export const filtersApi = {} as any;
export type SchoolTimeSlot = any;
export type CreateSlotDTO = any;
