import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransfers } from '../entities/financial_transfers.entity';
import { CreateFinancialTransfersDto } from '../dto/create-financial_transfers.dto';

@Injectable()
export class CreateFinancialTransfersService {
  constructor(
    @InjectRepository(FinancialTransfers)
    private readonly repository: Repository<FinancialTransfers>,
  ) {}

  async execute(dto: CreateFinancialTransfersDto, organizationId: string): Promise<FinancialTransfers> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
