import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrHiringAuditLogs } from './entities/hr_hiring_audit_logs.entity';
import { HrHiringAuditLogsController } from './controllers/hr_hiring_audit_logs.controller';
import { FindHrHiringAuditLogsService } from './services/find-hr_hiring_audit_logs.service';
import { CreateHrHiringAuditLogsService } from './services/create-hr_hiring_audit_logs.service';
import { UpdateHrHiringAuditLogsService } from './services/update-hr_hiring_audit_logs.service';
import { DeleteHrHiringAuditLogsService } from './services/delete-hr_hiring_audit_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrHiringAuditLogs])],
  controllers: [HrHiringAuditLogsController],
  providers: [
    FindHrHiringAuditLogsService,
    CreateHrHiringAuditLogsService,
    UpdateHrHiringAuditLogsService,
    DeleteHrHiringAuditLogsService,
  ],
  exports: [FindHrHiringAuditLogsService],
})
export class HrHiringAuditLogsModule {}
