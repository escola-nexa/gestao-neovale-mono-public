import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSchools } from '../entities/course_schools.entity';

@Injectable()
export class DeleteCourseSchoolsService {
  constructor(
    @InjectRepository(CourseSchools)
    private readonly repository: Repository<CourseSchools>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }

  async bulkDeleteBySchool(courseIds: string[], schoolId: string, organizationId: string): Promise<void> {
    const records = await this.repository.createQueryBuilder('cs')
      .where('cs.school_id = :schoolId', { schoolId })
      .andWhere('cs.course_id IN (:...courseIds)', { courseIds })
      .getMany();
      
    if (records.length > 0) {
      await this.repository.remove(records);
    }
  }
}
