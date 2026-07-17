import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionDocuments } from './entities/teacher_substitution_documents.entity';
import { TeacherSubstitutionDocumentsController } from './controllers/teacher_substitution_documents.controller';
import { FindTeacherSubstitutionDocumentsService } from './services/find-teacher_substitution_documents.service';
import { CreateTeacherSubstitutionDocumentsService } from './services/create-teacher_substitution_documents.service';
import { UpdateTeacherSubstitutionDocumentsService } from './services/update-teacher_substitution_documents.service';
import { DeleteTeacherSubstitutionDocumentsService } from './services/delete-teacher_substitution_documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionDocuments])],
  controllers: [TeacherSubstitutionDocumentsController],
  providers: [
    FindTeacherSubstitutionDocumentsService,
    CreateTeacherSubstitutionDocumentsService,
    UpdateTeacherSubstitutionDocumentsService,
    DeleteTeacherSubstitutionDocumentsService,
  ],
  exports: [FindTeacherSubstitutionDocumentsService],
})
export class TeacherSubstitutionDocumentsModule {}
