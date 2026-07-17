import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAttachments } from '../entities/financial_attachments.entity';

@Injectable()
export class FindFinancialAttachmentsService {
  constructor(
    @InjectRepository(FinancialAttachments)
    private readonly repository: Repository<FinancialAttachments>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialAttachments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialAttachments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
