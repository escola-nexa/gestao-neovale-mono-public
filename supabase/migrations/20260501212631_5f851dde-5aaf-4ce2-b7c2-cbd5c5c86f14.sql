-- 1) Atualizar função do trigger para também fazer cascade dos links externos do professor
CREATE OR REPLACE FUNCTION public.deactivate_bindings_on_professor_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Comportamento original (preservado): desativa vínculos escola/curso
    UPDATE public.professor_school_courses
       SET status = 'INACTIVE'
     WHERE professor_id = NEW.id AND status = 'ACTIVE';

    -- NOVO: cascade dos logs de acesso dos links externos de documentos do professor
    DELETE FROM public.external_access_logs
     WHERE external_link_id IN (
       SELECT id
         FROM public.external_links
        WHERE content_type = 'documentos_professor'
          AND (scope_json->>'professor_id')::uuid = NEW.id
     );

    -- NOVO: remove os próprios links externos de documentos do professor
    DELETE FROM public.external_links
     WHERE content_type = 'documentos_professor'
       AND (scope_json->>'professor_id')::uuid = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Limpeza dos links órfãos atualmente ativos (3 registros) — escopo estrito
DELETE FROM public.external_access_logs
 WHERE external_link_id IN (
   SELECT el.id
     FROM public.external_links el
     JOIN public.professors p
       ON p.id = (el.scope_json->>'professor_id')::uuid
    WHERE el.content_type = 'documentos_professor'
      AND p.deleted_at IS NOT NULL
 );

DELETE FROM public.external_links el
 USING public.professors p
 WHERE el.content_type = 'documentos_professor'
   AND p.id = (el.scope_json->>'professor_id')::uuid
   AND p.deleted_at IS NOT NULL;