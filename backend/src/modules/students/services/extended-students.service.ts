import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ImportBatches } from '../../import_batches/entities/import_batches.entity';
import { ImportBatchRows } from '../../import_batch_rows/entities/import_batch_rows.entity';

@Injectable()
export class StudentsExtendedService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getStudentDuplicates(orgId: string) {
    const query = `
      WITH base AS (
        SELECT
          s.id,
          s.nome_completo,
          s.codigo_matricula,
          s.cpf,
          s.status::text AS status,
          s.created_at,
          NULLIF(upper(btrim(s.codigo_matricula)), '') AS mat_norm,
          NULLIF(regexp_replace(coalesce(s.cpf, ''), '\\D', '', 'g'), '') AS cpf_norm
        FROM public.alunos s
        WHERE s.user_id = $1 -- Using user_id for tenant isolation as defined in entity, but we need to check if students entity uses organization_id or user_id
      ),
      -- Wait, the entity 'alunos' is different from 'students' from Supabase.
      -- Let's query the 'students' table directly as migrated by TypeORM.
      base2 AS (
        SELECT
          s.id,
          s.nome_completo,
          s.codigo_matricula,
          s.cpf,
          s.status::text AS status,
          s.created_at,
          NULLIF(upper(btrim(s.codigo_matricula)), '') AS mat_norm,
          NULLIF(regexp_replace(coalesce(s.cpf, ''), '\\D', '', 'g'), '') AS cpf_norm
        FROM public.students s
        WHERE s.organization_id = $1
      ),
      dup_mat AS (
        SELECT mat_norm AS valor, count(*)::int AS qtd
        FROM base2
        WHERE mat_norm IS NOT NULL
        GROUP BY mat_norm
        HAVING count(*) > 1
      ),
      dup_cpf AS (
        SELECT cpf_norm AS valor, count(*)::int AS qtd
        FROM base2
        WHERE cpf_norm IS NOT NULL AND length(cpf_norm) = 11
        GROUP BY cpf_norm
        HAVING count(*) > 1
      ),
      rows_mat AS (
        SELECT 'matricula'::text AS tipo, d.valor AS valor_normalizado, d.qtd AS group_count,
               b.id AS student_id, b.nome_completo, b.codigo_matricula, b.cpf, b.status, b.created_at
        FROM dup_mat d
        JOIN base2 b ON b.mat_norm = d.valor
      ),
      rows_cpf AS (
        SELECT 'cpf'::text AS tipo, d.valor AS valor_normalizado, d.qtd AS group_count,
               b.id AS student_id, b.nome_completo, b.codigo_matricula, b.cpf, b.status, b.created_at
        FROM dup_cpf d
        JOIN base2 b ON b.cpf_norm = d.valor
      ),
      unioned AS (
        SELECT * FROM rows_mat
        UNION ALL
        SELECT * FROM rows_cpf
      )
      SELECT
        u.tipo,
        u.valor_normalizado,
        u.group_count,
        u.student_id,
        u.nome_completo,
        u.codigo_matricula,
        u.cpf,
        u.status,
        u.created_at,
        COALESCE((
          SELECT jsonb_agg(DISTINCT jsonb_build_object('id', sc.id, 'nome', sc.nome))
          FROM public.enrollments e
          JOIN public.schools sc ON sc.id = e.school_id
          WHERE e.student_id = u.student_id AND e.status = 'ativa'
        ), '[]'::jsonb) AS schools
      FROM unioned u
      ORDER BY u.tipo, u.valor_normalizado, u.nome_completo;
    `;
    return this.entityManager.query(query, [orgId]);
  }

  async getStudentImportConflicts(orgId: string) {
    const query = `
      SELECT
        r.batch_id,
        r.row_number,
        r.student_name AS attempted_name,
        r.codigo_matricula AS attempted_matricula,
        r.error_message,
        r.created_at AS attempted_at,
        s.id AS existing_student_id,
        s.nome_completo AS existing_name,
        s.codigo_matricula AS existing_matricula,
        s.cpf AS existing_cpf,
        s.status::text AS existing_status,
        COALESCE((
          SELECT jsonb_agg(DISTINCT jsonb_build_object('id', sc.id, 'nome', sc.nome))
          FROM public.enrollments e
          JOIN public.schools sc ON sc.id = e.school_id
          WHERE e.student_id = s.id AND e.status = 'ativa'
        ), '[]'::jsonb) AS existing_schools
      FROM public.import_batch_rows r
      JOIN public.import_batches b ON b.id = r.batch_id
      LEFT JOIN public.students s
        ON s.organization_id = b.organization_id
       AND NULLIF(upper(btrim(s.codigo_matricula)),'') = NULLIF(upper(btrim(r.codigo_matricula)),'')
      WHERE b.organization_id = $1
        AND r.status = 'ERROR'
        AND (
          r.error_message ILIKE '%duplicate key%'
          OR r.error_message ILIKE '%duplicad%'
          OR r.error_message ILIKE '%unique%'
          OR r.error_message ILIKE '%já existe%'
        )
      ORDER BY r.created_at DESC;
    `;
    return this.entityManager.query(query, [orgId]);
  }

  async searchStudents(orgId: string, queryParam: string) {
    let q = this.entityManager.createQueryBuilder('students', 's')
      .select(['s.id', 's.nome_completo as nome_completo', 's.cpf', 's.email', 's.codigo_matricula as codigo_matricula', 's.status'])
      .where('s.organization_id = :orgId', { orgId });
      
    if (queryParam) {
      q = q.andWhere('s.nome_completo ILIKE :queryParam', { queryParam: `%${queryParam}%` });
    }
    
    return q.limit(50).getRawMany();
  }

  async getImportBatches(orgId: string) {
    return this.entityManager.find(ImportBatches, {
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' }
    });
  }

  async getImportBatchRows(batchId: string) {
    return this.entityManager.find(ImportBatchRows, {
      where: { batchId: batchId }
    });
  }

  async createImportBatch(payload: any) {
    const entity = this.entityManager.create(ImportBatches, payload);
    return this.entityManager.save(ImportBatches, entity);
  }

  async updateImportBatch(id: string, payload: any) {
    await this.entityManager.update(ImportBatches, id, payload);
    return this.entityManager.findOne(ImportBatches, { where: { id } });
  }

  async insertImportRows(rows: any[]) {
    // Basic bulk insert
    const entities = this.entityManager.create(ImportBatchRows, rows);
    await this.entityManager.save(ImportBatchRows, entities, { chunk: 100 });
    return true;
  }
}
