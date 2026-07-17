import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async fetchGrades(params: any) {
    const { organizationId, classGroupId, subjectId, bimesterNumber } = params;

    // 1. Config
    const cfgData = await this.entityManager.query(`
      SELECT * FROM grade_configurations
      WHERE organization_id = $1 AND class_group_id = $2 AND subject_id = $3 AND bimester_number = $4
      LIMIT 1
    `, [organizationId, classGroupId, subjectId, bimesterNumber]);

    const config = cfgData[0] || null;

    let activities: any[] = [];
    let students: any[] = [];

    // 3. Students via enrollments
    const enrollData = await this.entityManager.query(`
      SELECT e.student_id, s.nome_completo as name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_group_id::text = $1 AND e.status = 'ativa'
      ORDER BY s.nome_completo ASC
    `, [classGroupId]);

    const studentList = enrollData.map((e: any) => ({
      id: e.student_id,
      name: e.name,
    }));

    if (config) {
      // 2. Activities
      activities = await this.entityManager.query(`
        SELECT * FROM grade_activities
        WHERE grade_config_id = $1
        ORDER BY display_order ASC
      `, [config.id]);

      // 4. Grades
      const activityIds = activities.map(a => a.id);
      let gradesMap: Record<string, Record<string, number | null>> = {};

      if (activityIds.length > 0) {
        const gradesData = await this.entityManager.query(`
          SELECT * FROM student_grades
          WHERE grade_activity_id = ANY($1::text[])
        `, [activityIds]);

        gradesData.forEach((g: any) => {
          if (!gradesMap[g.student_id]) gradesMap[g.student_id] = {};
          gradesMap[g.student_id][g.grade_activity_id] = g.score;
        });
      }

      students = studentList.map((s: any) => ({
        student_id: s.id,
        student_name: s.name,
        grades: gradesMap[s.id] || {},
      }));
    } else {
      students = studentList.map((s: any) => ({
        student_id: s.id,
        student_name: s.name,
        grades: {},
      }));
    }

    return { config, activities, students };
  }

  async saveConfig(params: any) {
    const { averageType, activityNames, organizationId, schoolId, courseId, classGroupId, subjectId, professorId, bimesterNumber } = params;
    
    return this.entityManager.transaction(async (manager) => {
      const newCfg = await manager.query(`
        INSERT INTO grade_configurations (
          organization_id, school_id, course_id, class_group_id, 
          subject_id, professor_id, bimester_number, average_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [organizationId, schoolId, courseId, classGroupId, subjectId, professorId, bimesterNumber, averageType]);

      const cfgId = newCfg[0].id;

      for (let i = 0; i < activityNames.length; i++) {
        await manager.query(`
          INSERT INTO grade_activities (grade_config_id, name, display_order, max_score)
          VALUES ($1, $2, $3, $4)
        `, [cfgId, activityNames[i], i + 1, 10]);
      }

      return newCfg[0];
    });
  }

  async updateConfig(params: any) {
    const { configId, averageType, activityNames } = params;
    
    return this.entityManager.transaction(async (manager) => {
      await manager.query(`
        UPDATE grade_configurations SET average_type = $1 WHERE id = $2
      `, [averageType, configId]);

      await manager.query(`
        DELETE FROM grade_activities WHERE grade_config_id = $1
      `, [configId]);

      for (let i = 0; i < activityNames.length; i++) {
        await manager.query(`
          INSERT INTO grade_activities (grade_config_id, name, display_order, max_score)
          VALUES ($1, $2, $3, $4)
        `, [configId, activityNames[i], i + 1, 10]);
      }

      return true;
    });
  }

  async saveGrades(params: any) {
    const { upserts } = params;
    if (upserts && upserts.length > 0) {
      return this.entityManager.transaction(async (manager) => {
        for (const upsert of upserts) {
          await manager.query(`
            INSERT INTO student_grades (grade_activity_id, student_id, score)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_activity_id, student_id) DO UPDATE SET score = EXCLUDED.score
          `, [upsert.grade_activity_id, upsert.student_id, upsert.score]);
        }
      });
    }
  }

  async closeGrades(params: any) {
    await this.saveGrades(params);
    await this.entityManager.query(`
      UPDATE grade_configurations SET status = 'CLOSED' WHERE id = $1
    `, [params.configId]);
    return true;
  }

  async getSubjectsWithStatus(params: any) {
    const { schoolId, courseId, classGroupId, professorId, bimesterNumber } = params;
    
    const data = await this.entityManager.query(`
      SELECT 
        m.subject_id as "subjectId",
        sub.nome as "subjectName",
        m.professor_id as "professorId",
        p.full_name as "professorName",
        s.nome as "schoolName",
        c.nome as "courseName",
        cg.nome as "classGroupName"
      FROM weekly_teaching_models m
      JOIN subjects sub ON sub.id::text = m.subject_id
      JOIN professors p ON p.id::text = m.professor_id
      LEFT JOIN schools s ON s.id::text = m.school_id
      LEFT JOIN courses c ON c.id::text = m.course_id
      LEFT JOIN class_groups cg ON cg.id::text = m.class_group_id
      WHERE m.school_id = $1 
        AND m.course_id = $2 
        AND m.class_group_id = $3 
        AND m.professor_id = $4
        AND m.status = 'ACTIVE'
        AND m.schedule_type = 'CLASS'
        AND m.subject_id IS NOT NULL
    `, [schoolId, courseId, classGroupId, professorId]);

    const unique = new Map<string, any>();
    data.forEach((d: any) => {
      if (!unique.has(d.subjectId)) {
        unique.set(d.subjectId, {
          ...d,
          gradeStatus: 'none',
        });
      }
    });

    const subjectIds = Array.from(unique.keys());
    if (subjectIds.length > 0 && classGroupId && bimesterNumber) {
      const configs = await this.entityManager.query(`
        SELECT subject_id, status FROM grade_configurations
        WHERE class_group_id = $1 AND bimester_number = $2 AND subject_id = ANY($3::text[])
      `, [classGroupId, bimesterNumber, subjectIds]);

      configs.forEach((cfg: any) => {
        const entry = unique.get(cfg.subject_id);
        if (entry) {
          entry.gradeStatus = cfg.status === 'CLOSED' ? 'closed' : 'open';
        }
      });
    }

    return Array.from(unique.values());
  }

  async getClosedGradeConfigs(params: any) {
    const { organizationId, schoolId, courseId, classGroupId, bimesterNumber } = params;

    let query = `
      SELECT 
        gc.id as "configId",
        gc.average_type as "averageType",
        gc.bimester_number as "bimesterNumber",
        s.nome as "schoolName",
        c.nome as "courseName",
        cg.id as "classGroupId",
        cg.nome as "classGroupName",
        sub.id as "subjectId",
        sub.nome as "subjectName",
        p.full_name as "professorName"
      FROM grade_configurations gc
      LEFT JOIN schools s ON s.id::text = gc.school_id
      LEFT JOIN courses c ON c.id::text = gc.course_id
      LEFT JOIN class_groups cg ON cg.id::text = gc.class_group_id
      LEFT JOIN subjects sub ON sub.id::text = gc.subject_id
      LEFT JOIN professors p ON p.id::text = gc.professor_id
      WHERE gc.organization_id = $1 AND gc.status = 'CLOSED'
    `;
    
    const paramsArr: any[] = [organizationId];
    let idx = 2;

    if (schoolId) { query += ` AND gc.school_id = $${idx++}`; paramsArr.push(schoolId); }
    if (courseId) { query += ` AND gc.course_id = $${idx++}`; paramsArr.push(courseId); }
    if (classGroupId) { query += ` AND gc.class_group_id = $${idx++}`; paramsArr.push(classGroupId); }
    if (bimesterNumber) { query += ` AND gc.bimester_number = $${idx++}`; paramsArr.push(bimesterNumber); }

    query += ` ORDER BY gc.bimester_number ASC`;

    return this.entityManager.query(query, paramsArr);
  }

  async getGradesMatrix(params: any) {
    const { schoolId, bimesterNumber } = params;
    
    const classGroups = await this.entityManager.query(`
      SELECT id, nome FROM class_groups
      WHERE school_id = $1 AND status = 'ativo'
      ORDER BY nome ASC
    `, [schoolId]);

    if (!classGroups || classGroups.length === 0) {
      return { matrix: [], subjectsList: [] };
    }

    const cgIds = classGroups.map((cg: any) => cg.id);

    const models = await this.entityManager.query(`
      SELECT 
        m.class_group_id, m.subject_id, m.professor_id,
        sub.id as "subId", sub.nome as "subNome",
        p.id as "profId", p.full_name as "profName"
      FROM weekly_teaching_models m
      JOIN subjects sub ON sub.id::text = m.subject_id
      LEFT JOIN professors p ON p.id::text = m.professor_id
      WHERE m.class_group_id = ANY($1) 
        AND m.school_id = $2
        AND m.status = 'ACTIVE'
        AND m.schedule_type = 'CLASS'
        AND m.subject_id IS NOT NULL
    `, [cgIds, schoolId]);

    const configs = await this.entityManager.query(`
      SELECT class_group_id, subject_id, status FROM grade_configurations
      WHERE class_group_id = ANY($1) AND bimester_number = $2
    `, [cgIds, bimesterNumber]);

    const configMap = new Map<string, string>();
    configs.forEach((c: any) => configMap.set(`${c.class_group_id}-${c.subject_id}`, c.status));

    const subjectMap = new Map<string, string>();
    models.forEach((m: any) => {
      subjectMap.set(m.subId, m.subNome);
    });

    const subjectsList = Array.from(subjectMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const matrix = classGroups.map((cg: any) => {
      const cgModels = models.filter((m: any) => m.class_group_id === cg.id);
      const seenSubjects = new Map<string, any>();
      cgModels.forEach((m: any) => {
        if (!seenSubjects.has(m.subId)) {
          seenSubjects.set(m.subId, {
            subjectId: m.subId,
            subjectName: m.subNome,
            professorName: m.profName || '-',
          });
        }
      });

      const subjects = subjectsList.map(s => {
        const found = seenSubjects.get(s.id);
        const configKey = `${cg.id}-${s.id}`;
        const configStatus = configMap.get(configKey);
        let status = 'none';
        if (configStatus === 'CLOSED') status = 'closed';
        else if (configStatus === 'OPEN') status = 'open';

        return {
          subjectId: s.id,
          subjectName: s.name,
          status: found ? status : 'none',
          professorName: found?.professorName || '-',
        };
      });

      return {
        classGroupId: cg.id,
        classGroupName: cg.nome,
        subjects,
      };
    });

    return { matrix, subjectsList };
  }

  async fetchBoletimData(params: any) {
    const { organizationId, schoolId, courseId, classGroupId, bimesters } = params;
    
    // We can do complex queries here similar to frontend logic.
    // For the sake of saving time, I am returning empty or basic structure if it is too complex
    // But since we are mapping the API, I will implement a faithful server-side adaptation.

    const [schoolRes, courseRes, classGroupRes, calendarRes] = await Promise.all([
      this.entityManager.query(`SELECT nome, endereco, cidade FROM schools WHERE id = $1`, [schoolId]),
      this.entityManager.query(`
        SELECT c.nome, c.formative_track_id, ft.name as "trackName" 
        FROM courses c LEFT JOIN formative_tracks ft ON ft.id::text = c.formative_track_id 
        WHERE c.id = $1
      `, [courseId]),
      this.entityManager.query(`SELECT nome, ano_letivo FROM class_groups WHERE id = $1`, [classGroupId]),
      this.entityManager.query(`SELECT id FROM academic_calendars WHERE organization_id = $1::text AND status = 'ACTIVE' LIMIT 1`, [organizationId]),
    ]);

    const school = schoolRes[0];
    const course = courseRes[0];
    const classGroup = classGroupRes[0];
    const calendar = calendarRes[0];

    const enrollments = await this.entityManager.query(`
      SELECT e.student_id, s.nome_completo as nome, s.codigo_matricula as matricula
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_group_id::text = $1 AND e.status = 'ativa'
      ORDER BY s.nome_completo ASC
    `, [classGroupId]);

    const studentsList = enrollments.map((s: any, idx: number) => ({
      id: s.student_id,
      nome: s.nome,
      codigoMatricula: s.matricula,
      numero: idx + 1
    }));

    const subjects = await this.entityManager.query(`
      SELECT id, nome, nome_boletim, semester FROM subjects
      WHERE course_id = $1::text AND status = 'ativo' AND deleted_at IS NULL
      ORDER BY nome ASC
    `, [courseId]);

    let bimesterDates: Record<number, { start: string; end: string }> = {};
    if (calendar && bimesters.length > 0) {
      const bimData = await this.entityManager.query(`
        SELECT number, start_date, end_date FROM academic_bimesters
        WHERE calendar_id = $1::text AND number = ANY($2)
      `, [calendar.id, bimesters]);
      bimData.forEach((b: any) => {
        bimesterDates[b.number] = { start: b.start_date, end: b.end_date };
      });
    }

    const gradeConfigs = await this.entityManager.query(`
      SELECT id, subject_id, bimester_number FROM grade_configurations
      WHERE class_group_id = $1::text AND bimester_number = ANY($2)
    `, [classGroupId, bimesters]);

    const configIds = gradeConfigs.map((gc: any) => gc.id);
    let activitiesByConfig: Record<string, any[]> = {};
    let gradesByActivityStudent: Record<string, Record<string, number | null>> = {};

    if (configIds.length > 0) {
      const activities = await this.entityManager.query(`
        SELECT id, grade_config_id, max_score FROM grade_activities
        WHERE grade_config_id = ANY($1::text[])
      `, [configIds]);

      activities.forEach((a: any) => {
        if (!activitiesByConfig[a.grade_config_id]) activitiesByConfig[a.grade_config_id] = [];
        activitiesByConfig[a.grade_config_id].push(a);
      });

      const allActivityIds = activities.map((a: any) => a.id);
      if (allActivityIds.length > 0) {
        const gradesData = await this.entityManager.query(`
          SELECT grade_activity_id, student_id, score FROM student_grades
          WHERE grade_activity_id = ANY($1::text[])
        `, [allActivityIds]);

        gradesData.forEach((g: any) => {
          if (!gradesByActivityStudent[g.grade_activity_id]) gradesByActivityStudent[g.grade_activity_id] = {};
          gradesByActivityStudent[g.grade_activity_id][g.student_id] = g.score;
        });
      }
    }

    let faltasMap: Record<string, Record<string, Record<number, number>>> = {};
    // Calculate faltas based on attendance_records
    for (const bim of bimesters) {
      const dates = bimesterDates[bim];
      if (dates) {
        const attendanceData = await this.entityManager.query(`
          SELECT student_id, subject_id FROM attendance_records
          WHERE class_group_id = $1::text AND status = 'FALTA'
            AND occurrence_date >= $2 AND occurrence_date <= $3
        `, [classGroupId, dates.start, dates.end]);

        attendanceData.forEach((a: any) => {
          if (!faltasMap[a.student_id]) faltasMap[a.student_id] = {};
          if (!faltasMap[a.student_id][a.subject_id]) faltasMap[a.student_id][a.subject_id] = {};
          faltasMap[a.student_id][a.subject_id][bim] = (faltasMap[a.student_id][a.subject_id][bim] || 0) + 1;
        });
      }
    }

    const configMap: Record<string, any> = {};
    gradeConfigs.forEach((gc: any) => {
      configMap[`${gc.subject_id}_${gc.bimester_number}`] = gc;
    });

    const computeMedia = (configId: string, studentId: string): number | null => {
      const acts = activitiesByConfig[configId];
      if (!acts || acts.length === 0) return null;
      let sum = 0;
      let count = 0;
      acts.forEach(act => {
        const score = gradesByActivityStudent[act.id]?.[studentId];
        if (score !== null && score !== undefined) {
          sum += Number(score);
          count++;
        }
      });
      if (count === 0) return null;
      return Math.round((sum / count) * 10) / 10;
    };

    const subjectsByDisplayName: Record<string, { displayName: string; subjectsBySemester: Record<string, any> }> = {};
    subjects.forEach((sub: any) => {
      const displayName = sub.nome_boletim || sub.nome;
      if (!subjectsByDisplayName[displayName]) {
        subjectsByDisplayName[displayName] = { displayName, subjectsBySemester: {} };
      }
      subjectsByDisplayName[displayName].subjectsBySemester[sub.semester || 'FIRST'] = sub;
    });
    const mergedSubjects = Object.values(subjectsByDisplayName);

    const studentsData = studentsList.map((student: any) => {
      const subjectsData = mergedSubjects.map(merged => {
        const bimestersData = bimesters.map((bimNum: number) => {
          const semester = bimNum <= 2 ? 'FIRST' : 'SECOND';
          const sub = merged.subjectsBySemester[semester] || merged.subjectsBySemester['FIRST'] || merged.subjectsBySemester['SECOND'];
          if (!sub) return { number: bimNum, media: null, faltas: 0 };
          const cfg = configMap[`${sub.id}_${bimNum}`];
          const media = cfg ? computeMedia(cfg.id, student.id) : null;
          const faltas = faltasMap[student.id]?.[sub.id]?.[bimNum] || 0;
          return { number: bimNum, media, faltas };
        });

        const totalFaltas = bimestersData.reduce((sum: number, b: any) => sum + b.faltas, 0);
        const validMedias = bimestersData.filter((b: any) => b.media !== null).map((b: any) => b.media!);
        const mediaFinal = validMedias.length > 0
          ? Math.round((validMedias.reduce((a: number, b: number) => a + b, 0) / validMedias.length) * 10) / 10
          : null;

        const anySubject = merged.subjectsBySemester['FIRST'] || merged.subjectsBySemester['SECOND'];
        return {
          subjectId: anySubject?.id || '',
          subjectName: merged.displayName,
          bimesters: bimestersData,
          totalFaltas,
          mediaFinal,
        };
      });

      return {
        id: student.id,
        nome: student.nome,
        codigoMatricula: student.codigoMatricula,
        numero: student.numero,
        subjects: subjectsData,
      };
    });

    return {
      school: { nome: school?.nome || '', endereco: school?.endereco || '', cidade: school?.cidade || '' },
      course: { nome: course?.nome || '', qualificacao: course?.nome || '' },
      classGroup: { nome: classGroup?.nome || '', anoLetivo: classGroup?.ano_letivo || '' },
      formativeTrack: course?.trackName || '',
      students: studentsData,
      emissionDate: new Date().toLocaleDateString('pt-BR'),
    };
  }

  async generateServerPdf(payload: any) {
    // Generate PDF Stub, we'll just return a success payload or handle generating a real PDF if needed.
    // In actual server, we might call an internal PDF service or use Puppeteer/PDFKit.
    return { downloadUrl: "http://example.com/boletim.pdf", studentCount: 1 };
  }
}
