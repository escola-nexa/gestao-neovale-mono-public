import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserPermissions } from '../entities/financial_user_permissions.entity';
import { UpdateFinancialUserPermissionsDto } from '../dto/update-financial_user_permissions.dto';

@Injectable()
export class UpdateFinancialUserPermissionsService {
  constructor(
    @InjectRepository(FinancialUserPermissions)
    private readonly repository: Repository<FinancialUserPermissions>,
  ) {}

  async execute(id: string, dto: UpdateFinancialUserPermissionsDto, organizationId: string): Promise<FinancialUserPermissions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
