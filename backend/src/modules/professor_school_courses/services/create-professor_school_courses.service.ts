import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorSchoolCourses } from '../entities/professor_school_courses.entity';
import { CreateProfessorSchoolCoursesDto } from '../dto/create-professor_school_courses.dto';

@Injectable()
export class CreateProfessorSchoolCoursesService {
  constructor(
    @InjectRepository(ProfessorSchoolCourses)
    private readonly repository: Repository<ProfessorSchoolCourses>,
  ) {}

  async execute(dto: CreateProfessorSchoolCoursesDto, organizationId: string): Promise<ProfessorSchoolCourses> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }

  async bulkCreate(rows: any[], organizationId: string): Promise<ProfessorSchoolCourses[]> {
    const records = rows.map(row => this.repository.create({
      ...row,
      organizationId
    } as any));
    return await this.repository.save(records as any);
  }
}
