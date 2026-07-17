import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCategories } from '../entities/financial_categories.entity';
import { CreateFinancialCategoriesDto } from '../dto/create-financial_categories.dto';

@Injectable()
export class CreateFinancialCategoriesService {
  constructor(
    @InjectRepository(FinancialCategories)
    private readonly repository: Repository<FinancialCategories>,
  ) {}

  async execute(dto: CreateFinancialCategoriesDto, organizationId: string): Promise<FinancialCategories> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
