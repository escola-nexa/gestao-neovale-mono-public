import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiQualityAuditResults } from '../entities/bi_quality_audit_results.entity';

@Injectable()
export class FindBiQualityAuditResultsService {
  constructor(
    @InjectRepository(BiQualityAuditResults)
    private readonly repository: Repository<BiQualityAuditResults>,
  ) {}

  async findAll(organizationId: string): Promise<BiQualityAuditResults[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BiQualityAuditResults | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
