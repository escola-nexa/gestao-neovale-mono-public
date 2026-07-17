import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAttachments } from '../entities/financial_attachments.entity';
import { CreateFinancialAttachmentsDto } from '../dto/create-financial_attachments.dto';

@Injectable()
export class CreateFinancialAttachmentsService {
  constructor(
    @InjectRepository(FinancialAttachments)
    private readonly repository: Repository<FinancialAttachments>,
  ) {}

  async execute(dto: CreateFinancialAttachmentsDto, organizationId: string): Promise<FinancialAttachments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
