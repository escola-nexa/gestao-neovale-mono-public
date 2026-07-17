import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Courses } from '../entities/courses.entity';

@Injectable()
export class FindCoursesService {
  constructor(
    @InjectRepository(Courses)
    private readonly repository: Repository<Courses>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string): Promise<Courses[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Courses | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async getEnrollmentCounts(courseIds: string[], schoolId: string, organizationId: string) {
    if (!courseIds || courseIds.length === 0) return [];
    
    // Simulating count from class groups -> enrollments
    const result = await this.dataSource.query(`
      SELECT c.course_id, count(e.student_id) as total_enrollments
      FROM class_groups c
      JOIN enrollments e ON c.id = e.class_group_id
      WHERE c.school_id = $1 AND c.course_id = ANY($2)
      AND e.status = 'ativa'
      GROUP BY c.course_id
    `, [schoolId, courseIds]);

    return result.map(row => ({
      course_id: row.course_id,
      total_enrollments: parseInt(row.total_enrollments, 10)
    }));
  }
}
