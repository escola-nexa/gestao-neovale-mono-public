import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyTeachingModels } from '../entities/weekly_teaching_models.entity';

@Injectable()
export class FindWeeklyTeachingModelsService {
  constructor(
    @InjectRepository(WeeklyTeachingModels)
    private readonly repository: Repository<WeeklyTeachingModels>,
  ) {}

  async findAll(organizationId: string): Promise<WeeklyTeachingModels[]> {
    return this.repository.find({ 
      where: { organizationId } as any,
      select: ['id', 'name', 'isDefault'] as any
    });
  }

  async findOne(id: string, organizationId: string): Promise<WeeklyTeachingModels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
