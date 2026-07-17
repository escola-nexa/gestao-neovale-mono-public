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
  email text,
  vinculado_ao_curso boolean,
  cursos_vinculados text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.external_links%rowtype;
begin
  select * into v_link
    from public.external_links
   where token = p_token
     and content_type = 'hr_school_indication'
     and is_active = true
     and (expires_at is null or expires_at > now())
   limit 1;
  if not found then
    raise exception 'Link inválido ou expirado';
  end if;

  if not public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) then
    raise exception 'Palavra-chave inválida ou expirada';
  end if;

  return query
    select p.id,
           p.nome_completo,
           coalesce(p.telefone, '')::text,
           coalesce(p.formacao, '')::text,
           coalesce(p.email, '')::text,
           bool_or(psc.course_id = p_course_id) as vinculado_ao_curso,
           array_agg(distinct c.nome order by c.nome) filter (where c.nome is not null) as cursos_vinculados
      from public.professor_school_courses psc
      join public.professors p
        on p.id = psc.professor_id
       and p.deleted_at is null
      left join public.courses c
        on c.id = psc.course_id
     where psc.school_id = v_link.school_id
       and psc.status = 'ACTIVE'
     group by p.id, p.nome_completo, p.telefone, p.formacao, p.email
     order by bool_or(psc.course_id = p_course_id) desc, p.nome_completo;
end;
$$;

grant execute on function public.get_school_indication_teachers(text, text, uuid) to anon, authenticated;