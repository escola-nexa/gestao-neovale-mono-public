import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyTeachingModels } from '../entities/weekly_teaching_models.entity';

@Injectable()
export class DeleteWeeklyTeachingModelsService {
  constructor(
    @InjectRepository(WeeklyTeachingModels)
    private readonly repository: Repository<WeeklyTeachingModels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
