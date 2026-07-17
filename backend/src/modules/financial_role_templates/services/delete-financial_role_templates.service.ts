import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplates } from '../entities/financial_role_templates.entity';

@Injectable()
export class DeleteFinancialRoleTemplatesService {
  constructor(
    @InjectRepository(FinancialRoleTemplates)
    private readonly repository: Repository<FinancialRoleTemplates>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
