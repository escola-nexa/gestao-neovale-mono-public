import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissions } from '../entities/financial_permissions.entity';

@Injectable()
export class FindFinancialPermissionsService {
  constructor(
    @InjectRepository(FinancialPermissions)
    private readonly repository: Repository<FinancialPermissions>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPermissions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPermissions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
