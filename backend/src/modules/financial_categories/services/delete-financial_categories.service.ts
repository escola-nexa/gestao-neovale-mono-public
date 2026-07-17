import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCategories } from '../entities/financial_categories.entity';

@Injectable()
export class DeleteFinancialCategoriesService {
  constructor(
    @InjectRepository(FinancialCategories)
    private readonly repository: Repository<FinancialCategories>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
