import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSourceLinks } from '../entities/financial_source_links.entity';

@Injectable()
export class DeleteFinancialSourceLinksService {
  constructor(
    @InjectRepository(FinancialSourceLinks)
    private readonly repository: Repository<FinancialSourceLinks>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
