ALTER TABLE public.pwa_settings ADD COLUMN IF NOT EXISTS hidden_menu_items_by_role jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.pwa_settings
SET hidden_menu_items_by_role = jsonb_build_object(
  'admin', COALESCE(to_jsonb(hidden_menu_items_mobile), '[]'::jsonb),
  'coordenador', COALESCE(to_jsonb(hidden_menu_items_mobile), '[]'::jsonb),
  'rh', COALESCE(to_jsonb(hidden_menu_items_mobile), '[]'::jsonb),
  'professor', COALESCE(to_jsonb(hidden_menu_items_mobile), '[]'::jsonb)
)
WHERE singleton = true AND (hidden_menu_items_by_role = '{}'::jsonb OR hidden_menu_items_by_role IS NULL);