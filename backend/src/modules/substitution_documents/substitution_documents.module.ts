import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstitutionDocuments } from './entities/substitution_documents.entity';
import { SubstitutionDocumentsController } from './controllers/substitution_documents.controller';
import { FindSubstitutionDocumentsService } from './services/find-substitution_documents.service';
import { CreateSubstitutionDocumentsService } from './services/create-substitution_documents.service';
import { UpdateSubstitutionDocumentsService } from './services/update-substitution_documents.service';
import { DeleteSubstitutionDocumentsService } from './services/delete-substitution_documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubstitutionDocuments])],
  controllers: [SubstitutionDocumentsController],
  providers: [
    FindSubstitutionDocumentsService,
    CreateSubstitutionDocumentsService,
    UpdateSubstitutionDocumentsService,
    DeleteSubstitutionDocumentsService,
  ],
  exports: [FindSubstitutionDocumentsService],
})
export class SubstitutionDocumentsModule {}
