import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialParties } from '../entities/financial_parties.entity';
import { UpdateFinancialPartiesDto } from '../dto/update-financial_parties.dto';

@Injectable()
export class UpdateFinancialPartiesService {
  constructor(
    @InjectRepository(FinancialParties)
    private readonly repository: Repository<FinancialParties>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPartiesDto, organizationId: string): Promise<FinancialParties> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
