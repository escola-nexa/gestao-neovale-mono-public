import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningAuditLog } from './entities/planning_audit_log.entity';
import { PlanningAuditLogController } from './controllers/planning_audit_log.controller';
import { FindPlanningAuditLogService } from './services/find-planning_audit_log.service';
import { CreatePlanningAuditLogService } from './services/create-planning_audit_log.service';
import { UpdatePlanningAuditLogService } from './services/update-planning_audit_log.service';
import { DeletePlanningAuditLogService } from './services/delete-planning_audit_log.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanningAuditLog])],
  controllers: [PlanningAuditLogController],
  providers: [
    FindPlanningAuditLogService,
    CreatePlanningAuditLogService,
    UpdatePlanningAuditLogService,
    DeletePlanningAuditLogService,
  ],
  exports: [FindPlanningAuditLogService],
})
export class PlanningAuditLogModule {}
