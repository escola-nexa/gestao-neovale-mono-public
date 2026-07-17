import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorSchoolCourses } from '../entities/professor_school_courses.entity';
import { UpdateProfessorSchoolCoursesDto } from '../dto/update-professor_school_courses.dto';

@Injectable()
export class UpdateProfessorSchoolCoursesService {
  constructor(
    @InjectRepository(ProfessorSchoolCourses)
    private readonly repository: Repository<ProfessorSchoolCourses>,
  ) {}

  async execute(id: string, dto: UpdateProfessorSchoolCoursesDto, organizationId: string): Promise<ProfessorSchoolCourses> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
