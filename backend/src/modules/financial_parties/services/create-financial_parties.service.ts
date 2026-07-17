import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialParties } from '../entities/financial_parties.entity';
import { CreateFinancialPartiesDto } from '../dto/create-financial_parties.dto';

@Injectable()
export class CreateFinancialPartiesService {
  constructor(
    @InjectRepository(FinancialParties)
    private readonly repository: Repository<FinancialParties>,
  ) {}

  async execute(dto: CreateFinancialPartiesDto, organizationId: string): Promise<FinancialParties> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
