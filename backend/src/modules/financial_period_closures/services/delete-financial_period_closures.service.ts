import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPeriodClosures } from '../entities/financial_period_closures.entity';

@Injectable()
export class DeleteFinancialPeriodClosuresService {
  constructor(
    @InjectRepository(FinancialPeriodClosures)
    private readonly repository: Repository<FinancialPeriodClosures>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
