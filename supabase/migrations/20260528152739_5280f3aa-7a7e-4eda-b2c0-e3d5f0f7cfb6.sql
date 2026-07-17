CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT false,
  p_semester_scope text DEFAULT 'ALL'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.materialize_grade_from_indications_internal(
    p_link_id,
    p_ano_letivo,
    p_generate_occurrences,
    p_semester_scope,
    NULL::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT true,
  p_subject_bimester_filter jsonb DEFAULT NULL::jsonb,
  p_semester_scope text DEFAULT 'ALL'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.materialize_grade_from_indications(
    p_link_id,
    p_ano_letivo,
    p_generate_occurrences,
    p_subject_bimester_filter,
    p_semester_scope,
    NULL::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.materialize_grade_from_indications_internal(
    p_link_id,
    p_ano_letivo,
    p_generate_occurrences,
    'ALL'::text,
    NULL::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT true,
  p_subject_bimester_filter jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.materialize_grade_from_indications(
    p_link_id,
    p_ano_letivo,
    p_generate_occurrences,
    p_subject_bimester_filter,
    'ALL'::text,
    NULL::jsonb
  );
END;
$function$;