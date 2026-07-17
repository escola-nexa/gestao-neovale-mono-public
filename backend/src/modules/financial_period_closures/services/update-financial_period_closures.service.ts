import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPeriodClosures } from '../entities/financial_period_closures.entity';
import { UpdateFinancialPeriodClosuresDto } from '../dto/update-financial_period_closures.dto';

@Injectable()
export class UpdateFinancialPeriodClosuresService {
  constructor(
    @InjectRepository(FinancialPeriodClosures)
    private readonly repository: Repository<FinancialPeriodClosures>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPeriodClosuresDto, organizationId: string): Promise<FinancialPeriodClosures> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
