import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProfessorSchoolCourses } from '../entities/professor_school_courses.entity';

@Injectable()
export class FindProfessorSchoolCoursesService {
  constructor(
    @InjectRepository(ProfessorSchoolCourses)
    private readonly repository: Repository<ProfessorSchoolCourses>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string, schoolId?: string): Promise<ProfessorSchoolCourses[]> {
    const where: any = { organizationId };
    if (schoolId) where.schoolId = schoolId;

    return this.repository.find({ 
      where,
      relations: ['professor', 'course', 'subject'],
      select: {
        professor: { fullName: true },
        course: { nome: true },
        subject: { nome: true }
      }
    });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorSchoolCourses | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async checkDependencies(payload: any, organizationId: string) {
    // Replicating the logic from check_professor_binding_dependencies RPC
    // It usually checks for class groups, planning, attendances etc.
    // For now we will return an empty array indicating no dependencies,
    // or execute the raw function if it's already in the local pg dump.
    const result = await this.dataSource.query('SELECT * FROM check_professor_binding_dependencies($1)', [JSON.stringify(payload)]);
    return result;
  }
}
