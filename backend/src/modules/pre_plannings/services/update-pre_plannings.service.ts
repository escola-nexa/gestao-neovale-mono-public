import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlannings } from '../entities/pre_plannings.entity';
import { UpdatePrePlanningsDto } from '../dto/update-pre_plannings.dto';

@Injectable()
export class UpdatePrePlanningsService {
  constructor(
    @InjectRepository(PrePlannings)
    private readonly repository: Repository<PrePlannings>,
  ) {}

  async execute(id: string, dto: UpdatePrePlanningsDto, organizationId: string): Promise<PrePlannings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
