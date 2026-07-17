import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiQualityAuditResults } from '../entities/bi_quality_audit_results.entity';

@Injectable()
export class DeleteBiQualityAuditResultsService {
  constructor(
    @InjectRepository(BiQualityAuditResults)
    private readonly repository: Repository<BiQualityAuditResults>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
