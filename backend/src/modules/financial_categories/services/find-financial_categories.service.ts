import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCategories } from '../entities/financial_categories.entity';

@Injectable()
export class FindFinancialCategoriesService {
  constructor(
    @InjectRepository(FinancialCategories)
    private readonly repository: Repository<FinancialCategories>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialCategories[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialCategories | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
