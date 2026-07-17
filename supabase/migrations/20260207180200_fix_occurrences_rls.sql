-- ==========================================================================
-- FIX: Permissões de RLS para Professores (Ocorrências e Modelos)
-- ==========================================================================

-- 1. Permitir que professores gerenciem suas próprias ocorrências de aula
-- Atualmente apenas coordenadores e admins podem fazer isso, o que causa erro na geração automática
DROP POLICY IF EXISTS "Professors can manage their own occurrences" ON public.annual_class_occurrences;
CREATE POLICY "Professors can manage their own occurrences"
ON public.annual_class_occurrences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    WHERE wtm.id = annual_class_occurrences.weekly_model_id
    AND wtm.professor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    WHERE wtm.id = annual_class_occurrences.weekly_model_id
    AND wtm.professor_id = auth.uid()
  )
);

-- 2. Permitir que professores gerenciem seus próprios modelos semanais
-- Atualmente eles têm apenas SELECT. Isso permite que eles criem e editem sua própria grade.
DROP POLICY IF EXISTS "Professors can manage their own teaching models" ON public.weekly_teaching_models;
CREATE POLICY "Professors can manage their own teaching models"
ON public.weekly_teaching_models
FOR ALL
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

-- Comentário para documentação do motivo da migração
COMMENT ON POLICY "Professors can manage their own occurrences" ON public.annual_class_occurrences IS 'Permite que professores gerem, atualizem e excluam as ocorrências associadas aos seus próprios horários.';
COMMENT ON POLICY "Professors can manage their own teaching models" ON public.weekly_teaching_models IS 'Permite que professores gerenciem seus próprios horários na grade horária.';
