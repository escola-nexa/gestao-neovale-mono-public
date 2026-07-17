
-- Helper de normalização (sem dependência de extensão unaccent)
CREATE OR REPLACE FUNCTION public.normalize_pt_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    lower(trim(translate(coalesce(p_name, ''),
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
    ))),
    '\s+', ' ', 'g'
  );
$$;

-- Atualiza submit_school_indication_full para auto-match com professor existente
CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token text, p_keyword text, p_course_id uuid,
  p_classes jsonb, p_indications jsonb,
  p_indicado_por_nome text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_org uuid;
  v_school uuid;
  v_class jsonb;
  v_class_id uuid;
  v_class_ids uuid[] := ARRAY[]::uuid[];
  v_ind jsonb;
  v_count int := 0;
  v_indicado text;
  v_grade jsonb;
  v_disciplinas jsonb;
  v_sem_indicacao boolean;
  v_from_school boolean;
  v_nome text;
  v_telefone text;
  v_email text;
  v_formacao text;
  v_protected int;
  v_professor_id uuid;
  v_professor_full_name text;
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

  IF v_link.materialized_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este link já foi materializado em grade horária pelo R.H. e não aceita novos envios. Solicite ao R.H. um novo link.';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  v_indicado := nullif(trim(coalesce(p_indicado_por_nome, '')), '');
  IF v_indicado IS NULL THEN
    v_indicado := 'Diretor da escola';
  END IF;

  SELECT count(*) INTO v_protected
    FROM hr_school_indications
   WHERE external_link_id = v_link.id
     AND course_id = p_course_id
     AND (status <> 'PENDENTE'::hr_indication_status OR class_group_id IS NOT NULL);

  IF v_protected > 0 THEN
    RAISE EXCEPTION 'Este curso já tem % indicação(ões) aprovada(s)/alocada(s) pelo R.H. Não é possível reenviar. Solicite ao R.H. para revisar antes de tentar novamente.', v_protected;
  END IF;

  DELETE FROM hr_school_indications
   WHERE external_link_id = v_link.id
     AND course_id = p_course_id
     AND status = 'PENDENTE'::hr_indication_status
     AND class_group_id IS NULL;

  DELETE FROM hr_indication_classes ic
   WHERE ic.external_link_id = v_link.id
     AND ic.course_id = p_course_id
     AND NOT EXISTS (
       SELECT 1 FROM hr_school_indications hi WHERE hi.indication_class_id = ic.id
     );

  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      coalesce(v_class->>'nome', ''),
      coalesce(v_class->>'turno', 'manha'),
      coalesce((v_class->>'qtd')::int, 3)
    )
    RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || v_class_id;
  END LOOP;

  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    v_sem_indicacao := coalesce((v_ind->>'sem_indicacao')::boolean, false);
    v_from_school := coalesce((v_ind->>'from_school')::boolean, false);
    v_professor_id := NULL;

    IF v_sem_indicacao THEN
      v_nome := '[SEM INDICAÇÃO — A DEFINIR PELO R.H.]';
      v_telefone := NULL;
      v_email := NULL;
      v_formacao := 'A definir';
    ELSE
      IF nullif(trim(coalesce(v_ind->>'nome', '')), '') IS NULL THEN
        RAISE EXCEPTION 'Nome obrigatório para todos os professores indicados';
      END IF;
      IF NOT v_from_school AND nullif(trim(coalesce(v_ind->>'telefone', '')), '') IS NULL THEN
        RAISE EXCEPTION 'Telefone obrigatório para professores indicados de fora da escola';
      END IF;
      v_nome := trim(v_ind->>'nome');
      v_telefone := nullif(trim(coalesce(v_ind->>'telefone', '')), '');
      v_email := nullif(trim(coalesce(v_ind->>'email', '')), '');
      v_formacao := nullif(trim(coalesce(v_ind->>'formacao', '')), '');

      -- Auto-match: se o nome digitado (normalizado) bater com um professor
      -- já cadastrado na organização, vincula e padroniza o nome canônico.
      -- Evita duplicidade por variação de grafia/acento/caixa.
      SELECT p.id, p.full_name
        INTO v_professor_id, v_professor_full_name
        FROM professors p
       WHERE p.organization_id = v_org
         AND p.deleted_at IS NULL
         AND public.normalize_pt_name(p.full_name) = public.normalize_pt_name(v_nome)
       ORDER BY p.created_at ASC
       LIMIT 1;

      IF v_professor_id IS NOT NULL THEN
        v_nome := v_professor_full_name;
      END IF;
    END IF;

    v_grade := v_ind->'grade';
    IF (v_ind ? 'disciplinas') THEN
      v_disciplinas := v_ind->'disciplinas';
    ELSE
      v_disciplinas := to_jsonb(nullif(trim(coalesce(v_ind->>'funcao', '')), ''));
    END IF;

    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidato_nome, candidato_telefone, candidato_email,
      candidato_formacao,
      indicado_por_nome,
      origem,
      status,
      candidato_disciplinas,
      candidato_grade,
      professor_id
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      v_nome,
      v_telefone,
      v_email,
      v_formacao,
      v_indicado,
      'PORTAL_ESCOLA',
      'PENDENTE'::hr_indication_status,
      v_disciplinas,
      v_grade,
      v_professor_id
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
