import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialSettingsAudit } from './entities/financial_settings_audit.entity';
import { FinancialSettingsAuditController } from './controllers/financial_settings_audit.controller';
import { FindFinancialSettingsAuditService } from './services/find-financial_settings_audit.service';
import { CreateFinancialSettingsAuditService } from './services/create-financial_settings_audit.service';
import { UpdateFinancialSettingsAuditService } from './services/update-financial_settings_audit.service';
import { DeleteFinancialSettingsAuditService } from './services/delete-financial_settings_audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialSettingsAudit])],
  controllers: [FinancialSettingsAuditController],
  providers: [
    FindFinancialSettingsAuditService,
    CreateFinancialSettingsAuditService,
    UpdateFinancialSettingsAuditService,
    DeleteFinancialSettingsAuditService,
  ],
  exports: [FindFinancialSettingsAuditService],
})
export class FinancialSettingsAuditModule {}
