import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorDocuments } from './entities/professor_documents.entity';
import { ProfessorDocumentsController } from './controllers/professor_documents.controller';
import { FindProfessorDocumentsService } from './services/find-professor_documents.service';
import { CreateProfessorDocumentsService } from './services/create-professor_documents.service';
import { UpdateProfessorDocumentsService } from './services/update-professor_documents.service';
import { DeleteProfessorDocumentsService } from './services/delete-professor_documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorDocuments])],
  controllers: [ProfessorDocumentsController],
  providers: [
    FindProfessorDocumentsService,
    CreateProfessorDocumentsService,
    UpdateProfessorDocumentsService,
    DeleteProfessorDocumentsService,
  ],
  exports: [FindProfessorDocumentsService],
})
export class ProfessorDocumentsModule {}
