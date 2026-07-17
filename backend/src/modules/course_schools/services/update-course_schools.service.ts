import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSchools } from '../entities/course_schools.entity';
import { UpdateCourseSchoolsDto } from '../dto/update-course_schools.dto';

@Injectable()
export class UpdateCourseSchoolsService {
  constructor(
    @InjectRepository(CourseSchools)
    private readonly repository: Repository<CourseSchools>,
  ) {}

  async execute(id: string, dto: UpdateCourseSchoolsDto, organizationId: string): Promise<CourseSchools> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
