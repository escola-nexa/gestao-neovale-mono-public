import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSourceLinks } from '../entities/financial_source_links.entity';

@Injectable()
export class FindFinancialSourceLinksService {
  constructor(
    @InjectRepository(FinancialSourceLinks)
    private readonly repository: Repository<FinancialSourceLinks>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialSourceLinks[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialSourceLinks | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
