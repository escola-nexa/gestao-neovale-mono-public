import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyTeachingModels } from '../entities/weekly_teaching_models.entity';
import { CreateWeeklyTeachingModelsDto } from '../dto/create-weekly_teaching_models.dto';

@Injectable()
export class CreateWeeklyTeachingModelsService {
  constructor(
    @InjectRepository(WeeklyTeachingModels)
    private readonly repository: Repository<WeeklyTeachingModels>,
  ) {}

  async execute(dto: CreateWeeklyTeachingModelsDto, organizationId: string): Promise<WeeklyTeachingModels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
