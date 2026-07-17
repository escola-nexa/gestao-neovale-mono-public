import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplatePermissions } from '../entities/financial_role_template_permissions.entity';

@Injectable()
export class FindFinancialRoleTemplatePermissionsService {
  constructor(
    @InjectRepository(FinancialRoleTemplatePermissions)
    private readonly repository: Repository<FinancialRoleTemplatePermissions>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialRoleTemplatePermissions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialRoleTemplatePermissions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
