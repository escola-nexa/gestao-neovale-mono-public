import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeActivities } from '../entities/grade_activities.entity';
import { CreateGradeActivitiesDto } from '../dto/create-grade_activities.dto';

@Injectable()
export class CreateGradeActivitiesService {
  constructor(
    @InjectRepository(GradeActivities)
    private readonly repository: Repository<GradeActivities>,
  ) {}

  async execute(dto: CreateGradeActivitiesDto, organizationId: string): Promise<GradeActivities> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
