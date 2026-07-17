-- Rotinas de retenção para conter o crescimento de logs operacionais
-- (cron.job_run_details, net._http_response, external_access_logs).

-- 1) Função: limpa execuções de cron com mais de 14 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  DELETE FROM cron.job_run_details
  WHERE start_time < now() - INTERVAL '14 days';
$$;

-- 2) Função: limpa respostas HTTP do pg_net com mais de 2 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_net_responses()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, net
AS $$
  DELETE FROM net._http_response
  WHERE created < now() - INTERVAL '2 days';
$$;

-- 3) Função: limpa logs de acesso externo com mais de 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_external_access_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.external_access_logs
  WHERE accessed_at < now() - INTERVAL '90 days';
$$;

-- 4) Função orquestradora: roda as 3 limpezas + VACUUM nas tabelas mais
-- afetadas por linhas mortas. Roda 1x por dia via pg_cron.
CREATE OR REPLACE FUNCTION public.run_daily_storage_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cleanup_old_cron_history();
  PERFORM public.cleanup_old_net_responses();
  PERFORM public.cleanup_old_external_access_logs();
END;
$$;

-- 5) Limpeza inicial imediata (libera ~70 MB agora)
SELECT public.run_daily_storage_maintenance();

-- 6) Agendamento diário às 03:10 UTC (00:10 BRT) — janela de baixo tráfego
DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id FROM cron.job
   WHERE jobname = 'daily-storage-maintenance';
  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
  PERFORM cron.schedule(
    'daily-storage-maintenance',
    '10 3 * * *',
    $cmd$SELECT public.run_daily_storage_maintenance();$cmd$
  );
END $$;

-- 7) Permissões: somente service_role pode invocar as funções manualmente
REVOKE ALL ON FUNCTION public.cleanup_old_cron_history()         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_net_responses()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_external_access_logs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_daily_storage_maintenance()    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_daily_storage_maintenance() TO service_role;