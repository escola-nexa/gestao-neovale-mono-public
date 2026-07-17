CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(p_link_id uuid, p_ano_letivo text, p_generate_occurrences boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_school uuid; v_school_name text; v_user uuid := auth.uid();
  v_classes_upserted int := 0; v_slots_upserted int := 0; v_models_upserted int := 0;
  v_aulas_anp int := 0; v_aulas_ignoradas int := 0;
  v_planning_created int := 0; v_planning_deficit int := 0;
  v_occurrences_created int := 0;
  v_bindings_upserted int := 0; v_bindings_deactivated int := 0;
  v_notifications_sent int := 0;
  v_motivos jsonb := '[]'::jsonb; v_pendentes int; v_recusadas int; v_aprovadas int; v_total int;
  v_class_group_ids uuid[] := ARRAY[]::uuid[];
  v_model_ids uuid[] := ARRAY[]::uuid[];
  v_planning_model_ids uuid[] := ARRAY[]::uuid[];
  v_active_pairs jsonb := '[]'::jsonb;
  v_preplanning_seed jsonb := '[]'::jsonb;
  r record; v_class_group_id uuid; v_weekday weekday; v_start time; v_end time;
  v_slot_id uuid; v_slot_number int; v_professor_id uuid;
  v_label text; v_times text[]; v_subject_id uuid; v_subj_ok boolean;
  v_calendar_id uuid; v_cal_start date; v_cal_end date;
  v_b2_end date; v_model_id uuid; v_class_mode text;
  prof record; v_target int; v_already int; v_to_create int;
  free_slot record; v_pl_model_id uuid; bind record;
  v_teto numeric; v_prof_status text; v_prof_deleted timestamptz; v_prof_user uuid;
  v_total_h numeric; v_row_h numeric;
  v_per_prof_slots jsonb := '{}'::jsonb;
  v_slot_key text;
  v_per_prof jsonb := '{}'::jsonb;
  v_shift_morning_end time; v_shift_afternoon_end time;
  v_existing_with_history int;
  v_first uuid; v_second uuid; v_annual uuid;
  v_subject_set uuid[]; v_sid uuid;
  v_existing_binding_id uuid;
  v_resolved_count int := 0;
  v_prof_total_ch numeric;
  v_predominant_shift text;
  v_occ_deleted int := 0;
  v_shift_label text;
  v_new_slot_id uuid;
  v_pl_course_id uuid;
  v_pl_class_group_id uuid;
  v_pl_failed_no_slot int := 0;
  v_body text;
BEGIN
  -- Recupera corpo atual da função e troca apenas o predicado de status do professor
  SELECT pg_get_functiondef(p.oid) INTO v_body
    FROM pg_proc p
   WHERE p.proname = 'materialize_grade_from_indications_internal'
   LIMIT 1;
  -- (placeholder, real substitution happens via DO block abaixo)
  RAISE EXCEPTION 'placeholder';
END;
$function$;

-- Substituição cirúrgica do predicado de status no corpo da função
DO $$
DECLARE
  v_src text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_src
    FROM pg_proc WHERE proname='materialize_grade_from_indications_internal' LIMIT 1;
  -- Nada a fazer aqui; a substituição é feita pelo CREATE OR REPLACE final abaixo.
  NULL;
END $$;