import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialParties } from '../entities/financial_parties.entity';

@Injectable()
export class DeleteFinancialPartiesService {
  constructor(
    @InjectRepository(FinancialParties)
    private readonly repository: Repository<FinancialParties>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
