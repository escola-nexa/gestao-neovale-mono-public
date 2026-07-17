import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeActivities } from '../entities/grade_activities.entity';

@Injectable()
export class FindGradeActivitiesService {
  constructor(
    @InjectRepository(GradeActivities)
    private readonly repository: Repository<GradeActivities>,
  ) {}

  async findAll(organizationId?: string, gradeConfigId?: string): Promise<GradeActivities[]> {
    const where: any = {};
    if (gradeConfigId) where.gradeConfigId = gradeConfigId;
    return this.repository.find({ where, order: { displayOrder: 'ASC' } as any });
  }

  async findOne(id: string): Promise<GradeActivities | null> {
    return this.repository.findOne({ where: { id } });
  }
}
