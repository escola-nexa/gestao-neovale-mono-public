import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlannings } from '../entities/pre_plannings.entity';
import { CreatePrePlanningsDto } from '../dto/create-pre_plannings.dto';

@Injectable()
export class CreatePrePlanningsService {
  constructor(
    @InjectRepository(PrePlannings)
    private readonly repository: Repository<PrePlannings>,
  ) {}

  async execute(dto: CreatePrePlanningsDto, organizationId: string): Promise<PrePlannings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
