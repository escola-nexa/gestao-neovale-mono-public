import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class FrequenciaService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getTodayClasses(params: any) {
    const { professorId, weekday, date } = params;

    const models = await this.entityManager.query(`
      SELECT 
        m.id, m.class_group_id, m.subject_id, m.start_time, m.end_time,
        m.school_time_slot_id, m.school_id,
        cg.nome as "classGroupName",
        sub.nome as "subjectName",
        s.nome as "schoolName",
        c.nome as "courseName"
      FROM weekly_teaching_models m
      JOIN class_groups cg ON cg.id::text = m.class_group_id
      JOIN subjects sub ON sub.id::text = m.subject_id
      LEFT JOIN schools s ON s.id::text = m.school_id
      LEFT JOIN courses c ON c.id::text = m.course_id
      WHERE m.professor_id = $1 
        AND m.weekday = $2
        AND m.status = 'ACTIVE'
        AND m.schedule_type = 'CLASS'
        AND m.class_mode = 'PRESENCIAL'
        AND m.class_group_id IS NOT NULL
        AND m.subject_id IS NOT NULL
    `, [professorId, weekday]);

    if (!models || models.length === 0) return { models: [], records: [] };

    const classGroupIds = [...new Set(models.map((m: any) => m.class_group_id))];
    const subjectIds = [...new Set(models.map((m: any) => m.subject_id))];

    const records = await this.entityManager.query(`
      SELECT class_group_id, subject_id, start_time, status
      FROM attendance_records
      WHERE occurrence_date = $1
        AND professor_id = $2
        AND class_group_id = ANY($3)
        AND subject_id = ANY($4)
    `, [date, professorId, classGroupIds, subjectIds]);

    return {
      models: models.map((m: any) => ({
        ...m,
        class_groups: { id: m.class_group_id, nome: m.classGroupName },
        subjects: { id: m.subject_id, nome: m.subjectName },
        schools: { nome: m.schoolName },
        courses: { nome: m.courseName },
      })),
      records: records || []
    };
  }

  async fetchRecords(params: any) {
    const { classGroupId, subjectId, startDate, endDate } = params;
    return this.entityManager.query(`
      SELECT id, student_id, occurrence_date, start_time, status
      FROM attendance_records
      WHERE class_group_id = $1 AND subject_id = $2
        AND occurrence_date >= $3 AND occurrence_date <= $4
    `, [classGroupId, subjectId, startDate, endDate]);
  }

  async upsertRecord(params: any) {
    const { 
      organizationId, classGroupId, subjectId, studentId, professorId, 
      occurrenceDate, startTime, status, callStartedAt, callSubmittedAt, callCreatedBy 
    } = params;

    const insertedData = await this.entityManager.query(`
      INSERT INTO attendance_records (
        organization_id, class_group_id, subject_id, student_id, professor_id,
        occurrence_date, start_time, status, call_started_at, call_submitted_at, call_created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (class_group_id, subject_id, student_id, occurrence_date, start_time) 
      DO UPDATE SET status = EXCLUDED.status, call_submitted_at = EXCLUDED.call_submitted_at
      RETURNING id, teacher_attendance_entry_id
    `, [
      organizationId, classGroupId, subjectId, studentId, professorId,
      occurrenceDate, startTime, status, callStartedAt, callSubmittedAt, callCreatedBy
    ]);

    const inserted = insertedData[0];
    let entry = null;

    if (inserted?.teacher_attendance_entry_id) {
      const entryData = await this.entityManager.query(`
        SELECT final_status, late_minutes FROM teacher_attendance_entries
        WHERE id = $1
      `, [inserted.teacher_attendance_entry_id]);
      entry = entryData[0];
    }

    return { inserted, entry };
  }

  async deleteRecord(params: any) {
    const { classGroupId, subjectId, studentId, date, startTime } = params;
    
    let query = `
      DELETE FROM attendance_records
      WHERE class_group_id = $1 AND subject_id = $2 AND student_id = $3 AND occurrence_date = $4
    `;
    const queryParams: any[] = [classGroupId, subjectId, studentId, date];

    if (startTime) {
      query += ` AND start_time = $5`;
      queryParams.push(startTime);
    } else {
      query += ` AND start_time IS NULL`;
    }

    await this.entityManager.query(query, queryParams);
    return true;
  }

  async getAbsenceAlerts(params: any) {
    const { classGroupId, subjectId } = params;

    const wtmData = await this.entityManager.query(`
      SELECT id FROM weekly_teaching_models
      WHERE class_group_id = $1 AND subject_id = $2 AND status = 'ACTIVE' AND schedule_type = 'CLASS'
    `, [classGroupId, subjectId]);

    const wtmIds = wtmData.map((w: any) => w.id);
    let totalClasses = 0;

    if (wtmIds.length > 0) {
      const classCount = await this.entityManager.query(`
        SELECT COUNT(*) as count FROM annual_class_occurrences
        WHERE weekly_model_id = ANY($1) AND status = 'SCHEDULED'
      `, [wtmIds]);
      totalClasses = parseInt(classCount[0].count, 10) || 0;
    }

    const enrollments = await this.entityManager.query(`
      SELECT e.student_id, s.nome_completo as name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_group_id::text = $1 AND e.status = 'ativa'
    `, [classGroupId]);

    const attendance = await this.entityManager.query(`
      SELECT student_id, status FROM attendance_records
      WHERE class_group_id = $1 AND subject_id = $2 AND status = 'FALTA'
    `, [classGroupId, subjectId]);

    const absenceMap = new Map<string, number>();
    attendance.forEach((a: any) => {
      absenceMap.set(a.student_id, (absenceMap.get(a.student_id) || 0) + 1);
    });

    const result = enrollments.map((e: any) => {
      const absences = absenceMap.get(e.student_id) || 0;
      const pct = totalClasses > 0 ? (absences / totalClasses) * 100 : 0;
      let alert_level = 'none';
      if (pct >= 25) alert_level = 'danger';
      else if (pct >= 20) alert_level = 'warning';

      return {
        student_id: e.student_id,
        student_name: e.name,
        total_absences: absences,
        total_classes: totalClasses,
        absence_percentage: Math.round(pct * 10) / 10,
        alert_level,
      };
    });

    result.sort((a: any, b: any) => b.absence_percentage - a.absence_percentage);
    return result;
  }

  async getSchoolAbsenceAlerts(params: any) {
    const { schoolId } = params;

    const classGroups = await this.entityManager.query(`
      SELECT id, nome FROM class_groups WHERE school_id = $1 AND status = 'ativo'
    `, [schoolId]);

    if (!classGroups || classGroups.length === 0) return [];

    const cgIds = classGroups.map((cg: any) => cg.id);
    const cgNameMap = new Map(classGroups.map((cg: any) => [cg.id, cg.nome]));

    const enrollments = await this.entityManager.query(`
      SELECT e.student_id, e.class_group_id, s.nome_completo as name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_group_id::text = ANY($1) AND e.status = 'ativa'
    `, [cgIds]);

    if (!enrollments || enrollments.length === 0) return [];

    const attendance = await this.entityManager.query(`
      SELECT student_id, class_group_id, status FROM attendance_records
      WHERE class_group_id = ANY($1)
    `, [cgIds]);

    const statsMap = new Map<string, { absences: number; total: number }>();
    attendance.forEach((a: any) => {
      const key = `${a.student_id}-${a.class_group_id}`;
      if (!statsMap.has(key)) statsMap.set(key, { absences: 0, total: 0 });
      const s = statsMap.get(key)!;
      s.total++;
      if (a.status === 'FALTA' || a.status === 'F') s.absences++;
    });

    const result: any[] = [];
    enrollments.forEach((e: any) => {
      const key = `${e.student_id}-${e.class_group_id}`;
      const stats = statsMap.get(key);
      if (!stats || stats.total === 0) return;
      const pct = (stats.absences / stats.total) * 100;
      if (pct < 15) return;

      let alert_level = 'none';
      if (pct >= 25) alert_level = 'danger';
      else if (pct >= 20) alert_level = 'warning';
      else if (pct >= 15) alert_level = 'warning';

      result.push({
        student_id: e.student_id,
        student_name: e.name,
        class_group_name: cgNameMap.get(e.class_group_id) || '',
        total_absences: stats.absences,
        total_records: stats.total,
        absence_percentage: Math.round(pct * 10) / 10,
        alert_level,
      });
    });

    result.sort((a, b) => b.absence_percentage - a.absence_percentage);
    return result;
  }

  async getClassesForDashboard(params: any) {
    const { schoolId, courseId, classGroupId, subjectId, isProfessor, professorId, todayStr } = params;

    let query = `
      SELECT 
        m.class_group_id, m.subject_id,
        cg.id as "cgId", cg.nome as "cgNome",
        sub.id as "subId", sub.nome as "subNome",
        s.nome as "schoolName",
        c.nome as "courseName"
      FROM weekly_teaching_models m
      JOIN class_groups cg ON cg.id::text = m.class_group_id
      JOIN subjects sub ON sub.id::text = m.subject_id
      LEFT JOIN schools s ON s.id::text = m.school_id
      LEFT JOIN courses c ON c.id::text = m.course_id
      WHERE m.school_id = $1
        AND m.status = 'ACTIVE'
        AND m.schedule_type = 'CLASS'
        AND m.class_group_id IS NOT NULL
        AND m.subject_id IS NOT NULL
    `;
    
    const queryParams: any[] = [schoolId];
    let idx = 2;

    if (isProfessor === 'true' && professorId) { query += ` AND m.professor_id = $${idx++}`; queryParams.push(professorId); }
    if (courseId) { query += ` AND m.course_id = $${idx++}`; queryParams.push(courseId); }
    if (classGroupId) { query += ` AND m.class_group_id = $${idx++}`; queryParams.push(classGroupId); }
    if (subjectId) { query += ` AND m.subject_id = $${idx++}`; queryParams.push(subjectId); }

    const data = await this.entityManager.query(query, queryParams);

    const unique = new Map<string, any>();
    data.forEach((d: any) => {
      const key = `${d.class_group_id}-${d.subject_id}`;
      if (!unique.has(key)) {
        unique.set(key, {
          classGroupId: d.cgId,
          classGroupName: d.cgNome,
          subjectId: d.subId,
          subjectName: d.subNome,
          schoolName: d.schoolName || '',
          courseName: d.courseName || '',
        });
      }
    });

    const entries = Array.from(unique.values());
    let doneKeys = new Set<string>();

    if (entries.length > 0) {
      const cgIds = [...new Set(entries.map(r => r.classGroupId))];
      const sjIds = [...new Set(entries.map(r => r.subjectId))];

      const recs = await this.entityManager.query(`
        SELECT class_group_id, subject_id FROM attendance_records
        WHERE occurrence_date = $1 AND class_group_id = ANY($2) AND subject_id = ANY($3)
      `, [todayStr, cgIds, sjIds]);

      recs.forEach((r: any) => doneKeys.add(`${r.class_group_id}-${r.subject_id}`));
    }

    return { entries, doneKeys: Array.from(doneKeys) };
  }

  async getTimeSlots(params: any) {
    const { classGroupId, subjectId, professorId } = params;

    let query = `
      SELECT weekday, start_time, end_time FROM weekly_teaching_models
      WHERE class_group_id = $1 AND subject_id = $2 AND status = 'ACTIVE' AND schedule_type = 'CLASS'
    `;
    const queryParams: any[] = [classGroupId, subjectId];

    if (professorId) {
      query += ` AND professor_id = $3`;
      queryParams.push(professorId);
    }

    return this.entityManager.query(query, queryParams);
  }

  async getStudents(params: any) {
    const { classGroupId } = params;
    
    const enrollments = await this.entityManager.query(`
      SELECT s.id, s.nome_completo as name 
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_group_id = $1 AND e.status = 'ativa'
      ORDER BY s.nome_completo ASC
    `, [classGroupId]);

    return enrollments.map((e: any) => ({
      id: e.id,
      nome_completo: e.name,
    }));
  }
}
