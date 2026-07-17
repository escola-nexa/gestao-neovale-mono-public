-- Permitir que o criador do canal enxergue a linha recém-inserida
-- (necessário para o RETURNING do PostgREST após INSERT). Sem isso,
-- professores recebiam "new row violates RLS policy" ao iniciar DMs,
-- pois o trigger que adiciona o criador como membro só roda AFTER INSERT.
DROP POLICY IF EXISTS channels_select_member ON public.chat_channels;

CREATE POLICY channels_select_member
ON public.chat_channels
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR is_chat_channel_member(id, auth.uid())
  OR is_admin(auth.uid())
);