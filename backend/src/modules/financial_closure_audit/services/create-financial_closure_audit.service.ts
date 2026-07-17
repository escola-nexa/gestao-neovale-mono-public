import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialClosureAudit } from '../entities/financial_closure_audit.entity';
import { CreateFinancialClosureAuditDto } from '../dto/create-financial_closure_audit.dto';

@Injectable()
export class CreateFinancialClosureAuditService {
  constructor(
    @InjectRepository(FinancialClosureAudit)
    private readonly repository: Repository<FinancialClosureAudit>,
  ) {}

  async execute(dto: CreateFinancialClosureAuditDto, organizationId: string): Promise<FinancialClosureAudit> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
