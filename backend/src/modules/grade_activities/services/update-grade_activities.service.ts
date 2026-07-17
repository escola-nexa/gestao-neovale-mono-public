import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeActivities } from '../entities/grade_activities.entity';
import { UpdateGradeActivitiesDto } from '../dto/update-grade_activities.dto';

@Injectable()
export class UpdateGradeActivitiesService {
  constructor(
    @InjectRepository(GradeActivities)
    private readonly repository: Repository<GradeActivities>,
  ) {}

  async execute(id: string, dto: UpdateGradeActivitiesDto, organizationId: string): Promise<GradeActivities> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
