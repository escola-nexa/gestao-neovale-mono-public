import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialDocumentTypes } from './entities/financial_document_types.entity';
import { FinancialDocumentTypesController } from './controllers/financial_document_types.controller';
import { FindFinancialDocumentTypesService } from './services/find-financial_document_types.service';
import { CreateFinancialDocumentTypesService } from './services/create-financial_document_types.service';
import { UpdateFinancialDocumentTypesService } from './services/update-financial_document_types.service';
import { DeleteFinancialDocumentTypesService } from './services/delete-financial_document_types.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialDocumentTypes])],
  controllers: [FinancialDocumentTypesController],
  providers: [
    FindFinancialDocumentTypesService,
    CreateFinancialDocumentTypesService,
    UpdateFinancialDocumentTypesService,
    DeleteFinancialDocumentTypesService,
  ],
  exports: [FindFinancialDocumentTypesService],
})
export class FinancialDocumentTypesModule {}
