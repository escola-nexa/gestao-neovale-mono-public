import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schools } from '../entities/schools.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class FindSchoolsService {
  constructor(
    @InjectRepository(Schools)
    private readonly schoolsRepository: Repository<Schools>,
    private readonly dataSource: DataSource,
  ) { }

  async findAll(organizationId: string, status?: string): Promise<Schools[]> {
    const where: any = { organizationId };

    if (status) where.status = status;

    return this.schoolsRepository.find({
      where,
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Schools | null> {
    return this.schoolsRepository.findOne({
      where: { id, organizationId },
    });
  }

  async getName(id: string, organizationId: string): Promise<{ name: string } | null> {
    const school = await this.schoolsRepository.findOne({
      where: { id, organizationId },
      select: ['nome'],
    });
    return school ? { name: school.nome } : null;
  }

  async getCounts(id: string, organizationId: string) {
    // We must ensure the school belongs to the org first
    const school = await this.findOne(id, organizationId);
    if (!school) return null;

    const [enr, slots, cgs, profs, courses] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(student_id) as count FROM enrollments WHERE school_id = $1 AND status = 'ativa'`, [id]),
      this.dataSource.query(`SELECT COUNT(id) as count FROM school_time_slots WHERE school_id = $1 AND status = 'ACTIVE'`, [id]),
      this.dataSource.query(`SELECT COUNT(id) as count FROM class_groups WHERE school_id = $1 AND status = 'ativo'`, [id]),
      this.dataSource.query(`SELECT COUNT(professor_id) as count FROM professor_school_courses WHERE school_id = $1 AND status = 'ACTIVE'`, [id]),
      this.dataSource.query(`SELECT COUNT(course_id) as count FROM course_schools WHERE school_id = $1`, [id]),
    ]);

    return {
      enrollments: parseInt(enr[0].count, 10),
      slots: parseInt(slots[0].count, 10),
      classGroups: parseInt(cgs[0].count, 10),
      professors: parseInt(profs[0].count, 10),
      courses: parseInt(courses[0].count, 10),
    };
  }

  async getSubjectCounts(id: string, organizationId: string) {
    const school = await this.findOne(id, organizationId);
    if (!school) return null;

    const result = await this.dataSource.query(`
      SELECT COUNT(s.id) as count 
      FROM subjects s 
      JOIN course_schools cs ON s.course_id = cs.course_id 
      WHERE cs.school_id = $1
    `, [id]);
    
    return { count: parseInt(result[0].count, 10) };
  }
}
