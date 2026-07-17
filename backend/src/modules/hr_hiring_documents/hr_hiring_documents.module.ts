import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrHiringDocuments } from './entities/hr_hiring_documents.entity';
import { HrHiringDocumentsController } from './controllers/hr_hiring_documents.controller';
import { FindHrHiringDocumentsService } from './services/find-hr_hiring_documents.service';
import { CreateHrHiringDocumentsService } from './services/create-hr_hiring_documents.service';
import { UpdateHrHiringDocumentsService } from './services/update-hr_hiring_documents.service';
import { DeleteHrHiringDocumentsService } from './services/delete-hr_hiring_documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrHiringDocuments])],
  controllers: [HrHiringDocumentsController],
  providers: [
    FindHrHiringDocumentsService,
    CreateHrHiringDocumentsService,
    UpdateHrHiringDocumentsService,
    DeleteHrHiringDocumentsService,
  ],
  exports: [FindHrHiringDocumentsService],
})
export class HrHiringDocumentsModule {}
