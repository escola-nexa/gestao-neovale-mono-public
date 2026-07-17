import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeConfigurations } from '../entities/grade_configurations.entity';

@Injectable()
export class DeleteGradeConfigurationsService {
  constructor(
    @InjectRepository(GradeConfigurations)
    private readonly repository: Repository<GradeConfigurations>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
