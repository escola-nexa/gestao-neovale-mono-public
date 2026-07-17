import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissions } from '../entities/financial_permissions.entity';
import { CreateFinancialPermissionsDto } from '../dto/create-financial_permissions.dto';

@Injectable()
export class CreateFinancialPermissionsService {
  constructor(
    @InjectRepository(FinancialPermissions)
    private readonly repository: Repository<FinancialPermissions>,
  ) {}

  async execute(dto: CreateFinancialPermissionsDto, organizationId: string): Promise<FinancialPermissions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
