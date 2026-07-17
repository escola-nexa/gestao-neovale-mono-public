import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCategories } from '../entities/financial_categories.entity';
import { UpdateFinancialCategoriesDto } from '../dto/update-financial_categories.dto';

@Injectable()
export class UpdateFinancialCategoriesService {
  constructor(
    @InjectRepository(FinancialCategories)
    private readonly repository: Repository<FinancialCategories>,
  ) {}

  async execute(id: string, dto: UpdateFinancialCategoriesDto, organizationId: string): Promise<FinancialCategories> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
