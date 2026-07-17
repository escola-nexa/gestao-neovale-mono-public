import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissions } from '../entities/financial_permissions.entity';
import { UpdateFinancialPermissionsDto } from '../dto/update-financial_permissions.dto';

@Injectable()
export class UpdateFinancialPermissionsService {
  constructor(
    @InjectRepository(FinancialPermissions)
    private readonly repository: Repository<FinancialPermissions>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPermissionsDto, organizationId: string): Promise<FinancialPermissions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
