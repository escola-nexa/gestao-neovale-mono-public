import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAttachments } from '../entities/financial_attachments.entity';

@Injectable()
export class DeleteFinancialAttachmentsService {
  constructor(
    @InjectRepository(FinancialAttachments)
    private readonly repository: Repository<FinancialAttachments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
