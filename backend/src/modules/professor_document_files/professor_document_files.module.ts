import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorDocumentFiles } from './entities/professor_document_files.entity';
import { ProfessorDocumentFilesController } from './controllers/professor_document_files.controller';
import { FindProfessorDocumentFilesService } from './services/find-professor_document_files.service';
import { CreateProfessorDocumentFilesService } from './services/create-professor_document_files.service';
import { UpdateProfessorDocumentFilesService } from './services/update-professor_document_files.service';
import { DeleteProfessorDocumentFilesService } from './services/delete-professor_document_files.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorDocumentFiles])],
  controllers: [ProfessorDocumentFilesController],
  providers: [
    FindProfessorDocumentFilesService,
    CreateProfessorDocumentFilesService,
    UpdateProfessorDocumentFilesService,
    DeleteProfessorDocumentFilesService,
  ],
  exports: [FindProfessorDocumentFilesService],
})
export class ProfessorDocumentFilesModule {}
