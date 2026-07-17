import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplates } from '../entities/financial_role_templates.entity';
import { UpdateFinancialRoleTemplatesDto } from '../dto/update-financial_role_templates.dto';

@Injectable()
export class UpdateFinancialRoleTemplatesService {
  constructor(
    @InjectRepository(FinancialRoleTemplates)
    private readonly repository: Repository<FinancialRoleTemplates>,
  ) {}

  async execute(id: string, dto: UpdateFinancialRoleTemplatesDto, organizationId: string): Promise<FinancialRoleTemplates> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
