import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeConfigurations } from '../entities/grade_configurations.entity';

@Injectable()
export class FindGradeConfigurationsService {
  constructor(
    @InjectRepository(GradeConfigurations)
    private readonly repository: Repository<GradeConfigurations>,
  ) {}

  async findAll(organizationId: string): Promise<GradeConfigurations[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<GradeConfigurations | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
