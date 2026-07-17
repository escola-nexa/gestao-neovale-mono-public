
-- ============ library_folders ============
CREATE TABLE public.library_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.library_categories(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.library_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lib_folders_cat_parent ON public.library_folders(category_id, parent_id, sort_order);
CREATE INDEX idx_lib_folders_org ON public.library_folders(organization_id);
CREATE UNIQUE INDEX uq_lib_folders_name_root
  ON public.library_folders(category_id, lower(name))
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX uq_lib_folders_name_child
  ON public.library_folders(parent_id, lower(name))
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY lib_folders_select ON public.library_folders FOR SELECT
TO authenticated USING (
  organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY lib_folders_insert ON public.library_folders FOR INSERT
TO authenticated WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','coordenador','rh')
  )
);
CREATE POLICY lib_folders_update ON public.library_folders FOR UPDATE
TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','coordenador','rh')
  )
);
CREATE POLICY lib_folders_delete ON public.library_folders FOR DELETE
TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','coordenador','rh')
  )
);

CREATE TRIGGER trg_library_folders_updated
BEFORE UPDATE ON public.library_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ library_content_folders ============
CREATE TABLE public.library_content_folders (
  content_id uuid NOT NULL REFERENCES public.library_contents(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.library_folders(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, folder_id)
);

CREATE INDEX idx_lib_cf_folder ON public.library_content_folders(folder_id, sort_order);
CREATE INDEX idx_lib_cf_content ON public.library_content_folders(content_id);

ALTER TABLE public.library_content_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY lib_cf_select ON public.library_content_folders FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.library_folders f
    WHERE f.id = library_content_folders.folder_id
      AND f.organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid())
  )
);
CREATE POLICY lib_cf_write ON public.library_content_folders FOR ALL
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.library_folders f
    WHERE f.id = library_content_folders.folder_id
      AND f.organization_id IN (
        SELECT organization_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin','coordenador','rh')
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.library_folders f
    WHERE f.id = library_content_folders.folder_id
      AND f.organization_id IN (
        SELECT organization_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin','coordenador','rh')
      )
  )
);

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.library_folder_create(_category_id uuid, _parent_id uuid, _name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid;
  _new_id uuid;
  _next_order int;
BEGIN
  SELECT organization_id INTO _org FROM library_categories WHERE id = _category_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Categoria não encontrada'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM library_folders WHERE id = _parent_id AND category_id = _category_id) THEN
      RAISE EXCEPTION 'Pasta pai inválida para esta categoria';
    END IF;
  END IF;

  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO _next_order
  FROM library_folders
  WHERE category_id = _category_id AND parent_id IS NOT DISTINCT FROM _parent_id;

  INSERT INTO library_folders(organization_id, category_id, parent_id, name, sort_order, created_by)
  VALUES (_org, _category_id, _parent_id, btrim(_name), _next_order, auth.uid())
  RETURNING id INTO _new_id;

  RETURN _new_id;
END $$;

CREATE OR REPLACE FUNCTION public.library_folder_rename(_id uuid, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM library_folders WHERE id = _id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Pasta não encontrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE library_folders SET name = btrim(_name), updated_at = now() WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.library_folder_move(_id uuid, _new_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid;
  _cat uuid;
  _cursor uuid;
  _next_order int;
BEGIN
  SELECT organization_id, category_id INTO _org, _cat FROM library_folders WHERE id = _id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Pasta não encontrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _new_parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM library_folders WHERE id = _new_parent_id AND category_id = _cat) THEN
      RAISE EXCEPTION 'Pasta pai inválida';
    END IF;
    -- anti-ciclo
    _cursor := _new_parent_id;
    WHILE _cursor IS NOT NULL LOOP
      IF _cursor = _id THEN RAISE EXCEPTION 'Movimento criaria um ciclo'; END IF;
      SELECT parent_id INTO _cursor FROM library_folders WHERE id = _cursor;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO _next_order
  FROM library_folders
  WHERE category_id = _cat AND parent_id IS NOT DISTINCT FROM _new_parent_id;

  UPDATE library_folders
     SET parent_id = _new_parent_id, sort_order = _next_order, updated_at = now()
   WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.library_folder_delete(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM library_folders WHERE id = _id;
  IF _org IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  -- conteúdos são desvinculados via CASCADE em library_content_folders
  -- subpastas são removidas via CASCADE em parent_id
  DELETE FROM library_folders WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.library_folder_reorder(_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; i int;
BEGIN
  IF array_length(_ids,1) IS NULL THEN RETURN; END IF;
  SELECT organization_id INTO _org FROM library_folders WHERE id = _ids[1];
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  FOR i IN 1..array_length(_ids,1) LOOP
    UPDATE library_folders SET sort_order = i - 1, updated_at = now() WHERE id = _ids[i];
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.library_content_set_folders(_content_id uuid, _folder_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM library_contents WHERE id = _content_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Conteúdo não encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = _org AND role IN ('admin','coordenador','rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- valida que todas as pastas pertencem à mesma org
  IF _folder_ids IS NOT NULL AND array_length(_folder_ids,1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(_folder_ids) fid
      LEFT JOIN library_folders f ON f.id = fid
      WHERE f.id IS NULL OR f.organization_id <> _org
    ) THEN
      RAISE EXCEPTION 'Pasta inválida para esta organização';
    END IF;
  END IF;

  DELETE FROM library_content_folders WHERE content_id = _content_id;
  IF _folder_ids IS NOT NULL AND array_length(_folder_ids,1) > 0 THEN
    INSERT INTO library_content_folders(content_id, folder_id)
    SELECT _content_id, fid FROM unnest(_folder_ids) fid
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
