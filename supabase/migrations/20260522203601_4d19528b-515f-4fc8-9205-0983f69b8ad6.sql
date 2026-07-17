-- Patch materialize_grade_from_indications_internal:
-- 1) Pair expansion accepts UCP/Pedagógica pair even when there's no
--    hr_link_subject_bimester_filter row for the paired subject (default = enabled).
-- 2) Adds SQLSTATE to per-row error motivos.
-- 3) Aborts with GRADE_FALHA_TOTAL when zero models are inserted despite approved
--    indications, so the wrapper does NOT update external_links.materialized_at.
DO $patch$
DECLARE
  src text;
  patched text;
BEGIN
  src := pg_get_functiondef('public.materialize_grade_from_indications_internal(uuid, text, boolean)'::regprocedure);

  -- (1) Replace the strict EXISTS-only pairing filter with an EXISTS-or-no-rows fallback.
  patched := replace(
    src,
    $old$          -- só pareia se a disciplina pareada estiver no filtro de bimestre deste link
          WHERE EXISTS (
            SELECT 1 FROM hr_link_subject_bimester_filter f
             WHERE f.external_link_id = p_link_id
               AND f.subject_id = s2.id
               AND f.enabled = true
          )$old$,
    $new$          -- pareia se a disciplina pareada estiver habilitada no filtro
          -- OU se o link não tem nenhum filtro cadastrado para ela (default = habilitada).
          WHERE EXISTS (
            SELECT 1 FROM hr_link_subject_bimester_filter f
             WHERE f.external_link_id = p_link_id
               AND f.subject_id = s2.id
               AND f.enabled = true
          )
          OR NOT EXISTS (
            SELECT 1 FROM hr_link_subject_bimester_filter f
             WHERE f.external_link_id = p_link_id
               AND f.subject_id = s2.id
          )$new$
  );

  -- (2) Add SQLSTATE to per-row error motivos.
  patched := replace(
    patched,
    $old$      EXCEPTION WHEN OTHERS THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', SQLERRM, 'subject_id', v_sid);
      END;$old$,
    $new$      EXCEPTION WHEN OTHERS THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object(
          'indication_id', r.id,
          'reason', SQLERRM,
          'sqlstate', SQLSTATE,
          'subject_id', v_sid
        );
      END;$new$
  );

  -- (3) Fail loudly when nothing was inserted (forces the wrapper to skip
  -- the materialized_at update so the admin sees the error in the UI).
  patched := replace(
    patched,
    $old$  RETURN jsonb_build_object(
    'school_id', v_school,$old$,
    $new$  IF v_models_upserted = 0 AND v_aprovadas > 0 THEN
    RAISE EXCEPTION 'GRADE_FALHA_TOTAL: nenhuma aula gerada a partir de % indicação(ões) aprovada(s). Motivos: %',
      v_aprovadas, v_motivos::text;
  END IF;

  RETURN jsonb_build_object(
    'school_id', v_school,$new$
  );

  IF patched = src THEN
    RAISE EXCEPTION 'materialize_grade_from_indications_internal: nenhum bloco-alvo encontrado para patch (versão inesperada)';
  END IF;

  EXECUTE patched;
END
$patch$;
