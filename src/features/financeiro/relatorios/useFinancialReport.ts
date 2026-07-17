import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';

export interface ReportColumn {
  key: string;
  label: string;
  type?: 'number' | 'currency' | 'date' | 'text';
}

export interface ReportPayload {
  report: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  page: number;
  page_size: number;
  total_count: number;
  error?: string;
}

export interface ReportFilters {
  start?: string | null;
  end?: string | null;
  school_id?: string | null;
  cost_center_id?: string | null;
  project_id?: string | null;
  category_id?: string | null;
  party_id?: string | null;
  account_id?: string | null;
  status?: string | null;
}

export function useFinancialReport(
  report: string | null,
  filters: ReportFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    enabled: !!report,
    queryKey: ['financial-report', report, filters, page, pageSize],
    queryFn: async (): Promise<ReportPayload> => {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: { report, filters, page, page_size: pageSize },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as ReportPayload;
    },
  });
}
