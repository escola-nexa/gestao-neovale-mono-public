import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransfers } from '../entities/financial_transfers.entity';
import { UpdateFinancialTransfersDto } from '../dto/update-financial_transfers.dto';

@Injectable()
export class UpdateFinancialTransfersService {
  constructor(
    @InjectRepository(FinancialTransfers)
    private readonly repository: Repository<FinancialTransfers>,
  ) {}

  async execute(id: string, dto: UpdateFinancialTransfersDto, organizationId: string): Promise<FinancialTransfers> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
