import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserPermissions } from '../entities/financial_user_permissions.entity';

@Injectable()
export class FindFinancialUserPermissionsService {
  constructor(
    @InjectRepository(FinancialUserPermissions)
    private readonly repository: Repository<FinancialUserPermissions>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialUserPermissions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialUserPermissions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
