import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CourseSchools } from '../entities/course_schools.entity';

@Injectable()
export class FindCourseSchoolsService {
  constructor(
    @InjectRepository(CourseSchools)
    private readonly repository: Repository<CourseSchools>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string, schoolId?: string): Promise<CourseSchools[]> {
    const where: any = { organizationId };
    if (schoolId) where.schoolId = schoolId;
    
    return this.repository.find({ 
      where,
      relations: ['course'],
      select: {
        courseId: true,
        course: {
          id: true,
          nome: true,
          codigo: true,
          nivelEnsino: true,
          status: true
        }
      }
    });
  }

  async findOne(id: string, organizationId: string): Promise<CourseSchools | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async checkDependencies(payload: any, organizationId: string) {
    // Replicating the logic from check_course_school_dependencies RPC
    const result = await this.dataSource.query('SELECT * FROM check_course_school_dependencies($1)', [JSON.stringify(payload)]);
    return result;
  }
}
