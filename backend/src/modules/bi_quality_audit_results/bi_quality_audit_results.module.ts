import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiQualityAuditResults } from './entities/bi_quality_audit_results.entity';
import { BiQualityAuditResultsController } from './controllers/bi_quality_audit_results.controller';
import { FindBiQualityAuditResultsService } from './services/find-bi_quality_audit_results.service';
import { CreateBiQualityAuditResultsService } from './services/create-bi_quality_audit_results.service';
import { UpdateBiQualityAuditResultsService } from './services/update-bi_quality_audit_results.service';
import { DeleteBiQualityAuditResultsService } from './services/delete-bi_quality_audit_results.service';

@Module({
  imports: [TypeOrmModule.forFeature([BiQualityAuditResults])],
  controllers: [BiQualityAuditResultsController],
  providers: [
    FindBiQualityAuditResultsService,
    CreateBiQualityAuditResultsService,
    UpdateBiQualityAuditResultsService,
    DeleteBiQualityAuditResultsService,
  ],
  exports: [FindBiQualityAuditResultsService],
})
export class BiQualityAuditResultsModule {}
