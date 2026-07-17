import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialClosureAudit } from '../entities/financial_closure_audit.entity';

@Injectable()
export class DeleteFinancialClosureAuditService {
  constructor(
    @InjectRepository(FinancialClosureAudit)
    private readonly repository: Repository<FinancialClosureAudit>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
