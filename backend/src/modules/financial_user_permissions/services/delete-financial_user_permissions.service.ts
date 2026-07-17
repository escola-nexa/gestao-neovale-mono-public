import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserPermissions } from '../entities/financial_user_permissions.entity';

@Injectable()
export class DeleteFinancialUserPermissionsService {
  constructor(
    @InjectRepository(FinancialUserPermissions)
    private readonly repository: Repository<FinancialUserPermissions>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
