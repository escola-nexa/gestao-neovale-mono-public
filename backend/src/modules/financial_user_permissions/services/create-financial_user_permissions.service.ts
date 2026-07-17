import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserPermissions } from '../entities/financial_user_permissions.entity';
import { CreateFinancialUserPermissionsDto } from '../dto/create-financial_user_permissions.dto';

@Injectable()
export class CreateFinancialUserPermissionsService {
  constructor(
    @InjectRepository(FinancialUserPermissions)
    private readonly repository: Repository<FinancialUserPermissions>,
  ) {}

  async execute(dto: CreateFinancialUserPermissionsDto, organizationId: string): Promise<FinancialUserPermissions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
