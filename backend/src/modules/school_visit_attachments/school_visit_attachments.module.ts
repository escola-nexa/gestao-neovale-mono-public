import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisitAttachments } from './entities/school_visit_attachments.entity';
import { SchoolVisitAttachmentsController } from './controllers/school_visit_attachments.controller';
import { FindSchoolVisitAttachmentsService } from './services/find-school_visit_attachments.service';
import { CreateSchoolVisitAttachmentsService } from './services/create-school_visit_attachments.service';
import { UpdateSchoolVisitAttachmentsService } from './services/update-school_visit_attachments.service';
import { DeleteSchoolVisitAttachmentsService } from './services/delete-school_visit_attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisitAttachments])],
  controllers: [SchoolVisitAttachmentsController],
  providers: [
    FindSchoolVisitAttachmentsService,
    CreateSchoolVisitAttachmentsService,
    UpdateSchoolVisitAttachmentsService,
    DeleteSchoolVisitAttachmentsService,
  ],
  exports: [FindSchoolVisitAttachmentsService],
})
export class SchoolVisitAttachmentsModule {}
