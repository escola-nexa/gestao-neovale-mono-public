import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeActivities } from '../entities/grade_activities.entity';

@Injectable()
export class DeleteGradeActivitiesService {
  constructor(
    @InjectRepository(GradeActivities)
    private readonly repository: Repository<GradeActivities>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
