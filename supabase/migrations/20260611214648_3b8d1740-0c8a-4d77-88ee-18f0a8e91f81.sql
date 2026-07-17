
CREATE POLICY "fin_attach_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financial-attachments'
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')));

CREATE POLICY "fin_attach_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-attachments'
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.criar')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.editar')));

CREATE POLICY "fin_attach_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financial-attachments'
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.editar')));
