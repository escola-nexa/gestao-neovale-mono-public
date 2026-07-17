import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSourceLinks } from '../entities/financial_source_links.entity';
import { CreateFinancialSourceLinksDto } from '../dto/create-financial_source_links.dto';

@Injectable()
export class CreateFinancialSourceLinksService {
  constructor(
    @InjectRepository(FinancialSourceLinks)
    private readonly repository: Repository<FinancialSourceLinks>,
  ) {}

  async execute(dto: CreateFinancialSourceLinksDto, organizationId: string): Promise<FinancialSourceLinks> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
