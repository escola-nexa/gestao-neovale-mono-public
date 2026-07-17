ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS orgao_expedidor text,
  ADD COLUMN IF NOT EXISTS nacionalidade text NOT NULL DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS educacao_especial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS educacao_especial_descricao text;

CREATE UNIQUE INDEX IF NOT EXISTS students_org_cpf_unique
  ON public.students (organization_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';
