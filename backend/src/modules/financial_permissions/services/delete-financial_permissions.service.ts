import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissions } from '../entities/financial_permissions.entity';

@Injectable()
export class DeleteFinancialPermissionsService {
  constructor(
    @InjectRepository(FinancialPermissions)
    private readonly repository: Repository<FinancialPermissions>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
