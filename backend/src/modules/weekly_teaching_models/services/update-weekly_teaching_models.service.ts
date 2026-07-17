import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyTeachingModels } from '../entities/weekly_teaching_models.entity';
import { UpdateWeeklyTeachingModelsDto } from '../dto/update-weekly_teaching_models.dto';

@Injectable()
export class UpdateWeeklyTeachingModelsService {
  constructor(
    @InjectRepository(WeeklyTeachingModels)
    private readonly repository: Repository<WeeklyTeachingModels>,
  ) {}

  async execute(id: string, dto: UpdateWeeklyTeachingModelsDto, organizationId: string): Promise<WeeklyTeachingModels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
