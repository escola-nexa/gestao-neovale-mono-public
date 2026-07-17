import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlannings } from '../entities/pre_plannings.entity';

@Injectable()
export class DeletePrePlanningsService {
  constructor(
    @InjectRepository(PrePlannings)
    private readonly repository: Repository<PrePlannings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
