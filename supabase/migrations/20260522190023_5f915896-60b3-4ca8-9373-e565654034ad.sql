CREATE TABLE IF NOT EXISTS public.pre_planning_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_planning_id uuid NOT NULL REFERENCES public.pre_plannings(id) ON DELETE CASCADE,
  lesson_material_id uuid NOT NULL REFERENCES public.lesson_materials(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pre_planning_id, lesson_material_id)
);

CREATE INDEX IF NOT EXISTS idx_ppm_pp_order ON public.pre_planning_materials(pre_planning_id, display_order);
CREATE INDEX IF NOT EXISTS idx_ppm_material ON public.pre_planning_materials(lesson_material_id);

ALTER TABLE public.pre_planning_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View pre_planning_materials when can view pre_planning"
ON public.pre_planning_materials FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pre_plannings pp
  WHERE pp.id = pre_planning_materials.pre_planning_id
    AND public.has_organization_access(auth.uid(), pp.organization_id)
));

CREATE POLICY "Coordinators manage pre_planning_materials"
ON public.pre_planning_materials FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.pre_plannings pp
  WHERE pp.id = pre_planning_materials.pre_planning_id
    AND public.is_coordinator(auth.uid(), pp.organization_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pre_plannings pp
  WHERE pp.id = pre_planning_materials.pre_planning_id
    AND public.is_coordinator(auth.uid(), pp.organization_id)
));