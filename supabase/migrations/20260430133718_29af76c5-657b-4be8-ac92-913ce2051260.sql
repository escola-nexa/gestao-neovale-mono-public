-- Permitir que todos os usuários autenticados da mesma organização visualizem a palavra-chave trimestral.
-- Apenas administradores podem criar/alterar/excluir.

DROP POLICY IF EXISTS "Admins can manage keywords" ON public.quarterly_keywords;
DROP POLICY IF EXISTS "Org members can view active keywords" ON public.quarterly_keywords;
DROP POLICY IF EXISTS "Admins can insert keywords" ON public.quarterly_keywords;
DROP POLICY IF EXISTS "Admins can update keywords" ON public.quarterly_keywords;
DROP POLICY IF EXISTS "Admins can delete keywords" ON public.quarterly_keywords;

-- SELECT: qualquer usuário autenticado da mesma organização
CREATE POLICY "Org members can view keywords"
ON public.quarterly_keywords
FOR SELECT
TO authenticated
USING (public.has_organization_access(auth.uid(), organization_id));

-- INSERT: apenas admin
CREATE POLICY "Admins can insert keywords"
ON public.quarterly_keywords
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: apenas admin
CREATE POLICY "Admins can update keywords"
ON public.quarterly_keywords
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: apenas admin
CREATE POLICY "Admins can delete keywords"
ON public.quarterly_keywords
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));