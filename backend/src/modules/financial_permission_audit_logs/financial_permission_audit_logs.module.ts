import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPermissionAuditLogs } from './entities/financial_permission_audit_logs.entity';
import { FinancialPermissionAuditLogsController } from './controllers/financial_permission_audit_logs.controller';
import { FindFinancialPermissionAuditLogsService } from './services/find-financial_permission_audit_logs.service';
import { CreateFinancialPermissionAuditLogsService } from './services/create-financial_permission_audit_logs.service';
import { UpdateFinancialPermissionAuditLogsService } from './services/update-financial_permission_audit_logs.service';
import { DeleteFinancialPermissionAuditLogsService } from './services/delete-financial_permission_audit_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPermissionAuditLogs])],
  controllers: [FinancialPermissionAuditLogsController],
  providers: [
    FindFinancialPermissionAuditLogsService,
    CreateFinancialPermissionAuditLogsService,
    UpdateFinancialPermissionAuditLogsService,
    DeleteFinancialPermissionAuditLogsService,
  ],
  exports: [FindFinancialPermissionAuditLogsService],
})
export class FinancialPermissionAuditLogsModule {}
