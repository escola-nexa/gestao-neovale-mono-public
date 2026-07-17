import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplatePermissions } from '../entities/financial_role_template_permissions.entity';

@Injectable()
export class DeleteFinancialRoleTemplatePermissionsService {
  constructor(
    @InjectRepository(FinancialRoleTemplatePermissions)
    private readonly repository: Repository<FinancialRoleTemplatePermissions>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
