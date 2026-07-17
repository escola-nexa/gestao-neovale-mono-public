UPDATE public.chat_channel_members
SET last_read_at = now()
WHERE user_id = 'e1f0a892-ab2f-4a16-90a0-cf6137ad108f'
  AND channel_id = '14998e69-8087-4f49-9c2c-ce6fb3cadfda';