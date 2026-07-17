import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeConfigurations } from '../entities/grade_configurations.entity';
import { UpdateGradeConfigurationsDto } from '../dto/update-grade_configurations.dto';

@Injectable()
export class UpdateGradeConfigurationsService {
  constructor(
    @InjectRepository(GradeConfigurations)
    private readonly repository: Repository<GradeConfigurations>,
  ) {}

  async execute(id: string, dto: UpdateGradeConfigurationsDto, organizationId: string): Promise<GradeConfigurations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
