CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token text,
  p_keyword text,
  p_course_id uuid,
  p_classes jsonb,
  p_indications jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_org UUID;
  v_school UUID;
  v_class JSONB;
  v_class_id UUID;
  v_class_ids UUID[] := ARRAY[]::UUID[];
  v_ind JSONB;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link inválido';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;

  IF NOT EXISTS (
    SELECT 1 FROM course_schools
     WHERE school_id = v_school AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;

  -- Cria as turmas declaradas pelo diretor
  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org,
      v_link.id,
      v_school,
      p_course_id,
      coalesce(v_class->>'nome', ''),
      coalesce(v_class->>'turno', 'manha'),
      coalesce((v_class->>'qtd')::int, 3)
    )
    RETURNING id INTO v_class_id;

    v_class_ids := v_class_ids || v_class_id;
  END LOOP;

  -- Cria as indicações (1 por professor)
  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidato_nome, candidato_telefone, candidato_email,
      indicado_por_nome,
      origem,
      status
    ) VALUES (
      v_org,
      v_link.id,
      v_school,
      p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      coalesce(v_ind->>'nome', ''),
      coalesce(v_ind->>'telefone', ''),
      coalesce(v_ind->>'email', ''),
      'Diretor da escola',
      'PORTAL_ESCOLA',
      'PENDENTE'::hr_indication_status
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'classes', coalesce(array_length(v_class_ids, 1), 0),
    'indications', v_count
  );
END;
$function$;