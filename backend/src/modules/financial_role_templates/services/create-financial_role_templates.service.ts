import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplates } from '../entities/financial_role_templates.entity';
import { CreateFinancialRoleTemplatesDto } from '../dto/create-financial_role_templates.dto';

@Injectable()
export class CreateFinancialRoleTemplatesService {
  constructor(
    @InjectRepository(FinancialRoleTemplates)
    private readonly repository: Repository<FinancialRoleTemplates>,
  ) {}

  async execute(dto: CreateFinancialRoleTemplatesDto, organizationId: string): Promise<FinancialRoleTemplates> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
