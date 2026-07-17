import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplates } from '../entities/financial_role_templates.entity';

@Injectable()
export class FindFinancialRoleTemplatesService {
  constructor(
    @InjectRepository(FinancialRoleTemplates)
    private readonly repository: Repository<FinancialRoleTemplates>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialRoleTemplates[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialRoleTemplates | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
