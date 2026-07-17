import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRoleTemplatePermissions } from '../entities/financial_role_template_permissions.entity';
import { UpdateFinancialRoleTemplatePermissionsDto } from '../dto/update-financial_role_template_permissions.dto';

@Injectable()
export class UpdateFinancialRoleTemplatePermissionsService {
  constructor(
    @InjectRepository(FinancialRoleTemplatePermissions)
    private readonly repository: Repository<FinancialRoleTemplatePermissions>,
  ) {}

  async execute(id: string, dto: UpdateFinancialRoleTemplatePermissionsDto, organizationId: string): Promise<FinancialRoleTemplatePermissions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
