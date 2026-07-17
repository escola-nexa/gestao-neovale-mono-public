import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiQualityAuditResults } from '../entities/bi_quality_audit_results.entity';
import { CreateBiQualityAuditResultsDto } from '../dto/create-bi_quality_audit_results.dto';

@Injectable()
export class CreateBiQualityAuditResultsService {
  constructor(
    @InjectRepository(BiQualityAuditResults)
    private readonly repository: Repository<BiQualityAuditResults>,
  ) {}

  async execute(dto: CreateBiQualityAuditResultsDto, organizationId: string): Promise<BiQualityAuditResults> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
