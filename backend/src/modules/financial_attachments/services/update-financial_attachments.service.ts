import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAttachments } from '../entities/financial_attachments.entity';
import { UpdateFinancialAttachmentsDto } from '../dto/update-financial_attachments.dto';

@Injectable()
export class UpdateFinancialAttachmentsService {
  constructor(
    @InjectRepository(FinancialAttachments)
    private readonly repository: Repository<FinancialAttachments>,
  ) {}

  async execute(id: string, dto: UpdateFinancialAttachmentsDto, organizationId: string): Promise<FinancialAttachments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
