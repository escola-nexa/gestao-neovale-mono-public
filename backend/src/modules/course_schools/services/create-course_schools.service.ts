import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSchools } from '../entities/course_schools.entity';
import { CreateCourseSchoolsDto } from '../dto/create-course_schools.dto';

@Injectable()
export class CreateCourseSchoolsService {
  constructor(
    @InjectRepository(CourseSchools)
    private readonly repository: Repository<CourseSchools>,
  ) {}

  async execute(dto: CreateCourseSchoolsDto, organizationId: string): Promise<CourseSchools> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }

  async bulkCreate(rows: any[], organizationId: string): Promise<CourseSchools[]> {
    const records = rows.map(row => this.repository.create({
      ...row,
      organizationId
    } as any));
    return await this.repository.save(records as any);
  }
}
