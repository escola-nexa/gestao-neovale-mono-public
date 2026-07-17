import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplatePermissions } from '../entities/financial_role_template_permissions.entity';
import { CreateFinancialRoleTemplatePermissionsDto } from '../dto/create-financial_role_template_permissions.dto';

@Injectable()
export class CreateFinancialRoleTemplatePermissionsService {
  constructor(
    @InjectRepository(FinancialRoleTemplatePermissions)
    private readonly repository: Repository<FinancialRoleTemplatePermissions>,
  ) {}

  async execute(dto: CreateFinancialRoleTemplatePermissionsDto, organizationId: string): Promise<FinancialRoleTemplatePermissions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
