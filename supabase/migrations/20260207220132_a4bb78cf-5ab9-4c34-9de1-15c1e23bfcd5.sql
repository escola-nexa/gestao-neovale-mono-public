-- ==========================================================================
-- FIX: Permissões de RLS para Professores (Ocorrências e Modelos)
-- ==========================================================================

-- 1. Permitir que professores gerenciem suas próprias ocorrências de aula
DROP POLICY IF EXISTS "Professors can manage their own occurrences" ON public.annual_class_occurrences;

CREATE POLICY "Professors can manage their own occurrences"
ON public.annual_class_occurrences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    JOIN public.professors p ON p.id = wtm.professor_id
    WHERE wtm.id = annual_class_occurrences.weekly_model_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    JOIN public.professors p ON p.id = wtm.professor_id
    WHERE wtm.id = annual_class_occurrences.weekly_model_id
    AND p.user_id = auth.uid()
  )
);

-- 2. Permitir que professores gerenciem seus próprios modelos semanais
DROP POLICY IF EXISTS "Professors can manage their own teaching models" ON public.weekly_teaching_models;

CREATE POLICY "Professors can manage their own teaching models"
ON public.weekly_teaching_models
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = weekly_teaching_models.professor_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = weekly_teaching_models.professor_id
    AND p.user_id = auth.uid()
  )
);

-- Comentário para documentação
COMMENT ON POLICY "Professors can manage their own occurrences" ON public.annual_class_occurrences IS 'Permite que professores gerem, atualizem e excluam as ocorrências associadas aos seus próprios horários.';
COMMENT ON POLICY "Professors can manage their own teaching models" ON public.weekly_teaching_models IS 'Permite que professores gerenciem seus próprios horários na grade horária.';