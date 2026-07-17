UPDATE public.branding_settings
SET logo_url = 'https://sczpzqxedmzkddumncbh.supabase.co/storage/v1/object/public/branding/2367ba0a-9947-40a2-8bd2-23398ea69f9a/logo-neovale-official.png',
    icon_url = COALESCE(icon_url, 'https://sczpzqxedmzkddumncbh.supabase.co/storage/v1/object/public/branding/2367ba0a-9947-40a2-8bd2-23398ea69f9a/logo-neovale-official.png'),
    updated_at = now()
WHERE organization_id = '2367ba0a-9947-40a2-8bd2-23398ea69f9a';