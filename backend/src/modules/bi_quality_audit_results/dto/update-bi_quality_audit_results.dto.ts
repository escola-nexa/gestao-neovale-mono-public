import { PartialType } from '@nestjs/mapped-types';
import { CreateBiQualityAuditResultsDto } from './create-bi_quality_audit_results.dto';

export class UpdateBiQualityAuditResultsDto extends PartialType(CreateBiQualityAuditResultsDto) {}
