
UPDATE public.chat_channels c
SET name = COALESCE(initiator.full_name, 'Usuário') || ' — ' || COALESCE(other.full_name, c.name, 'Sem nome')
FROM (
  SELECT ch.id AS channel_id,
         ch.created_by AS initiator_id,
         (
           SELECT m2.user_id
           FROM public.chat_channel_members m2
           WHERE m2.channel_id = ch.id AND m2.user_id <> ch.created_by
           LIMIT 1
         ) AS other_id
  FROM public.chat_channels ch
  WHERE ch.type = 'direct'
) pair
LEFT JOIN public.profiles initiator ON initiator.user_id = pair.initiator_id
LEFT JOIN public.profiles other ON other.user_id = pair.other_id
WHERE c.id = pair.channel_id AND c.type = 'direct';
