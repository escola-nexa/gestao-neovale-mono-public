create or replace function public.get_school_indication_teachers(
  p_token text,
  p_keyword text,
  p_course_id uuid
)
returns table (
  id uuid,
  nome_completo text,
  telefone text,
  formacao text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.external_links%rowtype;
  v_keyword_ok boolean;
begin
  select * into v_link
    from public.external_links
   where token = p_token
     and link_type = 'SCHOOL_INDICATION'
     and is_active
     and (expires_at is null or expires_at > now())
   limit 1;
  if not found then
    raise exception 'Link inválido ou expirado';
  end if;

  select exists (
    select 1 from public.quarterly_keywords k
     where k.organization_id = v_link.organization_id
       and k.is_active
       and lower(trim(k.keyword)) = lower(trim(p_keyword))
  ) into v_keyword_ok;
  if not v_keyword_ok then
    raise exception 'Palavra-chave inválida';
  end if;

  return query
    select p.id,
           p.nome_completo,
           coalesce(p.telefone, '')::text,
           coalesce(p.formacao, '')::text,
           coalesce(p.email, '')::text
      from public.professor_school_courses psc
      join public.professors p
        on p.id = psc.professor_id
       and p.deleted_at is null
     where psc.school_id = v_link.school_id
       and psc.course_id = p_course_id
       and psc.status = 'ACTIVE'
     order by p.nome_completo;
end;
$$;

grant execute on function public.get_school_indication_teachers(text, text, uuid) to anon, authenticated;