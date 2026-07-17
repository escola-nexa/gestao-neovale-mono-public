import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransfers } from '../entities/financial_transfers.entity';

@Injectable()
export class DeleteFinancialTransfersService {
  constructor(
    @InjectRepository(FinancialTransfers)
    private readonly repository: Repository<FinancialTransfers>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
