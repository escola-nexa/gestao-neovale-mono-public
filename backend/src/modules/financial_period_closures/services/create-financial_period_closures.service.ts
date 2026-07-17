import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPeriodClosures } from '../entities/financial_period_closures.entity';
import { CreateFinancialPeriodClosuresDto } from '../dto/create-financial_period_closures.dto';

@Injectable()
export class CreateFinancialPeriodClosuresService {
  constructor(
    @InjectRepository(FinancialPeriodClosures)
    private readonly repository: Repository<FinancialPeriodClosures>,
  ) {}

  async execute(dto: CreateFinancialPeriodClosuresDto, organizationId: string): Promise<FinancialPeriodClosures> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
