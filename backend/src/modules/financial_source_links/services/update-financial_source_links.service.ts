import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSourceLinks } from '../entities/financial_source_links.entity';
import { UpdateFinancialSourceLinksDto } from '../dto/update-financial_source_links.dto';

@Injectable()
export class UpdateFinancialSourceLinksService {
  constructor(
    @InjectRepository(FinancialSourceLinks)
    private readonly repository: Repository<FinancialSourceLinks>,
  ) {}

  async execute(id: string, dto: UpdateFinancialSourceLinksDto, organizationId: string): Promise<FinancialSourceLinks> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
