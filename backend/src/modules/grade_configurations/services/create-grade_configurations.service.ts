import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeConfigurations } from '../entities/grade_configurations.entity';
import { CreateGradeConfigurationsDto } from '../dto/create-grade_configurations.dto';

@Injectable()
export class CreateGradeConfigurationsService {
  constructor(
    @InjectRepository(GradeConfigurations)
    private readonly repository: Repository<GradeConfigurations>,
  ) {}

  async execute(dto: CreateGradeConfigurationsDto, organizationId: string): Promise<GradeConfigurations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
