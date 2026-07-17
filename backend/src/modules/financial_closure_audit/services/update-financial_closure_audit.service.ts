import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialClosureAudit } from '../entities/financial_closure_audit.entity';
import { UpdateFinancialClosureAuditDto } from '../dto/update-financial_closure_audit.dto';

@Injectable()
export class UpdateFinancialClosureAuditService {
  constructor(
    @InjectRepository(FinancialClosureAudit)
    private readonly repository: Repository<FinancialClosureAudit>,
  ) {}

  async execute(id: string, dto: UpdateFinancialClosureAuditDto, organizationId: string): Promise<FinancialClosureAudit> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
