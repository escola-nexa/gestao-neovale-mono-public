
ALTER TABLE public.kanban_lists
ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
