import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvents } from './entities/audit_events.entity';
import { AuditEventsController } from './controllers/audit_events.controller';
import { FindAuditEventsService } from './services/find-audit_events.service';
import { CreateAuditEventsService } from './services/create-audit_events.service';
import { UpdateAuditEventsService } from './services/update-audit_events.service';
import { DeleteAuditEventsService } from './services/delete-audit_events.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvents])],
  controllers: [AuditEventsController],
  providers: [
    FindAuditEventsService,
    CreateAuditEventsService,
    UpdateAuditEventsService,
    DeleteAuditEventsService,
  ],
  exports: [FindAuditEventsService],
})
export class AuditEventsModule {}
